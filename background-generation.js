(function(){
  const VAPID_PUBLIC_KEY="BAs9rMWNjn-7-NKEMO5Yu154MbUkMs9uFF6WqUt1GhWYnu7nHRPYCaHUsOoCXNJZ2CgSB8JBVy8ER63Q5WtYfgk";
  function keyToBytes(base64){const p="=".repeat((4-base64.length%4)%4);const b=(base64+p).replace(/-/g,"+").replace(/_/g,"/");const raw=atob(b);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
  async function enableMovieNotifications(){
    try{
      if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)||!window.movieSupabase)return false;
      const permission=Notification.permission==="granted"?permission:await Notification.requestPermission();
      if(permission!=="granted")return false;
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyToBytes(VAPID_PUBLIC_KEY)});
      await window.movieAuthReady;
      const user=window.movieUserId;
      if(!user)return false;
      const {error}=await window.movieSupabase.from("push_subscriptions").upsert({
        user_id:user,endpoint:sub.endpoint,subscription:sub.toJSON(),updated_at:new Date().toISOString()
      },{onConflict:"endpoint"});
      if(error)throw error;
      return true;
    }catch(e){console.warn("Movie notifications:",e);return false;}
  }
  window.enableMovieNotifications=enableMovieNotifications;
  document.addEventListener("DOMContentLoaded",()=>{setTimeout(()=>enableMovieNotifications(),1200);});
})();