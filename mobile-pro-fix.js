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

/* FIX: mobile drawer Templates must open the existing Templates workspace */
document.addEventListener("click",(e)=>{
  const item=e.target.closest('[data-drawer-action="templates"]');
  if(!item)return;
  e.preventDefault();
  e.stopPropagation();
  const drawer=document.getElementById("androidDrawer");
  drawer?.classList.remove("open");
  if(typeof openMenu==="function") openMenu("templates");
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

/* FIX: mobile drawer Help & Support must open the existing Help workspace */
document.addEventListener("click",(e)=>{
  const item=e.target.closest('[data-drawer-action="help"]');
  if(!item)return;
  e.preventDefault();
  e.stopPropagation();
  const drawer=document.getElementById("androidDrawer");
  drawer?.classList.remove("open");
  if(typeof openMenu==="function") openMenu("help");
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

/* FIX: mobile drawer My Credits must open the existing Credits workspace */
document.addEventListener("click",(e)=>{
  const item=e.target.closest('[data-drawer-action="credits"]');
  if(!item)return;
  e.preventDefault();
  e.stopPropagation();
  const drawer=document.getElementById("androidDrawer");
  drawer?.classList.remove("open");
  if(typeof openMenu==="function") openMenu("credits");
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

/* VERIFY/FIX ONLY: mobile drawer My Movies opens the existing creations workspace */
document.addEventListener("click",(e)=>{
  const item=e.target.closest('[data-drawer-action="movies"]');
  if(!item)return;
  e.preventDefault();
  e.stopPropagation();
  const drawer=document.getElementById("androidDrawer");
  drawer?.classList.remove("open");
  if(typeof openMenu==="function") openMenu("creations");
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

/* VERIFY/FIX ONLY: ensure Home and Create Movie drawer items respond to mobile taps */
document.addEventListener("click",(e)=>{
  const item=e.target.closest('[data-drawer-action="home"],[data-drawer-action="create"]');
  if(!item)return;
  e.preventDefault();
  e.stopPropagation();
  const drawer=document.getElementById("androidDrawer");
  drawer?.classList.remove("open");
  if(item.dataset.drawerAction==="home"){
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }
  if(typeof showCreate==="function"){
    showCreate();
    document.getElementById("createPanel")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
},true);

/* FIX ONLY: switching from one mobile menu item to another must open that workspace, not the dashboard */
document.addEventListener("click",(e)=>{
  const item=e.target.closest("#androidDrawer [data-drawer-action]");
  if(!item)return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const action=item.dataset.drawerAction;
  const drawer=document.getElementById("androidDrawer");
  drawer?.classList.remove("open");

  if(action==="home"){
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }
  if(action==="create"){
    const panel=document.getElementById("createPanel");
    if(panel){
      panel.classList.remove("hidden");
      panel.scrollIntoView({behavior:"smooth",block:"start"});
    }
    return;
  }

  const menuMap={movies:"creations",templates:"templates",credits:"credits",settings:"settings",help:"help"};
  const target=menuMap[action];
  if(!target || typeof openMenu!=="function")return;

  openMenu(target);

  const workspace=document.getElementById("menuWorkspace");
  if(workspace){
    workspace.classList.remove("hidden");
    workspace.style.position="fixed";
    workspace.style.left="12px";
    workspace.style.right="12px";
    workspace.style.top="80px";
    workspace.style.bottom="20px";
    workspace.style.zIndex="99999";
    workspace.style.margin="0";
    workspace.style.maxHeight="none";
    workspace.style.overflowY="auto";
    workspace.style.background="#0d141e";
    workspace.style.border="1px solid #2a3442";
    workspace.style.boxShadow="0 20px 60px rgba(0,0,0,.85)";
    workspace.scrollTop=0;
  }
},true);

