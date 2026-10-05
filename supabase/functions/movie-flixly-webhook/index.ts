import { createClient } from "npm:@supabase/supabase-js@2";
import { sendNotification } from "npm:web-push-neo";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
const SECRET=secretKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const FLIXLY_KEY=Deno.env.get("FLIXLY_API_KEY")||"";
const FLIXLY_WEBHOOK_SECRET=Deno.env.get("FLIXLY_WEBHOOK_SECRET")||"";
const MODEL=Deno.env.get("FLIXLY_VIDEO_MODEL")||"seedance-2-5";
const MAX_DURATION=Math.max(4,Math.min(30,Number(Deno.env.get("FLIXLY_MAX_DURATION")||30)));
const VAPID_PUBLIC="BAs9rMWNjn-7-NKEMO5Yu154MbUkMs9uFF6WqUt1GhWYnu7nHRPYCaHUsOoCXNJZ2CgSB8JBVy8ER63Q5WtYfgk";
const db=createClient(SUPABASE_URL,SECRET,{auth:{persistSession:false,autoRefreshToken:false}});

function hex(bytes){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function verify(raw,ts,sig){
  const n=Number(ts); if(!FLIXLY_WEBHOOK_SECRET||!ts||!sig||!Number.isFinite(n)||Math.abs(Date.now()/1000-n)>300)return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(FLIXLY_WEBHOOK_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const mac=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(ts+"."+raw));
  const expected="sha256="+hex(mac); if(expected.length!==sig.length)return false;
  let d=0;for(let i=0;i<expected.length;i++)d|=expected.charCodeAt(i)^sig.charCodeAt(i);return d===0;
}
function ratio(r){return ["auto","21:9","16:9","4:3","1:1","3:4","9:16"].includes(String(r||""))?String(r):"16:9";}
function flat(b){const a=[];for(let si=0;si<(b?.scenes||[]).length;si++){const s=b.scenes[si]||{};for(let hi=0;hi<(s.shots||[]).length;hi++)a.push({si,hi,scene:s,shot:s.shots[hi]});}return a;}
function prompt(b,x,prev){
  const chars=(b.characters||[]).map(c=>c.name+": "+c.appearance+"; wardrobe: "+c.wardrobe).join("\n"),v=b.visualBible||{},s=x.scene,sh=x.shot;
  return ["Cinematic AI movie shot for OBITREND.","Title: "+(b.title||"Untitled Movie")+".","World: "+(v.world||"realistic cinematic world")+".","Color grade: "+(v.colorGrade||"natural cinematic color")+".","Realism: "+(v.realism||"photorealistic live-action cinema")+".","Character continuity: keep faces, wardrobe, props and identities consistent.","Characters:\n"+chars,"Scene: "+(s.heading||"")+" . Location: "+(s.location||"")+" . Time: "+(s.time||"")+" .","Purpose: "+(s.purpose||"")+" . Dialogue/action: "+(s.dialogue||"natural believable action")+".","Shot: camera "+(sh.camera||"professional cinema camera")+"; lens "+(sh.lens||"50mm")+"; framing "+(sh.framing||"cinematic medium shot")+"; angle "+(sh.angle||"eye-level")+"; movement "+(sh.movement||"natural controlled movement")+"; focus "+(sh.focus||"main character")+"; lighting "+(sh.lighting||"natural cinematic lighting")+"; sound "+(sh.sound||"natural location ambience")+"; continuity "+(sh.continuity||"maintain story continuity")+".",prev?"Continue directly from the previous generated shot. Preserve established characters, wardrobe, location, lighting and action geography. Previous output URL: "+prev:"This is the opening shot. Establish the characters, location and visual world clearly.","Natural human motion, physically plausible camera movement, cinematic composition, professional live-action film quality."].join(" ");
}
async function generateNext(b,x,prev,dur,ar){
  if(!FLIXLY_KEY)throw new Error("FLIXLY_API_KEY is not configured in Supabase Edge Functions.");
  const r=await fetch("https://www.flixly.ai/api/v1/generate",{method:"POST",headers:{"Authorization":"Bearer "+FLIXLY_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,prompt:prompt(b,x,prev).slice(0,4000),type:"TEXT_TO_VIDEO",duration:Math.max(4,Math.min(MAX_DURATION,dur)),aspect_ratio:ratio(ar),webhook_url:SUPABASE_URL+"/functions/v1/movie-flixly-webhook"})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error?.message||d?.message||"Flixly could not start the next movie shot.");
  return {id:String(d.id||d.task_id||""),url:d.output_url||d.video_url||null};
}
async function notify(uid,title,body){
  try{
    const {data:c}=await db.from("push_config").select("public_key,private_key,subject").eq("id","default").maybeSingle();if(!c?.private_key)return;
    const {data:s}=await db.from("push_subscriptions").select("endpoint,subscription").eq("user_id",uid);
    for(const row of s||[])try{await sendNotification(row.subscription,{title,body,data:{url:"/"}},{vapidDetails:{subject:c.subject||"mailto:admin@obitrend.vercel.app",publicKey:c.public_key||VAPID_PUBLIC,privateKey:c.private_key},TTL:86400,urgency:"high"});}catch(e){}
  }catch(e){console.error("notify",e);}
}
Deno.serve(async req=>{
  if(req.method!=="POST")return new Response("ok",{status:200});
  const raw=await req.text();
  if(!(await verify(raw,req.headers.get("x-flixly-timestamp")||"",req.headers.get("x-flixly-signature")||"")))return new Response("invalid signature",{status:401});
  let ev;try{ev=JSON.parse(raw)}catch{return new Response("bad json",{status:400})}
  const task=String(ev?.id||"");if(!task)return new Response("ok");
  const q=await db.rpc("get_movie_production_for_provider",{p_task_id:task});if(q.error)return new Response("db error",{status:500});
  const p=Array.isArray(q.data)?q.data[0]:null;if(!p||p.status==="completed")return new Response("ok");
  if(ev.event==="generation.failed"||ev.status==="failed"){
    if(p.provider_reservation_token)await db.rpc("release_movie_credit_for_user",{p_user_id:p.user_id,p_token:p.provider_reservation_token});
    await db.rpc("mark_movie_provider_failure",{p_production_id:p.id,p_error:String(ev.error||"The video provider could not generate this shot.")});
    await notify(p.user_id,"Movie generation stopped",(p.title||"Your movie")+" could not complete this shot. Your OBITREND movie credit was restored.");
    return new Response("ok");
  }
  if(ev.event!=="generation.completed"&&ev.status!=="completed")return new Response("ok");
  const out=String(ev.output_url||"");if(!out)return new Response("ok");
  const idx=Number(p.next_segment||0);
  if(p.provider_reservation_token)await db.rpc("commit_movie_credit_for_user",{p_user_id:p.user_id,p_token:p.provider_reservation_token});
  const done=await db.rpc("complete_movie_provider_segment",{p_production_id:p.id,p_segment_index:idx,p_video_url:out,p_provider_status:"completed"});
  if(done.error)return new Response("db error",{status:500});
  const r=Array.isArray(done.data)?done.data[0]:done.data;
  if(r?.movie_completed){await notify(p.user_id,"🎬 Your movie is ready!",(p.title||"Your movie")+" has finished generating.");return new Response("ok");}
  const nextIndex=Number(r?.next_segment),x=flat(p.blueprint)[nextIndex];if(!x){await db.rpc("mark_movie_provider_failure",{p_production_id:p.id,p_error:"The next movie shot could not be resolved from the saved blueprint."});return new Response("ok");}
  let token="";
  try{
    const rr=await db.rpc("reserve_movie_credit_for_user",{p_user_id:p.user_id});if(rr.error||!rr.data?.[0])throw new Error(rr.error?.message||"No movie credits remain.");
    token=rr.data[0].reservation_token;
    const total=Number(p.total_segments||flat(p.blueprint).length||1),dur=total===1?Math.max(4,Math.min(MAX_DURATION,Math.round(Number(p.length_minutes||0.5)*60))):30;
    const g=await generateNext(p.blueprint,x,out,dur,p.blueprint?.ratio||"16:9");if(!g.id)throw new Error("Flixly returned no task id.");
    await db.from("movie_productions").update({provider_task_id:g.id,provider_reservation_token:token,provider_status:"processing",status:"generating",last_error:null,updated_at:new Date().toISOString()}).eq("id",p.id);
  }catch(e){
    if(token)await db.rpc("release_movie_credit_for_user",{p_user_id:p.user_id,p_token:token});
    await db.rpc("mark_movie_provider_failure",{p_production_id:p.id,p_error:String(e?.message||"The next movie shot could not be started.")});
    await notify(p.user_id,"Movie generation stopped",(p.title||"Your movie")+" could not continue. Your OBITREND movie credit was restored.");
  }
  return new Response("ok");
});