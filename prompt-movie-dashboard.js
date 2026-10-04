(()=>{ 
  const q=s=>document.querySelector(s);
  document.body.classList.add("pm-mode");
  const startup=q("#obitrendStartup");
  window.setTimeout(()=>startup?.classList.add("hide"),1700);

  const prompt=q("#pmPrompt"), enginePrompt=q("#moviePrompt"), generate=q("#pmGenerate"), engineBuild=q("#buildBtn"), status=q("#pmStatus"), composer=q(".pm-composer");
  const iconRefresh=()=>window.lucide?.createIcons?.();
  iconRefresh();

  // Cinematic atmosphere: lightweight floating gold particles.
  const hero=q(".pm-hero");
  if(hero && !hero.querySelector(".pm-dust")){
    for(let i=0;i<18;i++){
      const dust=document.createElement("i");
      dust.className="pm-dust";
      dust.style.left=(8+Math.random()*84).toFixed(1)+"%";
      dust.style.top=(28+Math.random()*58).toFixed(1)+"%";
      dust.style.setProperty("--dust-duration",(5.5+Math.random()*5).toFixed(1)+"s");
      dust.style.animationDelay=(-Math.random()*7).toFixed(1)+"s";
      hero.appendChild(dust);
    }
  }

  const examples=[...document.querySelectorAll(".pm-example")];
  examples.forEach(b=>b.addEventListener("click",()=>{
    prompt.value=b.dataset.prompt||"";
    if(enginePrompt)enginePrompt.value=prompt.value;
    prompt.dispatchEvent(new Event("input",{bubbles:true}));
    prompt.focus();
  }));
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

  function showEmptyPromptError(){
    status.textContent="Describe your movie first";
    status.className="pm-status error";
    q(".pm-prompt-wrap")?.classList.add("pm-invalid");
    generate?.classList.remove("pm-shake");
    void generate?.offsetWidth;
    generate?.classList.add("pm-shake");
    prompt?.focus();
    window.setTimeout(()=>q(".pm-prompt-wrap")?.classList.remove("pm-invalid"),900);
  }

  generate?.addEventListener("click",()=>{
    const value=prompt.value.trim();
    if(!value){showEmptyPromptError();return}
    setAutoDefaults();
    status.className="pm-status";status.textContent="AI is turning your prompt into a complete cinematic blueprint…";
    generate.disabled=true;
    composer?.classList.add("pm-loading");
    engineBuild?.click();
    const started=Date.now();
    const timer=setInterval(()=>{
      const source=document.getElementById("status")?.textContent||"";
      if(/Blueprint ready\./i.test(source)){
        clearInterval(timer);
        status.textContent="Movie blueprint ready. AI selected the story structure, characters, scenes, camera, lighting and sound automatically.";
        generate.disabled=false;
        composer?.classList.remove("pm-loading");
        q("#pmResult")?.classList.add("ready");
        try{if(typeof saveHistory==="function"&&state?.blueprint)saveHistory(state.blueprint)}catch(_){}
        loadRecent();
        autoGenerateMovie();
        q("#pmResultTitle")&&(q("#pmResultTitle").textContent=document.getElementById("movieTitle")?.textContent||"Your movie");
        return;
      }
      if(Date.now()-started>90000){clearInterval(timer);generate.disabled=false;composer?.classList.remove("pm-loading");status.textContent=source||"Movie generation is taking longer than expected.";status.className="pm-status error"}
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

  window.showGeneratedBlueprint=window.showGeneratedBlueprint||function(){};
  try{showGeneratedBlueprint=function(){};}catch{}

  const recent=q("#pmProjects");
  const posterImages=[
    "https://images.unsplash.com/photo-1740741704998-8074200ce5d6?auto=format&fit=crop&fm=jpg&q=86&w=1000",
    "https://images.unsplash.com/photo-1649502913092-fb7f0e8fc632?auto=format&fit=crop&fm=jpg&q=86&w=1000",
    "https://images.unsplash.com/photo-1709854361252-813cfb80c9c0?auto=format&fit=crop&fm=jpg&q=86&w=1000"
  ];
  const demoMovies=[
    {title:"The Hotel Heiress",genre:"African Family Drama",length:"15",image:posterImages[0],prompt:"A powerful African family drama about a young woman who inherits a luxury hotel in Lagos after her father's death and must save the family business from a hidden betrayal. Cinematic realism, emotional, elegant and inspiring."},
    {title:"Lagos Nights",genre:"Crime Thriller",length:"15",image:posterImages[1],prompt:"A dark Lagos crime thriller about an honest detective who discovers a dangerous conspiracy moving through the city's nightlife. Realistic, tense, cinematic and suspenseful."},
    {title:"Love in Port Harcourt",genre:"Romantic Drama",length:"15",image:posterImages[2],prompt:"A beautiful romantic drama about two strangers who meet in Port Harcourt and slowly fall in love while their families and careers pull them in different directions. Warm cinematic realism, emotional and uplifting."}
  ];

  function fillPrompt(value){
    if(!prompt)return;
    prompt.value=value||"";
    if(enginePrompt)enginePrompt.value=prompt.value;
    prompt.dispatchEvent(new Event("input",{bubbles:true}));
    status.className="pm-status";
    status.textContent="Demo story loaded. Edit the idea or generate it as your own movie.";
    q(".pm-prompt-wrap")?.classList.remove("pm-invalid");
    q(".pm-composer")?.scrollIntoView({behavior:"smooth",block:"center"});
    window.setTimeout(()=>prompt.focus(),350);
  }

  function renderDemos(){
    if(!recent)return;
    recent.innerHTML='<div class="pm-empty pm-demo-empty">No movies yet<br><button class="pm-player-cta" type="button" id="pmFirstMovieCta">Generate your first movie →</button></div><div class="pm-demo-grid">'+demoMovies.map((m,i)=>
      '<button class="pm-project pm-demo" type="button" data-demo-index="'+i+'">'+
        '<div class="pm-project-art pm-demo-art" style="background-image:url('+m.image+')">'+
          '<span class="pm-genre">'+m.genre+'</span><span class="pm-badge">'+m.length+' min</span>'+
          '<span class="pm-play"><i data-lucide="play"></i></span><span class="pm-demo-label">DEMO MOVIE</span>'+
          '<span class="pm-poster-title">'+m.title+'</span>'+
        '</div><div class="pm-demo-copy"><b>'+m.title+'</b><span>'+m.genre+' · Tap to use this story</span></div>'+
      '</button>'
    ).join("")+'</div>';
    recent.querySelector("#pmFirstMovieCta")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
    recent.querySelectorAll("[data-demo-index]").forEach(card=>card.addEventListener("click",()=>fillPrompt(demoMovies[Number(card.dataset.demoIndex)]?.prompt)));
    recent.querySelectorAll(".pm-demo .pm-play").forEach(play=>play.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();
      const card=play.closest(".pm-demo"), demo=demoMovies[Number(card?.dataset.demoIndex)];
      openPlayerModal(demo,demo?.image,demo?.title);
    }));
    iconRefresh();
  }

  function closePlayerModal(){
    const m=document.getElementById("pmPlayerBackdrop");
    if(m)m.remove();
    document.body.style.overflow="";
  }
  function openPlayerModal(item, poster, title){
    closePlayerModal();
    let videos=[];try{videos=JSON.parse(localStorage.getItem("obitrend_auto_movie_videos")||"[]")}catch{}
    const firstVideo=Array.isArray(videos)&&videos.length?videos[0]?.url:null;
    const backdrop=document.createElement("div");
    backdrop.id="pmPlayerBackdrop";backdrop.className="pm-player-backdrop";
    backdrop.innerHTML='<div class="pm-player-modal" role="dialog" aria-modal="true" aria-label="Movie player">'+
      '<div class="pm-player-head"><strong>'+String(title||"OBITREND Movie").replace(/[&<>]/g,"")+'</strong><button class="pm-player-close" type="button" aria-label="Close player">×</button></div>'+
      (firstVideo?'<video class="pm-player-video" controls autoplay playsinline src="'+firstVideo.replace(/"/g,"&quot;")+'"></video>':
      '<img class="pm-player-poster" alt="" src="'+poster.replace(/"/g,"&quot;")+'"><div class="pm-player-note">Your cinematic movie player is ready. Generate the first shot to render the video.</div>'+
      '<button class="pm-player-cta" type="button">Use this story</button>')+
      '</div>';
    document.body.appendChild(backdrop);document.body.style.overflow="hidden";
    backdrop.querySelector(".pm-player-close")?.addEventListener("click",closePlayerModal);
    backdrop.addEventListener("click",e=>{if(e.target===backdrop)closePlayerModal()});
    backdrop.querySelector(".pm-player-cta")?.addEventListener("click",()=>{closePlayerModal();fillPrompt(item?.prompt||item?.blueprint?.logline||title||"");});
  }
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closePlayerModal()});

  function loadRecent(){
    let history=[];try{history=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]")}catch{}
    if(!Array.isArray(history)||!history.length){renderDemos();return}
    recent.innerHTML=history.slice(0,3).map((x,i)=>{
      const b=x?.blueprint||{};
      const title=String(b.title||x.title||"Untitled Movie").replace(/[&<>]/g,"");
      const genre=String(b.genre||x.genre||"Cinematic").replace(/[&<>]/g,"");
      const length=String(b.length||x.length||15).replace(/[&<>]/g,"");
      const image=posterImages[i%posterImages.length];
      return '<button class="pm-project" type="button" data-movie-index="'+i+'"><div class="pm-project-art" style="background-image:url('+image+')"><span class="pm-genre">'+genre+'</span><span class="pm-badge">'+length+' min</span><span class="pm-play"><i data-lucide="play"></i></span><span class="pm-poster-title">'+title+'</span></div><b>'+title+'</b><span>'+genre+' · '+length+' min</span></button>';
    }).join("");
    recent.querySelectorAll(".pm-project").forEach((card,i)=>card.addEventListener("click",()=>{
      const item=history[i];
      if(item?.blueprint){
        try{localStorage.setItem("obitrend_movie_blueprint",JSON.stringify(item.blueprint));state.blueprint=item.blueprint}catch(_){}
        fillPrompt(item.prompt||item.blueprint.logline||item.blueprint.title||"");
        status.textContent="Movie loaded from your recent creations.";
      }
    }));
    recent.querySelectorAll(".pm-play").forEach((play,i)=>play.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();
      let history=[];try{history=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]")}catch{}
      const item=history[i]||null;
      const title=item?.blueprint?.title||item?.title||"OBITREND Movie";
      openPlayerModal(item,posterImages[i%posterImages.length],title);
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

  loadRecent();
  window.addEventListener("beforeunload",()=>observers.forEach(o=>o?.disconnect()));
})();