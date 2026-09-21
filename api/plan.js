const OPENAI_URL="https://api.openai.com/v1/responses";
const schema={type:"object",additionalProperties:false,properties:{title:{type:"string"},logline:{type:"string"},genre:{type:"string"},visualBible:{type:"object",additionalProperties:false,properties:{world:{type:"string"},colorGrade:{type:"string"},lighting:{type:"string"},realism:{type:"string"},continuity:{type:"string"}},required:["world","colorGrade","lighting","realism","continuity"]},characters:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},role:{type:"string"},appearance:{type:"string"},wardrobe:{type:"string"},personality:{type:"string"}},required:["name","role","appearance","wardrobe","personality"]}},scenes:{type:"array",items:{type:"object",additionalProperties:false,properties:{heading:{type:"string"},purpose:{type:"string"},location:{type:"string"},time:{type:"string"},duration:{type:"string"},dialogue:{type:"string"},shots:{type:"array",items:{type:"object",additionalProperties:false,properties:{camera:{type:"string"},lens:{type:"string"},framing:{type:"string"},angle:{type:"string"},movement:{type:"string"},focus:{type:"string"},lighting:{type:"string"},sound:{type:"string"},continuity:{type:"string"}},required:["camera","lens","framing","angle","movement","focus","lighting","sound","continuity"]}}},required:["heading","purpose","location","time","duration","dialogue","shots"]}},required:["title","logline","genre","visualBible","characters","scenes"]};
function json(res,status,obj){res.status(status).setHeader("content-type","application/json");res.end(JSON.stringify(obj))}
module.exports=async(req,res)=>{
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed."});
 if(!process.env.OPENAI_API_KEY)return json(res,500,{error:"Movie AI is not configured yet. Add OPENAI_API_KEY in the Vercel project settings."});
 try{
  const x=req.body||{},prompt=typeof x.prompt==="string"?x.prompt.trim():"",length=Number(x.length||15),genre=x.genre||"Drama",style=x.visualStyle||"Cinematic realism",ratio=x.ratio||"16:9";
  if(!prompt)return json(res,400,{error:"Movie idea is required."});
  const count=length<=5?4:length<=15?8:12;
  const input=["Create a production-ready AI movie blueprint.","Story idea: "+prompt,"Genre: "+genre,"Visual style: "+style,"Aspect ratio: "+ratio,"Target length: "+length+" minutes.","Create exactly "+count+" scenes.","For each scene create exactly 2 practical filmable shots.","Keep the same character appearance, wardrobe, locations and visual continuity throughout.","Keep dialogue concise and natural.","Keep camera directions short and specific.","Return only the requested structured blueprint.","Do not reproduce existing copyrighted films or characters."].join("\n");
  const body={model:process.env.OPENAI_MOVIE_MODEL||"gpt-5.6-luna",reasoning:{effort:"low"},max_output_tokens:12000,input,text:{format:{type:"json_schema",name:"movie_blueprint",strict:true,schema}}};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  let r; try{r=await fetch(OPENAI_URL,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify(body),signal:controller.signal})}finally{clearTimeout(timer)}
  const d=await r.json().catch(()=>({}));
  if(!r.ok){console.error("OpenAI movie planner error",r.status,d);return json(res,502,{error:"Movie planning service is temporarily unavailable. Please try again."})}
  const raw=d.output_text||((d.output||[]).map(item=>(item.content||[]).map(c=>c.text||"").join("")).join(""));
  if(!raw)throw new Error("No blueprint returned.");
  return json(res,200,{blueprint:JSON.parse(raw)});
 }catch(e){
  console.error("Movie blueprint error",e);
  if(e&&e.name==="AbortError")return json(res,504,{error:"Movie blueprint generation took too long. Please try again."});
  return json(res,500,{error:"Could not build the movie blueprint. Please try again."});
 }
};