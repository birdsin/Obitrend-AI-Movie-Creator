const PLANS={
  threeDays:{name:"3 Day Creator",amount:1300000,credits:10,durationDays:3,planCode:process.env.PAYSTACK_MOVIE_3DAY_PLAN_CODE||""},
  weekly:{name:"Weekly Creator",amount:2600000,credits:22,durationDays:7,planCode:process.env.PAYSTACK_MOVIE_WEEKLY_PLAN_CODE||""},
  monthly:{name:"Monthly Creator",amount:9000000,credits:70,durationDays:30,planCode:process.env.PAYSTACK_MOVIE_MONTHLY_PLAN_CODE||""}
};
function json(res,status,body){res.status(status).setHeader("content-type","application/json");res.end(JSON.stringify(body))}
async function paystack(path,options={}){
  const key=process.env.PAYSTACK_SECRET_KEY;
  if(!key)throw new Error("PAYSTACK_SECRET_KEY is not configured on Vercel.");
  const r=await fetch("https://api.paystack.co"+path,{...options,headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json",...(options.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.status)throw new Error(d.message||"Paystack request failed.");
  return d;
}
module.exports=async function handler(req,res){
  try{
    if(req.method!=="POST")return json(res,405,{error:"Method not allowed."});
    const body=req.body||{},action=String(body.action||"");
    if(action==="initialize"){
      const planKey=String(body.plan||""),email=String(body.email||"").trim().toLowerCase(),plan=PLANS[planKey];
      if(!plan)return json(res,400,{error:"Invalid movie plan."});
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:"Enter a valid email address."});
      const origin=String(req.headers.origin||"").replace(/\/$/,"");
      const callbackUrl=origin?origin+"/?movie_payment=success":"https://obitrend-ai-movie-creator.vercel.app/?movie_payment=success";
      const payload={email,amount:String(plan.amount),currency:"NGN",callback_url:callbackUrl,metadata:{product:"OBITREND AI Movie Creator",movie_plan:planKey,movie_credits:plan.credits,duration_days:plan.durationDays}};
      if(plan.planCode)payload.plan=plan.planCode;
      const d=await paystack("/transaction/initialize",{method:"POST",body:JSON.stringify(payload)});
      return json(res,200,{authorization_url:d.data.authorization_url,reference:d.data.reference,plan:planKey});
    }
    if(action==="verify"){
      const reference=String(body.reference||"").trim();
      if(!reference)return json(res,400,{error:"Missing payment reference."});
      const d=await paystack("/transaction/verify/"+encodeURIComponent(reference),{method:"GET"});
      const tx=d.data||{},meta=tx.metadata||{},planKey=String(meta.movie_plan||""),plan=PLANS[planKey];
      if(!plan)return json(res,400,{error:"This payment is not a recognized OBITREND Movie Creator plan."});
      if(tx.status!=="success")return json(res,402,{error:"Payment was not completed successfully."});
      if(String(tx.currency||"").toUpperCase()!=="NGN")return json(res,400,{error:"Payment currency mismatch."});
      const requestedAmount=Number(tx.requested_amount??tx.amount);\n      if(requestedAmount!==plan.amount)return json(res,400,{error:"Payment amount does not match the selected movie plan."});
      return json(res,200,{success:true,reference,plan:planKey,planName:plan.name,credits:plan.credits,durationDays:plan.durationDays,email:tx.customer?.email||""});
    }
    return json(res,400,{error:"Unknown payment action."});
  }catch(err){return json(res,500,{error:err.message||"Movie payment service is temporarily unavailable."})}
};
