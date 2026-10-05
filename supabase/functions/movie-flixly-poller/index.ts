import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const SECRET = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const FLIXLY_KEY = Deno.env.get("FLIXLY_API_KEY") || "";
const FLIXLY_WEBHOOK_SECRET = Deno.env.get("FLIXLY_WEBHOOK_SECRET") || "";
const db = createClient(SUPABASE_URL, SECRET, { auth:{persistSession:false,autoRefreshToken:false} });
const WEBHOOK_URL = SUPABASE_URL + "/functions/v1/movie-flixly-webhook";

function hex(bytes){ return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join(""); }

async function sign(raw, ts){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(FLIXLY_WEBHOOK_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const mac=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(ts+"."+raw));
  return "sha256="+hex(mac);
}

async function status(id){
  const r=await fetch("https://www.flixly.ai/api/v1/generations/"+encodeURIComponent(id),{headers:{Authorization:"Bearer "+FLIXLY_KEY}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){
    const e=new Error(d?.error?.message||d?.message||"Flixly status check failed.");
    e.status=r.status;
    e.providerCode=d?.error?.code||null;
    throw e;
  }
  const s=String(d?.status||"").toLowerCase();
  return {status:s,output_url:d?.output_url||d?.video_url||null,error:d?.error?.message||d?.message||null};
}

async function forward(event){
  const raw=JSON.stringify(event),ts=String(Math.floor(Date.now()/1000));
  const r=await fetch(WEBHOOK_URL,{method:"POST",headers:{"content-type":"application/json","x-flixly-timestamp":ts,"x-flixly-signature":await sign(raw,ts),"x-flixly-event":String(event.event||"")},body:raw});
  if(!r.ok) throw new Error("Webhook handoff failed with HTTP "+r.status+".");
}

Deno.serve(async req=>{
  if(req.method!=="POST") return new Response("ok",{status:200});
  const supplied=String(req.headers.get("apikey")||"").trim();
  const allowed=Object.values(publishableKeys).some(k=>String(k||"").trim()===supplied);
  if(!allowed) return new Response("unauthorized",{status:401});
  if(!FLIXLY_KEY) return new Response("Flixly is not configured.",{status:500});
  if(!FLIXLY_WEBHOOK_SECRET) return new Response("Flixly webhook secret is not configured.",{status:500});

  const q=await db.rpc("list_movie_provider_tasks_for_poller");
  if(q.error) return new Response("db error: "+q.error.message,{status:500});

  const results=[];
  for(const row of q.data||[]){
    const task=String(row.provider_task_id||"").trim();
    if(!task) continue;
    try{
      const s=await status(task);
      const normalized=String(s.status||"").toLowerCase();
      if(normalized==="completed"&&s.output_url){
        await forward({event:"generation.completed",id:task,status:"completed",type:"TEXT_TO_VIDEO",output_url:s.output_url,credits_charged:null,error:null});
        results.push({id:row.id,task,status:"completed"});
      }else if(["failed","error","canceled","cancelled"].includes(normalized)){
        await forward({event:"generation.failed",id:task,status:"failed",type:"TEXT_TO_VIDEO",output_url:null,credits_charged:0,error:s.error||"Flixly could not generate this shot."});
        results.push({id:row.id,task,status:"failed"});
      }else{
        results.push({id:row.id,task,status:normalized||"processing"});
      }
    }catch(e){
      const message=String(e?.message||"");
      const notFound=Number(e?.status)===404 || /generation not found|not found/i.test(message);
      if(notFound){
        try{
          await forward({event:"generation.failed",id:task,status:"failed",type:"TEXT_TO_VIDEO",output_url:null,credits_charged:0,error:"Flixly no longer has this generation task. The movie credit was restored so the shot can be started again safely."});
          results.push({id:row.id,task,status:"missing_task_released"});
          continue;
        }catch(handoffError){
          results.push({id:row.id,task,status:"missing_task_handoff_failed",error:String(handoffError?.message||handoffError)});
          continue;
        }
      }
      console.error("movie-flixly-poller",row.id,message);
      results.push({id:row.id,task,status:"check_failed"});
    }
  }

  return Response.json({ok:true,checked:results.length,results});
});
