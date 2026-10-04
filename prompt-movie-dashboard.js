(()=>{ 
  const q=s=>document.querySelector(s);
  document.body.classList.add("pm-mode");
  const startup=q("#obitrendStartup");
  window.setTimeout(()=>startup?.classList.add("hide"),1700);

  const prompt=q("#pmPrompt"), enginePrompt=q("#moviePrompt"), generate=q("#pmGenerate"), engineBuild=q("#buildBtn"), status=q("#pmStatus");
  const iconRefresh=()=>window.lucide?.createIcons?.();
  iconRefresh();
  const examples=[...document.querySelectorAll(".pm-example")];
  examples.forEach(b=>b.addEventListener("click",()=>{prompt.value=b.dataset.prompt||"";if(enginePrompt)enginePrompt.value=prompt.value;prompt.dispatchEvent(new Event("input",{bubbles:true}));prompt.focus()}));
  prompt?.addEventListener("input",()=>{if(enginePrompt)enginePrompt.value=prompt.value;});

  function mirrorStatus(){
    const a=q("#status"), b=q("#assemblyStatus"), c=q("#shotStatus");
    const source=[a,b,c].find(x=>x&&x.textContent.trim());
    if(source&&source.textContent.trim()!=="Blueprint ready.") status.textContent=source.textContent;
  }
  const observers=["status","assemblyStatus","shotStatus"].map(id=>{
    const el=document.getElementById(id); if(!el)return null;
    const o=new MutationObserver(mirrorStatus);o.observe(el,{childList:true,subtree:true,characterData:true});return o;
  });

  function setAutoDefaults(){
    if(enginePrompt)enginePrompt.value=prompt.value.trim();
    const values={length:"15",genre:"Drama",visualStyle:"Cinematic realism",ratio:"16:9"};
    Object.entries(values).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v});
  }

  generate?.addEventListener("click",()=>{
    const value=prompt.value.trim();
    if(!value){status.textContent="Write your movie idea first.";status.className="pm-status error";prompt.focus();return}
    setAutoDefaults();
    status.className="pm-status";status.textContent="AI is turning your prompt into a complete cinematic blueprint…";
    generate.disabled=true;
    engineBuild?.click();
    const started=Date.now();
    const timer=setInterval(()=>{
      const blueprintReady=!!(document.getElementById("movieTitle")?.textContent&&document.getElementById("movieTitle").textContent!=="Your Movie");
      const source=document.getElementById("status")?.textContent||"";
      if(blueprintReady||/Blueprint ready\./i.test(source)){
        clearInterval(timer);
        status.textContent="Movie blueprint ready. AI selected the story structure, characters, scenes, camera, lighting and sound automatically.";
        generate.disabled=false;
        q("#pmResult")?.classList.add("ready");
        try{if(typeof saveHistory==="function"&&state?.blueprint)saveHistory(state.blueprint)}catch(_){}
        loadRecent();
        autoGenerateMovie();
        q("#pmResultTitle")&&(q("#pmResultTitle").textContent=document.getElementById("movieTitle")?.textContent||"Your movie");
        return;
      }
      if(Date.now()-started>90000){clearInterval(timer);generate.disabled=false;status.textContent=source||"Movie generation is taking longer than expected.";status.className="pm-status error"}
      mirrorStatus();
    },500);
  });

  prompt?.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();generate?.click()}});

  async function autoGenerateMovie(){
    let blueprint=null;
    try{blueprint=JSON.parse(localStorage.getItem("obitrend_movie_blueprint")||"null")}catch{}
    if(!blueprint?.scenes?.length){status.textContent="Movie blueprint is ready.";return}
    const shots=blueprint.scenes.flatMap((scene,si)=>(scene.shots||[]).map((shot,hi)=>({si,hi,shot})));
    if(!shots.length){status.textContent="Movie blueprint is ready, but it contains no shots.";return}
    const results=[];
    for(let i=0;i<shots.length;i++){
      const item=shots[i];
      status.className="pm-status";
      status.textContent="Generating movie shot "+(i+1)+" of "+shots.length+" automatically…";
      try{
        if(typeof window.openShot!=="function"||typeof window.generateShot!=="function")throw new Error("The cinematic generation engine is unavailable.");
        window.openShot(item.si,item.hi);
        await window.generateShot();
        const shotStatus=(document.getElementById("shotStatus")?.textContent||"").trim();
        const video=document.getElementById("shotVideo");
        if(!video?.src||/failed|unavailable|could not|no movie credits|taking longer/i.test(shotStatus)){
          throw new Error(shotStatus||"This shot could not be generated.");
        }
        results.push({scene:item.si,shot:item.hi,url:video.src});
        try{localStorage.setItem("obitrend_auto_movie_videos",JSON.stringify(results))}catch{}
      }catch(error){
        status.className="pm-status error";
        status.textContent=error?.message||"Movie generation stopped.";
        return;
      }
    }
    status.className="pm-status";
    status.textContent="Your movie shots are ready. OBITREND generated the cinematic sequence automatically from your prompt.";
  }

  // The new dashboard is the visible home. Keep the existing movie engine hidden and intact.
  window.showGeneratedBlueprint=window.showGeneratedBlueprint||function(){};
  try{showGeneratedBlueprint=function(){};}catch{}
  const recent=q("#pmProjects");
  const posterImages=[
    "https://images.unsplash.com/photo-1723221890385-6949a72be9da?auto=format&fit=crop&fm=jpg&q=85&w=900",
    "https://images.unsplash.com/photo-1542995719-06bfa52c0e11?auto=format&fit=crop&fm=jpg&q=85&w=900",
    "https://images.unsplash.com/photo-1750768132075-1e0a93963ac9?auto=format&fit=crop&fm=jpg&q=85&w=900"
  ];
  function loadRecent(){
    let history=[];try{history=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]")}catch{}
    if(!Array.isArray(history)||!history.length){
      recent.innerHTML='<div class="pm-empty">No movies yet</div>';
      return;
    }
    recent.innerHTML=history.slice(0,3).map((x,i)=>{
      const b=x?.blueprint||{};
      const title=String(b.title||x.title||"Untitled Movie").replace(/[&<>]/g,"");
      const genre=String(b.genre||x.genre||"Cinematic").replace(/[&<>]/g,"");
      const length=String(b.length||x.length||15).replace(/[&<>]/g,"");
      const image=posterImages[i%posterImages.length];
      return '<button class="pm-project" type="button" data-movie-index="'+i+'"><div class="pm-project-art" style="background-image:url("'+image+'")"><span class="pm-genre">'+genre+'</span><span class="pm-badge">'+length+' min</span><span class="pm-play"><i data-lucide="play"></i></span><span class="pm-poster-title">'+title+'</span></div><b>'+title+'</b><span>'+genre+' · '+length+' min</span></button>';
    }).join("");
    recent.querySelectorAll(".pm-project").forEach((card,i)=>card.addEventListener("click",()=>{
      const item=history[i];
      if(item?.blueprint){
        try{localStorage.setItem("obitrend_movie_blueprint",JSON.stringify(item.blueprint));state.blueprint=item.blueprint}catch(_){}
        prompt.value=item.prompt||item.blueprint.logline||item.blueprint.title||"";
        if(enginePrompt)enginePrompt.value=prompt.value;
        status.className="pm-status";
        status.textContent="Movie loaded from your recent creations.";
      }
    }));
    iconRefresh();
  }
  let menuOpenState=false;
  let drawer=q("#pmDrawer");
  function closeDrawer(){
    menuOpenState=false;
    drawer?.classList.remove("open");
    drawer?.setAttribute("aria-hidden","true");
  }
  function openDrawer(){
    if(!drawer){
      drawer=document.createElement("aside");
      drawer.id="pmDrawer";
      drawer.className="pm-drawer";
      drawer.setAttribute("aria-hidden","true");
      drawer.innerHTML='<div class="pm-drawer-head"><strong>OBITREND</strong><button type="button" id="pmDrawerClose" aria-label="Close menu">×</button></div>'+
        '<button type="button" data-pm-nav="home"><i data-lucide="home"></i> Home</button>'+
        '<button type="button" data-pm-nav="create"><i data-lucide="film"></i> Create Movie</button>'+
        '<button type="button" data-pm-nav="creations"><i data-lucide="clapperboard"></i> My Movies</button>'+
        '<button type="button" data-pm-nav="pro"><i data-lucide="crown"></i> Pro Plans</button>'+
        '<button type="button" data-pm-nav="settings"><i data-lucide="settings"></i> Settings</button>';
      document.body.appendChild(drawer);
      drawer.querySelector("#pmDrawerClose")?.addEventListener("click",closeDrawer);
      drawer.querySelectorAll("[data-pm-nav]").forEach(btn=>btn.addEventListener("click",()=>{
        const action=btn.dataset.pmNav;
        closeDrawer();
        if(action==="home")window.scrollTo({top:0,behavior:"smooth"});
        else if(action==="create"){prompt?.focus();q(".pm-composer")?.scrollIntoView({behavior:"smooth",block:"center"});}
        else if(action==="creations"||action==="pro"||action==="settings"){if(typeof openMenu==="function")openMenu(action==="creations"?"creations":action);}
      }));
      iconRefresh();
    }
    menuOpenState=!menuOpenState;
    drawer.classList.toggle("open",menuOpenState);
    drawer.setAttribute("aria-hidden",String(!menuOpenState));
  }
  q("#pmMenuBtn")?.addEventListener("click",openDrawer);
  q("#pmCreatorBtn")?.addEventListener("click",()=>{if(typeof openMenu==="function")openMenu("pro")});
  q("#pmProfileBtn")?.addEventListener("click",()=>{if(typeof openMenu==="function")openMenu("settings")});
  window.addEventListener("beforeunload",()=>observers.forEach(o=>o?.disconnect()));
})();