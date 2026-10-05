import { withSupabase } from "npm:@supabase/server@1";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};

function json(data:any,status=200){
  return new Response(JSON.stringify(data),{status,headers:CORS});
}

export default {
  fetch: withSupabase({auth:"user"}, async (req,ctx)=>{
    if(req.method==="OPTIONS") return new Response("ok",{status:200,headers:CORS});
    if(req.method!=="POST") return json({error:"Method not allowed."},405);

    try{
      const body=await req.json().catch(()=>({}));
      const action=String(body.action||"");

      if(action==="status"){
        const {data,error}=await ctx.supabase.rpc("ensure_movie_entitlement");
        if(error) return json({error:error.message},500);
        return json(data?.[0]||null);
      }

      if(action==="reserve"){
        try{
          const {data,error}=await ctx.supabase.rpc("reserve_movie_credit");
          if(error){
            const message=String(error.message||"Could not reserve a movie credit.");
            const status=/NO_MOVIE_CREDITS|MOVIE_ACCOUNT_NOT_FOUND/i.test(message)?402:500;
            return json({error:status===402?"No movie credits available. Please upgrade your Pro plan.":message},status);
          }
          const row=data?.[0];
          if(!row?.reservation_token){
            console.error("reserve_movie_credit returned no reservation token");
            return json({error:"Could not create a secure movie credit reservation. Please try again."},503);
          }
          return json({
            reservation_token:String(row.reservation_token),
            remaining_credits:Number(row.remaining_credits||0)
          });
        }catch(error){
          console.error("reserve_movie_credit failed:",error);
          return json({error:"No movie credits are available right now. Please check your plan and try again."},402);
        }
      }

      // Movie production state is authenticated by the user's Supabase session.
      // These actions do NOT require a per-shot credit reservation token.
      if(action==="production_bind_provider_task"){
        const productionId=String(body.production_id||"").trim();
        const taskId=String(body.task_id||"").trim();
        const reservationToken=String(body.reservation_token||"").trim();
        if(!productionId||!taskId||!reservationToken)return json({error:"Movie production binding data is required."},400);
        const {data,error}=await ctx.supabase.rpc("bind_movie_provider_task",{
          p_production_id:productionId,p_task_id:taskId,p_reservation_token:reservationToken
        });
        if(error)return json({error:error.message},400);
        return json({ok:Boolean(data)});
      }

      if(action==="production_create"){
        const title=String(body.title||"").trim();
        const blueprint=body.blueprint;
        const lengthMinutes=Math.max(1,Number(body.length_minutes||1));
        const totalSegments=Math.max(1,Math.floor(Number(body.total_segments||0)));
        if(!title) return json({error:"Movie title is required."},400);
        if(!blueprint||typeof blueprint!=="object") return json({error:"Movie blueprint is required."},400);
        if(!Number.isFinite(lengthMinutes)||!Number.isFinite(totalSegments)) return json({error:"Invalid movie production settings."},400);
        const {data,error}=await ctx.supabase.rpc("create_movie_production",{
          p_title:title,
          p_blueprint:blueprint,
          p_length_minutes:Math.floor(lengthMinutes),
          p_total_segments:totalSegments
        });
        if(error) return json({error:error.message},400);
        if(!data) return json({error:"Could not save the movie production."},500);
        return json({production_id:String(data)});
      }

      if(action==="production_status"){
        const productionId=String(body.production_id||"").trim();
        if(!productionId) return json({error:"Movie production ID is required."},400);
        const {data,error}=await ctx.supabase.rpc("get_movie_production",{
          p_production_id:productionId
        });
        if(error) return json({error:error.message},400);
        return json(data?.[0]||null);
      }

      if(action==="production_segment"){
        const productionId=String(body.production_id||"").trim();
        const segmentIndex=Math.floor(Number(body.segment_index));
        const videoUrl=String(body.video_url||"").trim();
        if(!productionId) return json({error:"Movie production ID is required."},400);
        if(!Number.isInteger(segmentIndex)||segmentIndex<0) return json({error:"Invalid movie segment."},400);
        if(!videoUrl) return json({error:"Video URL is required."},400);
        const {data,error}=await ctx.supabase.rpc("save_movie_production_segment",{
          p_production_id:productionId,
          p_segment_index:segmentIndex,
          p_video_url:videoUrl
        });
        if(error) return json({error:error.message},400);
        return json({ok:Boolean(data)});
      }

      if(action==="production_status_update"){
        const productionId=String(body.production_id||"").trim();
        const productionStatus=String(body.status||"").trim();
        if(!productionId) return json({error:"Movie production ID is required."},400);
        const {data,error}=await ctx.supabase.rpc("set_movie_production_status",{
          p_production_id:productionId,
          p_status:productionStatus
        });
        if(error) return json({error:error.message},400);
        return json({ok:Boolean(data)});
      }

      const token=String(body.token||"").trim();
      if(!token) return json({error:"Missing reservation token."},400);

      if(action==="validate"){
        const {data,error}=await ctx.supabase.rpc("validate_movie_credit",{p_token:token});
        if(error) return json({error:error.message,valid:false},500);
        return json({valid:Boolean(data)});
      }

      const fn=action==="commit"?"commit_movie_credit":action==="release"?"release_movie_credit":null;
      if(!fn) return json({error:"Unknown credit action."},400);

      const {data,error}=await ctx.supabase.rpc(fn,{p_token:token});
      if(error) return json({error:error.message},400);
      return json({ok:Boolean(data)});
    }catch(error){
      console.error("movie-credit request failed:",error);
      return json({error:"Movie credit service is temporarily unavailable. Please try again."},503);
    }
  })
};