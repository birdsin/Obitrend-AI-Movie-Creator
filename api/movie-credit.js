const SUPABASE_MOVIE_CREDIT="https://vjlitqujcujwsislprfg.supabase.co/functions/v1/movie-credit";

export default async function handler(req,res){
  if(req.method==="OPTIONS"){
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Headers","authorization, content-type");
    res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
    return res.status(204).end();
  }
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed."});

  try{
    const authorization=String(req.headers.authorization||"").trim();
    if(!authorization)return res.status(401).json({error:"Your secure Movie Creator session is missing. Please reopen the Movie Creator."});

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    let upstream;
    try{
      upstream=await fetch(SUPABASE_MOVIE_CREDIT,{
        method:"POST",
        headers:{
          "content-type":"application/json",
          "authorization":authorization
        },
        body:JSON.stringify(req.body||{}),
        signal:controller.signal
      });
    }finally{
      clearTimeout(timer);
    }

    const text=await upstream.text();
    let data;
    try{data=JSON.parse(text)}catch{data={error:text||"Movie credit service returned an invalid response."}}

    res.setHeader("Cache-Control","no-store");
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Headers","authorization, content-type");
    return res.status(upstream.status).json(data);
  }catch(error){
    console.error("movie-credit proxy failed:",error);
    return res.status(503).json({
      error:error?.name==="AbortError"
        ?"Movie credit service timed out. Please try again."
        :"Movie credit service could not be reached. Please try again."
    });
  }
}