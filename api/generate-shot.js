function json(res,status,obj){res.status(status).setHeader("content-type","application/json");res.end(JSON.stringify(obj))}

const BASE="https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION="2024-11-06";

function runwayRatio(r){
  if(r==="9:16")return "720:1280";
  return "1280:720";
}

async function runwayRequest(path,options){
  return fetch(BASE+path,{
    ...options,
    headers:{
      "content-type":"application/json",
      "Authorization":"Bearer "+process.env.RUNWAY_API_KEY,
      "X-Runway-Version":RUNWAY_VERSION,
      ...(options&&options.headers||{})
    }
  });
}

module.exports=async(req,res)=>{
  if(!process.env.RUNWAY_API_KEY){
    return json(res,500,{error:"Video generation is temporarily unavailable. Please try again shortly."});
  }

  if(req.method==="GET"){
    const id=req.query&&req.query.taskId;
    if(!id)return json(res,400,{error:"taskId is required."});
    try{
      const r=await runwayRequest("/tasks/"+encodeURIComponent(id),{method:"GET",headers:{}});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)return json(res,502,{error:"Video status is temporarily unavailable. Please try again."});
      const output=d.output;
      const videoUrl=Array.isArray(output)?output[0]:output&&typeof output==="object"?(output.video_url||output.url):output||d.videoUrl||null;
      return json(res,200,{status:d.status,videoUrl});
    }catch(e){
      return json(res,500,{error:"Could not check video status. Please try again."});
    }
  }

  if(req.method!=="POST")return json(res,405,{error:"Method not allowed."});

  try{
    const x=req.body||{};
    const b=x.blueprint;
    const si=Number(x.sceneIndex);
    const hi=Number(x.shotIndex);
    const ratio=x.ratio||"16:9";
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

    // Runway's current documented text-only video flow uses imageToVideo with no prompt image.
    // Gen-4.5 accepts 16:9 and 9:16 outputs; unsupported UI ratios safely fall back to landscape.
    const model=process.env.RUNWAY_MODEL||"gen4.5";
    const body={
      model,
      promptText:prompt,
      duration:5,
      ratio:runwayRatio(ratio)
    };

    const r=await runwayRequest("/image_to_video",{
      method:"POST",
      body:JSON.stringify(body)
    });
    const d=await r.json().catch(()=>({}));

    if(!r.ok){
      const providerMessage=d&&d.error?String(d.error):d&&d.message?String(d.message):"";
      console.error("Runway start failed:",r.status,providerMessage);
      return json(res,502,{error:"The video generator could not start this shot. Please try again."});
    }

    const taskId=d.id||d.task_id;
    if(!taskId)return json(res,502,{error:"The video generator did not return a task. Please try again."});

    return json(res,200,{taskId,videoUrl:Array.isArray(d.output)?d.output[0]:null});
  }catch(e){
    console.error("Shot generation error:",e);
    return json(res,500,{error:"Shot generation failed. Please try again."});
  }
};
