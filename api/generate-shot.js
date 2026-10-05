// Preview test: 30-second shot support is enabled only on paystack-test-mode.
function json(res,status,obj){res.status(status).setHeader("content-type","application/json");res.end(JSON.stringify(obj))}

const KLING_BASE=(process.env.KLING_API_BASE_URL||"https://api-singapore.klingai.com").replace(/\/$/,"");
const KLING_MODEL=process.env.KLING_MODEL_NAME||"kling-v3";
const KLING_MAX_DURATION=Math.max(3,Math.min(30,Number(process.env.KLING_MAX_DURATION)||15));
const MOVIE_VIDEO_PROVIDER=String(process.env.MOVIE_VIDEO_PROVIDER||((process.env.VERCEL_GIT_COMMIT_REF==="flixly-movie-structure-preview")?"flixly":"kling")).trim().toLowerCase();
const flixly=require("./flixly-provider");

function klingRatio(r){
  if(r==="9:16")return "9:16";
  if(r==="1:1")return "1:1";
  return "16:9";
}

function klingEndpoint(image){
  return image?"/v1/videos/image2video":"/v1/videos/text2video";
}

function klingTaskEndpoint(kind,id){
  return kind==="image"
    ?"/v1/videos/image2video/"+encodeURIComponent(id)
    :"/v1/videos/text2video/"+encodeURIComponent(id);
}

async function klingRequest(path,options){
  return fetch(KLING_BASE+path,{
    ...options,
    headers:{
      "content-type":"application/json",
      "Authorization":"Bearer "+process.env.KLING_API_KEY,
      ...(options&&options.headers||{})
    }
  });
}

async function releaseReservation(supabaseUrl,publishable,auth,reservation){
  try{
    await fetch(supabaseUrl+"/functions/v1/movie-credit",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "apikey":publishable,
        "Authorization":auth
      },
      body:JSON.stringify({action:"release",token:String(reservation)})
    });
  }catch(_){}
}

