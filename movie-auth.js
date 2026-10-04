import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm";

const SUPABASE_URL="https://vjlitqujcujwsislprfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_vxKAcrlrdZ3wfNH_n7EuZg_joZKejD6";

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
});
window.movieSupabase=client;

let resolveAuth;
let rejectAuth;
window.movieAuthReady=new Promise((resolve,reject)=>{resolveAuth=resolve;rejectAuth=reject});

function applySession(session){
  if(!session?.user?.id) return null;
  window.movieUserId=session.user.id;
  window.moviePublicUserId="OBI-"+session.user.id.replaceAll("-","").slice(0,8).toUpperCase();
  window.movieAuthSession=session;
  resolveAuth(session);
  return session;
}

window.setMovieAuthSession=applySession;

(async()=>{
  const {data:{session}}=await client.auth.getSession();
  if(session) applySession(session);
})();

client.auth.onAuthStateChange((_event,session)=>{
  if(session) applySession(session);
  else {
    window.movieUserId=null;
    window.moviePublicUserId=null;
    window.movieAuthSession=null;
  }
});

window.getMovieAccessToken=async()=>{
  const session=await window.movieAuthReady;
  const {data}=await client.auth.getSession();
  const token=data.session?.access_token||session?.access_token;
  if(!token) throw new Error("Your secure session has expired. Please sign in again.");
  return token;
};

window.movieSignIn=async(email,password)=>{
  const result=await client.auth.signInWithPassword({email,password});
  if(result.error) throw result.error;
  applySession(result.data.session);
  return result.data;
};

window.movieSignUp=async(email,password,fullName)=>{
  const result=await client.auth.signUp({email,password,options:{data:{full_name:fullName}}});
  if(result.error) throw result.error;
  if(result.data.session) applySession(result.data.session);
  return result.data;
};

window.movieSignOut=async()=>{
  const result=await client.auth.signOut();
  if(result.error) throw result.error;
};
