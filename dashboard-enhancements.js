(()=>{ 
  const installKey="obitrend_pwa_install_dismissed";
  let deferredPrompt=null;
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;renderInstallCard();});
  window.addEventListener("appinstalled",()=>{deferredPrompt=null;document.querySelector(".obitrend-install-card")?.remove();});
  function renderInstallCard(){
    const root=document.querySelector(".android-movie-dashboard");
    if(!root||document.querySelector(".obitrend-install-card")||localStorage.getItem(installKey)==="1")return;
    const card=document.createElement("section");
    card.className="obitrend-install-card";
    card.innerHTML='<div><strong>📲 Make OBITREND feel like an app</strong><span>Install OBITREND on your phone for faster access from your home screen. Your existing account and movie workflow stay the same.</span></div><div class="obitrend-install-actions"><button class="obitrend-install-btn" type="button">Install App</button><button class="obitrend-install-close" type="button">Not now</button></div>';
    const hero=root.querySelector(".android-hero");
    (hero?.parentNode||root).insertBefore(card,hero?.nextSibling||root.firstChild);
    card.querySelector(".obitrend-install-btn").onclick=async()=>{
      if(!deferredPrompt)return;
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice}catch{}
      deferredPrompt=null;card.remove();
    };
    card.querySelector(".obitrend-install-close").onclick=()=>{localStorage.setItem(installKey,"1");card.remove();};
  }
  function refreshProjects(){
    try{
      const history=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]");
      if(!Array.isArray(history)||!history.length)return;
      const buttons=[...document.querySelectorAll(".android-projects button")];
      history.slice(0,3).forEach((item,i)=>{
        const b=buttons[i];if(!b)return;
        const title=item?.blueprint?.title||"Untitled Movie";
        const genre=item?.blueprint?.genre||"Movie";
        const length=item?.blueprint?.length?item.blueprint.length+" min":"Draft";
        const labels=b.querySelectorAll("b,span");
        if(labels[0])labels[0].textContent=title;
        if(labels[1])labels[1].textContent=genre+" · "+length;
      });
    }catch{}
  }
  function loadMovieModes(){
    if(document.getElementById("obitrendMovieModesScript"))return;
    const s=document.createElement("script");
    s.id="obitrendMovieModesScript";
    s.src="/movie-modes.js?v=20261005-1";
    s.defer=true;
    document.body.appendChild(s);
  }
  function boot(){
    refreshProjects();
    loadMovieModes();
    if(window.matchMedia("(display-mode: standalone)").matches)return;
    if(deferredPrompt)renderInstallCard();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
})();