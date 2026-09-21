const OPENAI_URL="https://api.openai.com/v1/chat/completions";
const schema={type:"object",additionalProperties:false,properties:{
 title:{type:"string"},logline:{type:"string"},genre:{type:"string"},
 visualBible:{type:"object",additionalProperties:false,properties:{world:{type:"string"},colorGrade:{type:"string"},lighting:{type:"string"},realism:{type:"string"},continuity:{type:"string"}},required:["world","colorGrade","lighting","realism","continuity"]},
 characters:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},role:{type:"string"},appearance:{type:"string"},wardrobe:{type:"string"},personality:{type:"string"}},required:["name","role","appearance","wardrobe","personality"]}},
 scenes:{type:"array",items:{type:"object",additionalProperties:false,properties:{heading:{type:"string"},purpose:{type:"string"},location:{type:"string"},time:{type:"string"},duration:{type:"string"},dialogue:{type:"string"},shots:{type:"array",items:{type:"object",additionalProperties:false,properties:{camera:{type:"string"},lens:{type:"string"},framing:{type:"string"},angle:{type:"string"},movement:{type:"string"},focus:{type:"string"},lighting:{type:"string"},sound:{type:"string"},continuity:{type:"string"}},required:["camera","lens","framing","angle","movement","focus","lighting","sound","continuity"]}}},required:["heading","purpose","location","time","duration","dialogue","shots"]}}
},required:["title","logline","genre","visualBible","characters","scenes"]};

function send(res,status,obj){res.status(status).setHeader("content-type","application/json");res.end(JSON.stringify(obj));}

module.exports=async function(req,res){
 if(req.method!=="POST")return send(res,405,{error:"Method not allowed."});
 const key=process.env.OPENAI_API_KEY;
 if(!key)return send(res,500,{error:"Movie AI is not configured yet."});
 try{
  const x=req.body||{}, prompt=typeof x.prompt==="string"?x.prompt.trim():"";
  const length=Number(x.length)||15, genre=x.genre||"Drama", style=x.visualStyle||"Cinematic realism", ratio=x.ratio||"16:9";
  if(!prompt)return send(res,400,{error:"Movie idea is required."});
  const count=length<=5?4:length<=15?8:12;
  const system="You are a professional film development system. Create a concise production-ready movie blueprint. Preserve character, wardrobe, location and visual continuity. Do not reproduce existing copyrighted films or characters.";
  const user="Story idea: "+prompt+"\nGenre: "+genre+"\nVisual style: "+style+"\nAspect ratio: "+ratio+"\nTarget length: "+length+" minutes.\nCreate exactly "+count+" scenes and exactly 2 short practical shots per scene. Keep dialogue concise and camera directions filmable.";
  const body={model:process.env.OPENAI_MOVIE_MODEL||"gpt-5.6-luna",messages:[{role:"system",content:system},{role:"user",content:user}],response_format:{type:"json_schema",json_schema:{name:"movie_blueprint",strict:true,schema}},max_tokens:8000};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  let r;
  try{
   r=await fetch(OPENAI_URL,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+key},body:JSON.stringify(body),signal:controller.signal});
  }finally{clearTimeout(timer)}
  const rawText=await r.text();
  let data={};try{data=JSON.parse(rawText)}catch{}
  if(!r.ok){console.error("OpenAI planner HTTP error",r.status,rawText.slice(0,1000));return send(res,502,{error:"Movie planning service is temporarily unavailable. Please try again."})}
  const raw=data&&data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;
  if(!raw)return send(res,502,{error:"Movie planning service returned no blueprint. Please try again."});
  let blueprint;try{blueprint=JSON.parse(raw)}catch(e){console.error("Blueprint JSON parse error",raw.slice(0,500));return send(res,502,{error:"Movie planning service returned an invalid blueprint. Please try again."})}
  return send(res,200,{blueprint});
 }catch(e){
  console.error("Movie planner exception",e&&e.stack||e);
  if(e&&e.name==="AbortError")return send(res,504,{error:"Movie blueprint generation took too long. Please try again."});
  return send(res,502,{error:"Movie planning service is temporarily unavailable. Please try again."});
 }
};