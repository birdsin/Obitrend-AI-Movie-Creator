import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Content-Type":"application/json"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:cors});}

const PLANS:Record<string,{name:string;amount:number;credits:number;durationDays:number}>={
  oneDay:{name:"1 Day Pro",amount:500000,credits:1,durationDays:1},
  twoDays:{name:"2 Day Pro",amount:1000000,credits:2,durationDays:2},
  sixDays:{name:"6 Day Pro",amount:2000000,credits:4,durationDays:6},
  weekly:{name:"7 Day Pro",amount:4000000,credits:8,durationDays:7},
  fourteenDays:{name:"14 Day Pro",amount:5000000,credits:10,durationDays:14},
  monthly:{name:"1 Month Pro",amount:10000000,credits:20,durationDays:30}
};

function hex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function validSignature(raw:string,signature:string,secret:string){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-512"},false,["sign"]);
  const digest=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw));
  return hex(digest).toLowerCase()===String(signature||"").trim().toLowerCase();
}
async function paystackVerify(reference:string,secret:string){
  const r=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(reference),{headers:{Authorization:"Bearer "+secret}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.status||!d.data)throw new Error("PAYSTACK_VERIFY_FAILED");
  return d.data;
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed."},405);

  const secret=Deno.env.get("PAYSTACK_TEST_SECRET_KEY")||"";
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!secret||!supabaseUrl||!serviceKey)return json({error:"Test webhook service is not configured."},500);

  const raw=await req.text();
  const signature=req.headers.get("x-paystack-signature")||"";
  if(!(await validSignature(raw,signature,secret)))return json({error:"Invalid webhook signature."},401);

  let event:any;
  try{event=JSON.parse(raw)}catch{return json({error:"Invalid JSON."},400);}
  if(event?.event!=="charge.success")return json({received:true,ignored:true});

  const tx=event?.data||{};
  const reference=String(tx.reference||"").trim();
  if(!reference)return json({received:true,ignored:true});

  try{
    const verified=await paystackVerify(reference,secret);
    const metadata=verified?.metadata||tx?.metadata||{};
    const planKey=String(metadata.movie_plan||"");
    const userId=String(metadata.movie_user_id||"");
    const plan=PLANS[planKey];
    if(!plan||!userId)return json({received:true,ignored:true,reason:"Not an OBITREND movie payment."});

    const paidAmount=Number(verified.amount||0);
    const requestedAmount=Number(verified.requested_amount||0);
    const amountValid=paidAmount===plan.amount||requestedAmount===plan.amount||(paidAmount>=plan.amount&&requestedAmount===0);
    if(verified.status!=="success"||String(verified.currency||"").toUpperCase()!=="NGN"||!amountValid)return json({error:"Payment validation failed."},402);

    const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await admin.rpc("fulfill_movie_payment",{
      p_reference:reference,p_user_id:userId,p_plan_key:planKey,p_plan_name:plan.name,
      p_amount_kobo:plan.amount,p_credits:plan.credits,p_duration_days:plan.durationDays,
      p_currency:"NGN",p_paid_at:verified.paid_at||new Date().toISOString()
    });
    if(error)throw error;
    return json({received:true,fulfilled:true,reference,plan:plan.name,credits:data?.[0]?.credits??plan.credits});
  }catch(error){
    return json({error:error instanceof Error?error.message:"Webhook processing failed."},500);
  }
});