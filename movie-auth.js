import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm";

const SUPABASE_URL="https://vjlitqujcujwsislprfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_vxKAcrlrdZ3wfNH_n7EuZg_joZKejD6";

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
});
window.movieSupabase=client;

window.movieAuthReady=(async()=>{
  let {data:{session}}=await client.auth.getSession();
  if(!session){
    const r=await client.auth.signInAnonymously();
    if(r.error) throw new Error("Secure Movie Creator account setup is unavailable. Please enable Anonymous Sign-ins in Supabase.");
    session=r.data.session;
  }
  if(!session?.user?.id) throw new Error("Secure Movie Creator user identity is unavailable.");
  window.movieUserId=session.user.id;
  window.moviePublicUserId="OBI-"+session.user.id.replaceAll("-","").slice(0,8).toUpperCase();
  return session;
})();

window.getMovieAccessToken=async()=>{
  const session=await window.movieAuthReady;
  const {data}=await client.auth.getSession();
  const token=data.session?.access_token||session.access_token;
  if(!token) throw new Error("Your secure session has expired. Please reopen the Movie Creator.");
  return token;
};