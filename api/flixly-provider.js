// OBITREND Flixly video-provider adapter.
// The Flixly API key is server-side only. Never expose it to the browser.
//
// Flixly documents:
// POST /api/v1/generate
// GET  /api/v1/generations/{id}
// with Bearer authentication and asynchronous video tasks.
// See https://www.flixly.ai/developers
//
// This adapter intentionally keeps provider details out of the movie engine.
// The movie engine can therefore keep the same credit/reservation workflow.

const BASE="https://www.flixly.ai";
const MODEL=String(process.env.FLIXLY_VIDEO_MODEL||"seedance-2-5").trim();
const MAX_DURATION=Math.max(4,Math.min(30,Number(process.env.FLIXLY_MAX_DURATION)||30));

function ratioValue(r){
  const allowed=["auto","21:9","16:9","4:3","1:1","3:4","9:16"];
  return allowed.includes(String(r||""))?String(r):"16:9";
}

async function request(path,options={}){
  const key=String(process.env.FLIXLY_API_KEY||"").trim();
  if(!key)throw new Error("Flixly video generation is not configured yet. Add FLIXLY_API_KEY in the Preview environment.");
  return fetch(BASE+path,{
    ...options,
    headers:{
      "Authorization":"Bearer "+key,
      "Content-Type":"application/json",
      ...(options.headers||{})
    }
  });
}

async function generate({prompt,duration,ratio,sound=true}){
  const seconds=Math.max(4,Math.min(MAX_DURATION,Math.round(Number(duration)||15)));
  const body={
    model:MODEL,
    prompt:String(prompt||"").slice(0,4000),
    type:"TEXT_TO_VIDEO",
    duration:seconds,
    aspect_ratio:ratioValue(ratio)
  };
  // Seedance 2.5 supports synchronized audio. Only send the flag when explicitly
  // configured; this keeps the adapter compatible with provider-side defaults.
  if(sound===false)body.sound=false;

  const r=await request("/api/v1/generate",{method:"POST",body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){
    const providerError=d?.error?.message||d?.message||"Flixly could not start this video.";
    const e=new Error(providerError);
    e.status=r.status;
    e.providerCode=d?.error?.code||null;
    throw e;
  }
  const id=String(d?.id||d?.task_id||"").trim();
  const status=String(d?.status||"").toUpperCase();
  const outputUrl=d?.output_url||d?.video_url||null;
  if(outputUrl)return {id:null,status:"SUCCEEDED",videoUrl:outputUrl,creditsCharged:d?.credits_charged||null};
  if(!id)throw new Error("Flixly did not return a generation task.");
  return {id,status:status||"PROCESSING",videoUrl:null,creditsCharged:d?.credits_charged||null};
}

async function status(id){
  const r=await request("/api/v1/generations/"+encodeURIComponent(String(id)),{method:"GET"});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){
    const providerError=d?.error?.message||d?.message||"Flixly video status is temporarily unavailable.";
    const e=new Error(providerError);
    e.status=r.status;
    e.providerCode=d?.error?.code||null;
    throw e;
  }
  const s=String(d?.status||"").toUpperCase();
  const failed=s==="FAILED"||s==="ERROR"||s==="CANCELED";
  const succeeded=(s==="COMPLETED"||s==="SUCCEEDED")&&Boolean(d?.output_url||d?.video_url);
  return {
    status:succeeded?"SUCCEEDED":failed?"FAILED":s||"PROCESSING",
    videoUrl:d?.output_url||d?.video_url||null,
    error:d?.error?.message||d?.message||null
  };
}

module.exports={generate,status,MAX_DURATION,MODEL};
