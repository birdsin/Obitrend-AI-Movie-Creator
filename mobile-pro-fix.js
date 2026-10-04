/* Mobile Pro button fix */
document.addEventListener("DOMContentLoaded",()=>{
  const profile=document.querySelector(".android-profile");
  const workspace=document.getElementById("menuWorkspace");
  if(!profile)return;

  profile.setAttribute("role","button");
  profile.setAttribute("tabindex","0");
  profile.style.cursor="pointer";
  profile.style.touchAction="manipulation";
  profile.style.webkitTapHighlightColor="transparent";

  const openProPlans=()=>{
    if(typeof openMenu==="function"){
      openMenu("pro");
    }else if(typeof menuOpen==="function"){
      menuOpen(
        "Pro Plans",
        "Choose a Movie Creator plan and continue securely with Paystack.",
        '<div class="menu-grid">'+
        '<div class="menu-card"><div><h3>3 Day Creator</h3><p>₦13,000 · 10 credits · 3 days</p></div><button class="outline-btn menu-action" data-menu-action="pro:threeDays">Open</button></div>'+
        '<div class="menu-card"><div><h3>Weekly Creator</h3><p>₦26,000 · 22 credits · 7 days</p></div><button class="outline-btn menu-action" data-menu-action="pro:weekly">Open</button></div>'+
        '<div class="menu-card"><div><h3>Monthly Creator</h3><p>₦90,000 · 70 credits · 30 days</p></div><button class="outline-btn menu-action" data-menu-action="pro:monthly">Open</button></div>'+
        '</div>'
      );
    }else{
      return;
    }

    const w=document.getElementById("menuWorkspace");
    if(w){
      w.classList.remove("hidden");
      w.style.position="fixed";
      w.style.left="12px";
      w.style.right="12px";
      w.style.top="80px";
      w.style.bottom="20px";
      w.style.zIndex="99999";
      w.style.margin="0";
      w.style.maxHeight="none";
      w.style.overflowY="auto";
      w.style.background="#0d141e";
      w.style.border="1px solid #2a3442";
      w.style.boxShadow="0 20px 60px rgba(0,0,0,.85)";
      w.scrollTop=0;
      setTimeout(()=>w.scrollIntoView({behavior:"smooth",block:"center"}),0);
    }
  };

  const handle=e=>{
    if(e){e.preventDefault();e.stopPropagation();}
    openProPlans();
  };

  profile.addEventListener("pointerup",handle,{passive:false});
  profile.addEventListener("click",handle,{passive:false});
  profile.addEventListener("touchend",handle,{passive:false});
  profile.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){
      e.preventDefault();
      openProPlans();
    }
  });
});

/* FIX: mobile drawer Settings must open the real Settings workspace */
document.addEventListener("click",(e)=>{
  const item=e.target.closest('[data-drawer-action="settings"]');
  if(!item)return;
  e.preventDefault();
  e.stopPropagation();
  const drawer=document.getElementById("androidDrawer");
  drawer?.classList.remove("open");
  const sidebar=document.getElementById("sidebar");
  sidebar?.classList.add("open");
  if(typeof openMenu==="function") openMenu("settings");
  const w=document.getElementById("menuWorkspace");
  if(w){
    w.classList.remove("hidden");
    w.style.position="fixed";
    w.style.left="12px";
    w.style.right="12px";
    w.style.top="80px";
    w.style.bottom="20px";
    w.style.zIndex="99999";
    w.style.margin="0";
    w.style.maxHeight="none";
    w.style.overflowY="auto";
    w.style.background="#0d141e";
    w.style.border="1px solid #2a3442";
    w.style.boxShadow="0 20px 60px rgba(0,0,0,.85)";
    w.scrollTop=0;
  }
},true);