module.exports=async(req,res)=>{
  const auth=req.headers.authorization||"";
  const body=req.body&&typeof req.body==="object"?req.body:{};
  const reservation=String(req.headers["x-movie-reservation"]||body.reservationToken||body.reservation_token||"").trim();
  if(!auth.startsWith("Bearer ")||!reservation){
    return json(res,401,{error:"Secure Movie Creator authentication and a valid credit reservation are required."});
  }
  const supabaseUrl=process.env.SUPABASE_URL;
  const publishable=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!supabaseUrl||!publishable){
    return json(res,500,{error:"Secure Movie Creator authorization is not configured."});
  }
  try{
    const gate=await fetch(supabaseUrl+"/functions/v1/movie-credit",{method:"POST",headers:{"content-type":"application/json","apikey":publishable,"Authorization":auth},body:JSON.stringify({action:"validate",token:String(reservation)})});
    const gd=await gate.json().catch(()=>({}));
    if(!gate.ok||!gd.valid) return json(res,402,{error:"Your movie credit reservation is invalid or expired. Please start generation again."});
  }catch(e){
    return json(res,503,{error:"Secure credit authorization is temporarily unavailable. Please try again."});
  }
  if(req.method==="GET"){
    const rawId=String(req.query&&req.query.taskId||"");
    if(!rawId)return json(res,400,{error:"taskId is required."});
    const cancel=String(req.query&&req.query.cancel||"") === "1";

    if(rawId.startsWith("flixly:")){
      const id=rawId.slice("flixly:".length);
      if(!id)return json(res,400,{error:"Invalid Flixly task id."});
      try{
        if(cancel){
          // Flixly documents generation status but this adapter does not assume
          // a cancellation endpoint that is not part of the public contract.
          return json(res,200,{status:"CANCELED",videoUrl:null,providerCancellationUnsupported:true});
        }
        const d=await flixly.status(id);
        if(d.status==="FAILED")await releaseReservation(supabaseUrl,publishable,auth,reservation);
        return json(res,200,{status:d.status,videoUrl:d.videoUrl||null,error:d.error||null,reservationReleased:d.status==="FAILED"});
      }catch(e){
        return json(res,502,{error:e?.message||"Could not check Flixly video status. Please try again."});
      }
    }

    const match=/^kling:(text|image):(.+)$/.exec(rawId);
    if(!match)return json(res,400,{error:"Invalid video task id."});
    const kind=match[1],id=match[2];

    try{
      if(cancel){
        await releaseReservation(supabaseUrl,publishable,auth,reservation);
        return json(res,200,{status:"CANCELED",videoUrl:null,reservationReleased:true,providerCancellationUnsupported:true});
      }

      const r=await klingRequest(klingTaskEndpoint(kind,id),{method:"GET"});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)return json(res,502,{error:"Kling video status is temporarily unavailable. Please try again."});

      const data=d.data||{};
      const providerStatus=String(data.task_status||"").toLowerCase();
      const videos=Array.isArray(data.task_result?.videos)?data.task_result.videos:[];
      const videoUrl=videos[0]?.url||videos[0]?.watermark_url||null;
      const failed=providerStatus==="failed";
      const succeeded=providerStatus==="succeed"&&Boolean(videoUrl);

      if(failed)await releaseReservation(supabaseUrl,publishable,auth,reservation);

      return json(res,200,{
        status:succeeded?"SUCCEEDED":failed?"FAILED":providerStatus.toUpperCase()||"PROCESSING",
        videoUrl,
        error:failed?(data.task_status_msg||d.message||"Kling could not generate this shot."):null,
        reservationReleased:failed
      });
    }catch(e){
      return json(res,500,{error:"Could not check Kling video status. Please try again."});
    }
  }
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed."});

  // Flixly is selected only in Preview through MOVIE_VIDEO_PROVIDER=flixly.
  // The existing Kling path remains untouched for production/main.
  if(MOVIE_VIDEO_PROVIDER==="flixly"){
    try{
      const x=body;
      const b=x.blueprint;
      const si=Number(x.sceneIndex);
      const hi=Number(x.shotIndex);
      const ratio=x.ratio||"16:9";
      const duration=Math.max(4,Math.min(flixly.MAX_DURATION,Math.round(Number(x.duration)||15)));
      const scene=b&&b.scenes&&b.scenes[si];
      const shot=scene&&scene.shots&&scene.shots[hi];
      if(!scene||!shot)return json(res,400,{error:"Invalid scene or shot."});
      const chars=(b.characters||[]).map(c=>c.name+": "+c.appearance+"; wardrobe: "+c.wardrobe).join("\n");
      const vb=b.visualBible||{};
      const previous=String(x.continuationVideoUrl||"").trim();
      const prompt=[
        "Cinematic AI movie shot for OBITREND.",
        "Title: "+(b.title||"Untitled Movie")+".",
        "World: "+(vb.world||"realistic cinematic world")+".",
        "Color grade: "+(vb.colorGrade||"natural cinematic color")+".",
        "Realism: "+(vb.realism||"photorealistic live-action cinema")+".",
        "Character continuity: keep faces, wardrobe, props and identities consistent.",
        "Characters:\n"+chars,
        "Scene: "+(scene.heading||"")+" . Location: "+(scene.location||"")+" . Time: "+(scene.time||"")+" .",
        "Purpose: "+(scene.purpose||"")+" . Dialogue/action: "+(scene.dialogue||"natural believable action")+".",
        "Shot: camera "+(shot.camera||"professional cinema camera")+"; lens "+(shot.lens||"50mm")+"; framing "+(shot.framing||"cinematic medium shot")+"; angle "+(shot.angle||"eye-level")+"; movement "+(shot.movement||"natural controlled movement")+"; focus "+(shot.focus||"main character")+"; lighting "+(shot.lighting||"natural cinematic lighting")+"; sound "+(shot.sound||"natural location ambience")+"; continuity "+(shot.continuity||"maintain story continuity")+".",
        previous?"This is a continuation shot. Continue directly from the previous shot without changing the established characters, wardrobe, location, lighting or action geography.":"This is the opening shot. Establish the characters, location and visual world clearly.",
        "Natural human motion, physically plausible camera movement, cinematic composition, professional live-action film quality.",
        "Aspect ratio "+ratio+". Duration "+duration+" seconds."
      ].join(" ");
      const result=await flixly.generate({prompt,duration,ratio,sound:true});
      if(result.videoUrl){
        return json(res,200,{taskId:null,videoUrl:result.videoUrl,provider:"flixly"});
      }
      return json(res,200,{taskId:"flixly:"+result.id,videoUrl:null,provider:"flixly"});
    }catch(e){
      console.error("Flixly start failed:",e?.message||e);
      await releaseReservation(supabaseUrl,publishable,auth,reservation);
      const code=String(e?.providerCode||"");
      const insufficient=code==="insufficient_credits"||/credit|balance|quota/i.test(String(e?.message||""));
      return json(res,502,{error:insufficient?"Flixly could not start this shot because its provider credit balance is unavailable. Your OBITREND movie credit was restored. Please try again later.":"Flixly could not start this shot. Your OBITREND movie credit was restored. Please try again.",reservationReleased:true,provider:"flixly"});
    }
  }

  if(process.env.KLING_GENERATION_ENABLED==="false"){
    await releaseReservation(supabaseUrl,publishable,auth,reservation);
    return json(res,503,{error:"Movie generation is temporarily paused while the Kling provider API credits are replenished. Your OBITREND movie credit was restored. Please try again later.",reservationReleased:true});
  }
  if(!process.env.KLING_API_KEY){
    await releaseReservation(supabaseUrl,publishable,auth,reservation);
    return json(res,500,{error:"Kling video generation is not configured yet. Add KLING_API_KEY in Vercel before enabling movie generation.",reservationReleased:true});
  }

  try{
    const x=body;
    const b=x.blueprint;
    const si=Number(x.sceneIndex);
    const hi=Number(x.shotIndex);
    const ratio=x.ratio||"16:9";
    const duration=Math.max(3,Math.min(KLING_MAX_DURATION,Math.round(Number(x.duration)||15)));
    const imageDataUri=typeof x.imageDataUri==="string"?x.imageDataUri.trim():"";
    const scene=b&&b.scenes&&b.scenes[si];
    const shot=scene&&scene.shots&&scene.shots[hi];

    if(!scene||!shot)return json(res,400,{error:"Invalid scene or shot."});

    const chars=(b.characters||[])
      .map(c=>c.name+": "+c.appearance+"; wardrobe: "+c.wardrobe)
      .join("\n");

    const vb=b.visualBible||{};
    const prompt=[
      "Cinematic AI movie shot.",
      "Title: "+(b.title||"Untitled Movie")+".",
      "World: "+(vb.world||"realistic cinematic world")+".",
      "Color grade: "+(vb.colorGrade||"natural cinematic color")+".",
      "Lighting: "+(vb.lighting||shot.lighting||"professional cinematic lighting")+".",
      "Realism: "+(vb.realism||"photorealistic live-action cinema")+".",
      "Character continuity: "+(vb.continuity||"keep faces, clothing and identities consistent across shots")+".",
      "Characters:\n"+chars,
      "Scene: "+(scene.heading||"")+" .",
      "Location: "+(scene.location||"")+" .",
      "Time: "+(scene.time||"")+" .",
      "Purpose: "+(scene.purpose||"")+" .",
      "Dialogue/action: "+(scene.dialogue||"natural believable action")+".",
      "Shot: camera "+(shot.camera||"professional cinema camera")+
        "; lens "+(shot.lens||"50mm")+
        "; framing "+(shot.framing||"cinematic medium shot")+
        "; angle "+(shot.angle||"eye-level")+
        "; movement "+(shot.movement||"natural controlled movement")+
        "; focus "+(shot.focus||"main character")+
        "; lighting "+(shot.lighting||"natural cinematic lighting")+
        "; sound "+(shot.sound||"natural location ambience")+
        "; continuity "+(shot.continuity||"maintain story continuity")+".",
      "Preserve consistent faces, wardrobe, props, geography and lighting.",
      "Natural human motion, physically plausible camera movement, cinematic composition, professional live-action film quality.",
      "Aspect ratio "+ratio+"."
    ].join(" ");

    const safePrompt=prompt.length>1000?prompt.slice(0,997)+"...":prompt;
    if(imageDataUri){
      const validImage=/^data:image\/(?:jpe?g|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(imageDataUri);
      if(!validImage){
        try{await fetch(supabaseUrl+"/functions/v1/movie-credit",{method:"POST",headers:{"content-type":"application/json","apikey":publishable,"Authorization":auth},body:JSON.stringify({action:"release",token:String(reservation)})})}catch(_){}
        return json(res,400,{error:"The selected image is invalid. Please choose a JPG, PNG or WebP image and try again.",reservationReleased:true});
      }
      if(imageDataUri.length>5*1024*1024){
        try{await fetch(supabaseUrl+"/functions/v1/movie-credit",{method:"POST",headers:{"content-type":"application/json","apikey":publishable,"Authorization":auth},body:JSON.stringify({action:"release",token:String(reservation)})})}catch(_){}
        return json(res,413,{error:"The selected image is too large for movie generation. Please choose a smaller image and try again.",reservationReleased:true});
      }
    }

    const requestedDuration=Math.max(3,Math.min(KLING_MAX_DURATION,Math.round(Number(x.duration)||15)));
    if(requestedDuration>KLING_MAX_DURATION){
      await releaseReservation(supabaseUrl,publishable,auth,reservation);
      return json(res,400,{
        error:"This Kling model supports up to "+KLING_MAX_DURATION+" seconds per generated shot. Choose a shorter movie segment or configure a Kling model with a higher duration limit.",
        reservationReleased:true
      });
    }

    const klingBody={
      model_name:KLING_MODEL,
      prompt:safePrompt,
      negative_prompt:"low quality, distorted anatomy, duplicate people, warped faces, broken hands, flicker, jitter, text artifacts",
      duration:String(requestedDuration),
      mode:process.env.KLING_MODE||"pro",
      sound:process.env.KLING_SOUND==="off"?"off":"on",
      aspect_ratio:klingRatio(ratio)
    };

    if(imageDataUri)klingBody.image=imageDataUri.replace(/^data:image\/[^;]+;base64,/i,"");

    const endpoint=klingEndpoint(Boolean(imageDataUri));
    const r=await klingRequest(endpoint,{method:"POST",body:JSON.stringify(klingBody)});
    const d=await r.json().catch(()=>({}));

    if(!r.ok){
      console.error("Kling start failed:",r.status,JSON.stringify(d));
      await releaseReservation(supabaseUrl,publishable,auth,reservation);
      const providerMessage=String(d?.message||d?.error||"");
      const insufficient=/credit|balance|quota|resource/i.test(providerMessage);
      return json(res,502,{
        error:insufficient
          ?"Kling could not start this shot because the Kling API resource balance is unavailable. Your OBITREND movie credit was restored. Please try again later."
          :"Kling could not start this shot. Your OBITREND movie credit was restored. Please try again.",
        reservationReleased:true
      });
    }

    const taskId=d?.data?.task_id||d?.task_id;
    if(!taskId){
      try{
        await fetch(supabaseUrl+"/functions/v1/movie-credit",{
          method:"POST",
          headers:{
            "content-type":"application/json",
            "apikey":publishable,
            "Authorization":auth
          },
          body:JSON.stringify({action:"release",token:String(reservation)})
        });
      }catch(_){}
      return json(res,502,{error:"The video generator did not return a task. Your credit was restored. Please try again.",reservationReleased:true});
    }

    const taskKind=imageDataUri?"image":"text";
    return json(res,200,{taskId:"kling:"+taskKind+":"+String(taskId),videoUrl:null});
  }catch(e){
    console.error("Shot generation error:",e);
    try{
      await fetch(supabaseUrl+"/functions/v1/movie-credit",{
        method:"POST",
        headers:{
          "content-type":"application/json",
          "apikey":publishable,
          "Authorization":auth
        },
        body:JSON.stringify({action:"release",token:String(reservation)})
      });
    }catch(_){}
    return json(res,500,{error:"Shot generation failed. Your OBITREND movie credit was restored. Please try again.",reservationReleased:true});
  }
};