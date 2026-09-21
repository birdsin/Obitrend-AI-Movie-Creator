const OPENAI_URL="https://api.openai.com/v1/responses";
const schema={type:"object",properties:{title:{type:"string"},logline:{type:"string"},genre:{type:"string"},visualBible:{type:"object",properties:{world:{type:"string"},colorGrade:{type:"string"},lighting:{type:"string"},realism:{type:"string"},continuity:{type:"string"}},required:["world","colorGrade","lighting","realism","continuity"],additionalProperties:false},characters:{type:"array",items:{type:"object",properties:{name:{type:"string"},role:{type:"string"},appearance:{type:"string"},wardrobe:{type:"string"},personality:{type:"string"}},required:["name","role","appearance","wardrobe","personality"],additionalProperties:false}},scenes:{type:"array",items:{type:"object",properties:{heading:{type:"string"},purpose:{type:"string"},location:{type:"string"},time:{type:"string"},duration:{type:"string"},dialogue:{type:"string"},shots:{type:"array",items:{type:"object",properties:{camera:{type:"string"},lens:{type:"string"},framing:{type:"string"},angle:{type:"string"},movement:{type:"string"},focus:{type:"string"},lighting:{type:"string"},sound:{type:"string"},continuity:{type:"string"}},required:["camera","lens","framing","angle","movement","focus","lighting","sound","continuity"],additionalProperties:false}}},required:["heading","purpose","location","time","duration","dialogue","shots"],additionalProperties:false}},required:["title","logline","genre","visualBible","characters","scenes"],additionalProperties:false};

function send(res,status,obj){res.status(status);res.setHeader("content-type","application/json");res.end(JSON.stringify(obj));}
function extract(d){return d&&d.output_text?d.output_text:((d&&d.output)||[]).map(i=>(i.content||[]).map(c=>c.text||"").join("")).join("");}

module.exports=async function(req,res){
 if(req.method!=="POST")return send(res,405,{error:"Method not allowed."});
 const key=process.env.OPENAI_API_KEY;
 if(!key)return send(res,500,{error:"Movie AI is not configured yet."});
 try{
  const x=req.body||{};
  const prompt=typeof x.prompt==="string"?x.prompt.trim():"";
  const length=Number(x.length)||15;
  const genre=x.genre||"Drama";
  const style=x.visualStyle||"Cinematic realism";
  const ratio=x.ratio||"16:9";
  if(!prompt)return send(res,400,{error:"Movie idea is required."});

  const count=length<=5?4:length<=15?8:12;
  const input="Create a production-ready movie blueprint. Story: "+prompt+" Genre: "+genre+" Style: "+style+" Aspect ratio: "+ratio+" Length: "+length+" minutes. Create exactly "+count+" scenes, with exactly 2 short practical shots per scene. Keep character appearance, wardrobe, locations and continuity consistent. Keep dialogue concise. Do not reproduce existing copyrighted films or characters.";

  const body={model:process.env.OPENAI_MOVIE_MODEL||"gpt-5.6",input:input,text:{format:{type:"json_schema",name:"movie_blueprint",strict:true,schema}}};
  const controller=new AbortController();
  const timer=setTimeout(function(){controller.abort()},45000);
  let r;
  try{
   r=await fetch(OPENAI_URL,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+key},body:JSON.stringify(body),signal:controller.signal});
  }finally{clearTimeout(timer)}
  const rawText=await r.text();
  let data={};
  try{data=JSON.parse(rawText)}catch{}
  if(!r.ok){
   console.error("OpenAI error",r.status,rawText.slice(0,500));
   return send(res,502,{error:"Movie planning service is temporarily unavailable. Please try again."});
  }
  const raw=extract(data);
  if(!raw)return send(res,502,{error:"Movie planning service returned no blueprint. Please try again."});
  let blueprint;
  try{blueprint=JSON.parse(raw)}catch(e){
   console.error("Blueprint parse error",raw.slice(0,500));
   return send(res,502,{error:"Movie planning service returned an invalid blueprint. Please try again."});
  }
  return send(res,200,{blueprint:blueprint});
 }catch(e){
  console.error("Movie planner failure",e&&e.stack||e);
  if(e&&e.name==="AbortError")return send(res,504,{error:"Movie blueprint generation took too long. Please try again."});
  return send(res,500,{error:"Could not build the movie blueprint. Please try again."});
 }
};