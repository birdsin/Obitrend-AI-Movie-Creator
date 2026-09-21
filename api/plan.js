const OPENAI_URL="https://api.openai.com/v1/responses";
const schema={type:"object",additionalProperties:false,properties:{title:{type:"string"},logline:{type:"string"},genre:{type:"string"},visualBible:{type:"object",additionalProperties:false,properties:{world:{type:"string"},colorGrade:{type:"string"},lighting:{type:"string"},realism:{type:"string"},continuity:{type:"string"}},required:["world","colorGrade","lighting","realism","continuity"]},characters:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},role:{type:"string"},appearance:{type:"string"},wardrobe:{type:"string"},personality:{type:"string"}},required:["name","role","appearance","wardrobe","personality"]}},scenes:{type:"array",items:{type:"object",additionalProperties:false,properties:{heading:{type:"string"},purpose:{type:"string"},location:{type:"string"},time:{type:"string"},duration:{type:"string"},dialogue:{type:"string"},shots:{type:"array",items:{type:"object",additionalProperties:false,properties:{camera:{type:"string"},lens:{type:"string"},framing:{type:"string"},angle:{type:"string"},movement:{type:"string"},focus:{type:"string"},lighting:{type:"string"},sound:{type:"string"},continuity:{type:"string"}},required:["camera","lens","framing","angle","movement","focus","lighting","sound","continuity"]}}},required:["heading","purpose","location","time","duration","dialogue","shots"]}},required:["title","logline","genre","visualBible","characters","scenes"]};

function send(res,status,obj){res.status(status).setHeader("content-type","application/json");res.end(JSON.stringify(obj));}

async function callOpenAI(body,key){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),50000);
 try{
  const r=await fetch(OPENAI_URL,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+key},body:JSON.stringify(body),signal:controller.signal});
  const text=await r.text();
  let d={}; try{d=JSON.parse(text)}catch{}
  return {ok:r.ok,status:r.status,data:d,raw:text};
 }finally{clearTimeout(timer)}
}

module.exports=async(req,res)=>{
 if(req.method!=="POST")return send(res,405,{error:"Method not allowed."});
 const key=process.env.OPENAI_API_KEY;
 if(!key)return send(res,500,{error:"Movie AI is not configured yet. Add OPENAI_API_KEY in the Vercel project settings."});
 try{
  const x=req.body||{},prompt=typeof x.prompt==="string"?x.prompt.trim():"",length=Number(x.length||15),genre=x.genre||"Drama",style=x.visualStyle||"Cinematic realism",ratio=x.ratio||"16:9";
  if(!prompt)return send(res,400,{error:"Movie idea is required."});
  const count=length<=5?4:length<=15?8:12;
  const input=["Create a production-ready AI movie blueprint.","Story idea: "+prompt,"Genre: "+genre,"Visual style: "+style,"Aspect ratio: "+ratio,"Target length: "+length+" minutes.","Create exactly "+count+" scenes.","Each scene must contain exactly 2 practical, filmable shots.","Keep character appearance, wardrobe, locations and visual continuity consistent.","Keep dialogue concise.","Keep camera directions short and specific.","Return only the structured JSON object.","Do not reproduce existing copyrighted films or characters."].join("\n");
  const base={model:process.env.OPENAI_MOVIE_MODEL||"gpt-5.6-luna",reasoning:{effort:"none"},max_output_tokens:10000,input,text:{format:{type:"json_schema",name:"movie_blueprint",strict:true,schema}}};
  let result=await callOpenAI(base,key);
  if(!result.ok){
   console.error("Movie planner API error",result.status,result.raw.slice(0,1000));
   return send(res,502,{error:"Movie planning service is temporarily unavailable. Please try again."});
  }
  let raw=result.data.output_text||((result.data.output||[]).map(item=>(item.content||[]).map(c=>c.text||"").join("")).join(""));
  if(!raw||raw.trim().charAt(0)!=="{"){
   console.error("Movie planner returned non-JSON",raw&&raw.slice(0,500));
   const retry={...base,reasoning:{effort:"none"},input:input+"\nKeep the response compact and valid JSON."};
   result=await callOpenAI(retry,key);
   if(!result.ok)return send(res,502,{error:"Movie planning service is temporarily unavailable. Please try again."});
   raw=result.data.output_text||((result.data.output||[]).map(item=>(item.content||[]).map(c=>c.text||"").join("")).join(""));
  }
  if(!raw||raw.trim().charAt(0)!=="{")return send(res,502,{error:"The movie planning service returned an invalid response. Please try again."});
  let blueprint;
  try{blueprint=JSON.parse(raw)}catch(e){console.error("Movie blueprint JSON parse failed",raw.slice(0,500));return send(res,502,{error:"The movie planning service returned an invalid response. Please try again."})}
  return send(res,200,{blueprint});
 }catch(e){
  console.error("Movie blueprint error",e);
  if(e&&e.name==="AbortError")return send(res,504,{error:"Movie blueprint generation took too long. Please try again."});
  return send(res,500,{error:"Could not build the movie blueprint. Please try again."});
 }
};