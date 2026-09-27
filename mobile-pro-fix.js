/* Mobile Pro button fix */
document.addEventListener("DOMContentLoaded",()=>{
  const profile=document.querySelector(".android-profile");
  if(!profile)return;
  profile.type="button";
  profile.setAttribute("role","button");
  profile.setAttribute("tabindex","0");
  profile.style.cursor="pointer";
  profile.style.touchAction="manipulation";

  const openProPlans=()=>{
    if(typeof menuOpen!=="function")return;
    const card=(title,text,action)=>{
      if(typeof renderMenuCard==="function")return renderMenuCard(title,text,action);
      return '<div class="menu-card"><div><h3>'+title+'</h3><p>'+text+'</p></div><button class="outline-btn menu-action" data-menu-action="'+action+'">Open</button></div>';
    };
    menuOpen(
      "Pro Plans",
      "Choose a Movie Creator plan and continue securely with Paystack.",
      '<div class="menu-grid">'+
        card("3 Day Creator","₦13,000 · 10 credits · 3 days","pro:threeDays")+
        card("Weekly Creator","₦26,000 · 22 credits · 7 days","pro:weekly")+
        card("Monthly Creator","₦90,000 · 70 credits · 30 days","pro:monthly")+
      '</div><div id="menuActionStatus" class="status"></div>'
    );
    document.getElementById("menuWorkspace")?.scrollIntoView({behavior:"smooth",block:"start"});
  };

  let lastTap=0;
  const handle=e=>{
    const now=Date.now();
    if(now-lastTap<350)return;
    lastTap=now;
    if(e.cancelable)e.preventDefault();
    e.stopPropagation();
    openProPlans();
  };
  profile.addEventListener("pointerup",handle,{passive:false});
  profile.addEventListener("click",e=>{if(e.detail===0)handle(e)},{passive:false});
  profile.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){
      e.preventDefault();
      openProPlans();
    }
  });
});