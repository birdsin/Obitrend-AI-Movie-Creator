import { withSupabase } from "npm:@supabase/server@1";

const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};

function json(data:any,status=200){
  return new Response(JSON.stringify(data),{status,headers:CORS});
}

const plans:any={
  oneDay:{name:"1 Day Pro",amount:500000,credits:1,durationDays:1},
  twoDays:{name:"2 Day Pro",amount:1000000,credits:2,durationDays:2},
  sixDays:{name:"6 Day Pro",amount:2000000,credits:4,durationDays:6},
  weekly:{name:"7 Day Pro",amount:4000000,credits:8,durationDays:7},
  fourteenDays:{name:"14 Day Pro",amount:5000000,credits:10,durationDays:14},
  monthly:{name:"1 Month Pro",amount:10000000,credits:20,durationDays:30}
};

async function pst(path:string,opts:any={}){
  const k=Deno.env.get("PAYSTACK_TEST_SECRET_KEY");
  if(!k)throw new Error("Paystack Test Mode is not configured.");
  if(!k.startsWith("sk_test_"))throw new Error("Invalid Paystack Test Mode secret.");
  const r=await fetch("https://api.paystack.co"+path,{
    ...opts,
    headers:{Authorization:"Bearer "+k,"Content-Type":"application/json"}
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.status)throw new Error(d.message||"Payment request failed.");
  return d;
}

export default {fetch:withSupabase({auth:"user"},async(req,ctx)=>{
  try{
    if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:CORS});
    if(req.method!=="POST")return json({error:"Method not allowed."},405);

    const b=await req.json().catch(()=>({}));
    const a=String(b.action||"");
    const uid=String(ctx.userClaims?.id||"");
    if(!uid)return json({error:"Authentication required."},401);

    if(a==="status"){
      const {data,error}=await ctx.supabase.rpc("ensure_movie_entitlement");
      if(error)throw error;
      return json(data?.[0]||null);
    }

    const key=String(b.plan||"");
    const p=plans[key];
    if(!p)return json({error:"Invalid movie plan."},400);

    if(a==="initialize"){
      const email=String(b.email||ctx.userClaims?.email||"").trim().toLowerCase();
      if(!/^\S+@\S+\.\S+$/.test(email))return json({error:"Enter a valid payment email."},400);

      const origin=String(req.headers.get("origin")||"").replace(/\/$/,"")||"https://obitrend-ai-movie-creator.vercel.app";
      const d=await pst("/transaction/initialize",{
        method:"POST",
        body:JSON.stringify({
          email,
          amount:String(p.amount),
          currency:"NGN",
          callback_url:origin+"/?movie_payment=success",
          metadata:{
            product:"OBITREND AI Movie Creator TEST",
            movie_plan:key,
            movie_user_id:uid,
            movie_credits:p.credits,
            duration_days:p.durationDays,
            test_mode:true
          }
        })
      });

      return json({
        authorization_url:d.data.authorization_url,
        reference:String(d.data.reference),
        user_id:uid,
        test_mode:true
      });
    }

    if(a==="verify"){
      const ref=String(b.reference||"").trim();
      if(!ref)return json({error:"Missing payment reference."},400);

      const d=await pst("/transaction/verify/"+encodeURIComponent(ref));
      const tx=d.data||{};
      const m=tx.metadata||{};
      const sourceUid=String(m.movie_user_id||"");
      const pk=String(m.movie_plan||"");
      const pp=plans[pk];
      if(!pp)return json({error:"Unrecognized movie plan."},400);

      const paidAmount=Number(tx.amount||0);
      const requestedAmount=Number(tx.requested_amount||0);
      const amountValid=paidAmount===pp.amount||requestedAmount===pp.amount||(paidAmount>=pp.amount&&requestedAmount===0);

      if(tx.status!=="success"||String(tx.currency||"").toUpperCase()!=="NGN"||!amountValid){
        return json({error:"Payment validation failed."},402);
      }

      let data,error;
      if(sourceUid && sourceUid!==uid){
        const paymentEmail=String(tx.customer?.email||"").trim().toLowerCase();
        const currentEmail=String(ctx.userClaims?.email||"").trim().toLowerCase();
        if(!paymentEmail||!currentEmail||paymentEmail!==currentEmail){
          return json({error:"Payment belongs to a different account."},403);
        }
        ({data,error}=await ctx.supabaseAdmin.rpc("claim_movie_payment",{
          p_reference:ref,
          p_target_user_id:uid,
          p_source_user_id:sourceUid
        }));
      }else{
        ({data,error}=await ctx.supabaseAdmin.rpc("fulfill_movie_payment",{
          p_reference:ref,
          p_user_id:uid,
          p_plan_key:pk,
          p_plan_name:pp.name,
          p_amount_kobo:pp.amount,
          p_credits:pp.credits,
          p_duration_days:pp.durationDays,
          p_currency:"NGN",
          p_paid_at:tx.paid_at||new Date().toISOString()
        }));
      }

      if(error)throw error;

      return json({
        success:true,
        planName:pp.name,
        credits:data?.[0]?.credits||pp.credits,
        durationDays:pp.durationDays,
        user_id:data?.[0]?.public_user_id||null,
        email:tx.customer?.email||"",
        test_mode:true
      });
    }

    return json({error:"Unknown action."},400);
  }catch(e){
    return json({error:e instanceof Error?e.message:"Payment service unavailable."},500);
  }
})};