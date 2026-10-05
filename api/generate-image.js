// OBITREND Flixly Text-to-Image API route.
// Server-side only: FLIXLY_API_KEY is never exposed to the browser.
const BASE="https://www.flixly.ai";
const DEFAULT_MODEL="gpt-image-2-5-flare";
const MODELS=new Set(["gpt-image-2-5-flare","gpt-image-2-5-sunburst"]);
const RATIOS=new Set(["1:1","3:2","2:3","16:9","9:16","4:3","3:4"]);
function key(){
  const k=String(process.env.FLIXLY_API_KEY||"").trim();
  if(!/^flx_live_[A-Za-z0-9_-]+$/.test(k)) throw new Error("Flixly image generation is not configured. Add a valid FLIXLY_API_KEY in the Preview environment.");
  return k;
}
async function flixly(path,options={}){
  return fetch(BASE+path,{...options,headers:{Authorization:"Bearer "+key(),"Content-Type":"application/json",...(options.headers||{})}});
}
function safeError(d,fallback){return d?.error?.message||d?.message||fallback;}
module.exports=async function handler(req,res){
  try{
    if(req.method==="GET"){
      const id=String(req.query?.id||"").trim();
      if(!id)return res.status(400).json({error:"Missing generation id."});
      const r=await flixly("/api/v1/generations/"+encodeURIComponent(id),{method:"GET"});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)return res.status(r.status).json({error:safeError(d,"Flixly image status is unavailable."),providerCode:d?.error?.code||null});
      const s=String(d?.status||"").toUpperCase();
      const failed=s==="FAILED"||s==="ERROR"||s==="CANCELED";
      const url=d?.output_url||d?.image_url||null;
      return res.status(200).json({status:failed?"FAILED":(url&&(s==="COMPLETED"||s==="SUCCEEDED"))?"SUCCEEDED":s||"PROCESSING",imageUrl:url,error:d?.error?.message||d?.message||null});
    }
    if(req.method!=="POST")return res.status(405).json({error:"Method not allowed."});
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    const prompt=String(body.prompt||"").trim();
    if(prompt.length<2)return res.status(400).json({error:"Enter a text prompt for the image."});
    const model=MODELS.has(String(body.model||""))?String(body.model):DEFAULT_MODEL;
    const ratio=RATIOS.has(String(body.aspect_ratio||""))?String(body.aspect_ratio):"1:1";
    const payload={model,prompt:prompt.slice(0,5000),type:"TEXT_TO_IMAGE",aspect_ratio:ratio};
    const r=await flixly("/api/v1/generate",{method:"POST",body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status).json({error:safeError(d,"Flixly could not start the image generation."),providerCode:d?.error?.code||null});
    const url=d?.output_url||d?.image_url||null;
    const id=String(d?.id||d?.task_id||"").trim();
    const status=String(d?.status||"").toUpperCase();
    if(url)return res.status(200).json({status:"SUCCEEDED",imageUrl:url,model,aspect_ratio:ratio,creditsCharged:d?.credits_charged||null});
    if(id)return res.status(202).json({status:status||"PROCESSING",id,model,aspect_ratio:ratio,creditsCharged:d?.credits_charged||null});
    return res.status(502).json({error:"Flixly did not return an image or generation task."});
  }catch(e){
    const message=e?.message||"Image generation failed.";
    return res.status(500).json({error:message});
  }
};
