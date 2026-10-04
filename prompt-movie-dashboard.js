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
        composer?.classList.remove("pm-loading");
        q("#pmResult")?.classList.add("ready");
        
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

  async function autoGenerateMovie(resumeProductionId=null,resumeProduction=null){
    let blueprint=null;
    try{blueprint=JSON.parse(localStorage.getItem("obitrend_movie_blueprint")||"null")}catch{}
    if(!blueprint?.scenes?.length){
      status.textContent="Movie blueprint is ready.";
      generate.disabled=false;
      return;
    }

    const shots=blueprint.scenes.flatMap((scene,si)=>
      (scene.shots||[]).map((shot,hi)=>({si,hi,shot}))
    );
    if(!shots.length){
      status.className="pm-status error";
      status.textContent="The movie blueprint contains no playable shots.";
      generate.disabled=false;
      return;
    }

    const oneMinute=Number(q("#length")?.value||1)===1;
    const requestedSegments=oneMinute?2:Math.min(shots.length,2);
    let productionId=resumeProductionId||"";
    let production=resumeProduction||null;

    try{
      await refreshMovieEntitlement();

      if(!productionId){
        productionId=await createMovieProduction(blueprint,requestedSegments);
        production=await getMovieProduction(productionId);
      }else if(!production){
        production=await getMovieProduction(productionId);
      }

      if(!production){
        throw new Error("The saved movie production could not be found.");
      }

      const targetCount=Math.min(
        shots.length,
        Number(production.total_segments||requestedSegments)
      );
      const savedUrls=Array.isArray(production.video_urls)?production.video_urls:[];
      const results=[];
      let generatedNow=0;

      for(let i=0;i<targetCount;i++){
        const item=shots[i];
        const savedUrl=String(savedUrls[i]||"").trim();

        if(savedUrl){
          results.push({scene:item.si,shot:item.hi,url:savedUrl});
          continue;
        }

        await refreshMovieEntitlement();
        if(getMovieCredits()<=0){
          await setMovieProductionStatus(productionId,"paused").catch(()=>{});
          status.className="pm-status";
          status.textContent="Movie paused — your movie credits are finished. Purchase more credits and OBITREND will continue this same movie from the next unfinished scene.";
          loadRecent();
          return;
        }

        status.className="pm-status";
        status.textContent=(oneMinute?"Producing 1-minute movie — scene ":"Generating 30-second movie scene ")+(i+1)+" of "+targetCount+"…";

        try{
          if(typeof window.openShot!=="function"||typeof window.generateShot!=="function"){
            throw new Error("The cinematic generation engine is unavailable.");
          }

          await setMovieProductionStatus(productionId,"generating").catch(()=>{});
          window.openShot(item.si,item.hi);
          await window.generateShot();

          const shotStatus=(document.getElementById("shotStatus")?.textContent||"").trim();
          const video=document.getElementById("shotVideo");
          if(!video?.src||/failed|unavailable|could not|no movie credits|taking longer/i.test(shotStatus)){
            throw new Error(shotStatus||"This movie scene could not be generated.");
          }

          const url=video.src;
          await saveMovieProductionSegment(productionId,i,url);
          results.push({scene:item.si,shot:item.hi,url});
          generatedNow++;
          savedUrls[i]=url;
          try{localStorage.setItem("obitrend_auto_movie_videos",JSON.stringify(results))}catch(_){}

          await refreshMovieEntitlement();

          if(i<targetCount-1 && getMovieCredits()<=0){
            await setMovieProductionStatus(productionId,"paused").catch(()=>{});
            status.className="pm-status";
            status.textContent="Movie paused after scene "+(i+1)+" of "+targetCount+". Your credits are finished. Purchase more credits to continue from scene "+(i+2)+".";
            loadRecent();
            return;
          }
        }catch(error){
          await setMovieProductionStatus(productionId,"paused").catch(()=>{});
          status.className="pm-status error";
          status.textContent=error?.message||"Movie generation stopped. Your completed scenes are saved.";
          return;
        }
      }

      await setMovieProductionStatus(productionId,"completed").catch(()=>{});
      await refreshMovieEntitlement();

      if(oneMinute && results.length===2 && typeof saveHistory==="function"){
        try{
          saveHistory(blueprint,results[0]?.url||"",null,results.map(v=>v.url));
          loadRecent();
        }catch(_){}
      }

      try{localStorage.setItem("obitrend_auto_movie_videos",JSON.stringify(results))}catch(_){}
      localStorage.removeItem("obitrend_movie_active_production_id");

      const remaining=getMovieCredits();
      status.className="pm-status";
      status.textContent=oneMinute
        ?"Your 1-minute movie is complete. Both 30-second scenes are saved together under one titled movie."
        :"Your movie production is complete.";
      loadRecent();
    }catch(error){
      status.className="pm-status error";
      status.textContent=error?.message||"Movie generation stopped. Your completed scenes are saved.";
    }finally{
      composer?.classList.remove("pm-loading");
      generate.disabled=false;
    }
  }

  window.resumeMovieProduction=async function(productionId,production){
    if(!productionId)return false;
    try{
      const saved=production||await getMovieProduction(productionId);
      if(!saved)return false;
      if(saved.status==="completed"||Number(saved.completed_segments)>=Number(saved.total_segments)){
        localStorage.removeItem("obitrend_movie_active_production_id");
        return false;
      }
      await autoGenerateMovie(productionId,saved);
      return true;
    }catch(error){
      status.className="pm-status error";
      status.textContent=error?.message||"Could not continue the unfinished movie.";
      return false;
    }
  };

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
    recent.innerHTML='<div class="pm-empty pm-demo-empty">No movies yet<br><button class="pm-player-cta" type="button" id="pmFirstMovieCta">Generate your first movie →</button></div>';
    recent.querySelector("#pmFirstMovieCta")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  }

  function closePlayerModal(){
    const m=document.getElementById("pmPlayerBackdrop");
    if(m)m.remove();
    document.body.style.overflow="";
  }
  function openPlayerModal(item, poster, title){
    closePlayerModal();
    let videos=[];try{videos=JSON.parse(localStorage.getItem("obitrend_auto_movie_videos")||"[]")}catch{}
    const playlist=Array.isArray(item?.videoUrls)&&item.videoUrls.length?item.videoUrls:(Array.isArray(videos)?videos.map(v=>v?.url).filter(Boolean):[]);
    const firstVideo=playlist.length?playlist[0]:null;
    const backdrop=document.createElement("div");
    backdrop.id="pmPlayerBackdrop";backdrop.className="pm-player-backdrop";
    backdrop.innerHTML='<div class="pm-player-modal" role="dialog" aria-modal="true" aria-label="Movie player">'+
      '<div class="pm-player-head"><strong>'+String(title||"OBITREND Movie").replace(/[&<>]/g,"")+'</strong><button class="pm-player-close" type="button" aria-label="Close player">×</button></div>'+
      (firstVideo?'<video class="pm-player-video" controls autoplay playsinline src="'+firstVideo.replace(/"/g,"&quot;")+'"></video>':
      '<img class="pm-player-poster" alt="" src="'+poster.replace(/"/g,"&quot;")+'"><div class="pm-player-note">Your cinematic movie player is ready. Generate the first shot to render the video.</div>'+
      '<button class="pm-player-cta" type="button">Use this story</button>')+
      '</div>';
    document.body.appendChild(backdrop);document.body.style.overflow="hidden";
    const player=backdrop.querySelector(".pm-player-video");
    if(player&&playlist.length>1){
      let index=0;
      player.addEventListener("ended",()=>{
        index++;
        if(index<playlist.length){
          player.src=playlist[index];
          player.play().catch(()=>{});
        }
      });
    }
    backdrop.querySelector(".pm-player-close")?.addEventListener("click",closePlayerModal);
    backdrop.addEventListener("click",e=>{if(e.target===backdrop)closePlayerModal()});
    backdrop.querySelector(".pm-player-cta")?.addEventListener("click",()=>{closePlayerModal();fillPrompt(item?.prompt||item?.blueprint?.logline||title||"");});
  }
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closePlayerModal()});

  function loadRecent(){
    let history=[];try{history=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]")}catch{}
    history=Array.isArray(history)?history.filter(x=>x&&x.generated===true&&x.videoUrl):[];
    if(!history.length){renderDemos();return}
    recent.innerHTML=history.slice(0,3).map((x,i)=>{
      const b=x?.blueprint||{};
      const title=String(x.title||b.title||"Untitled Movie").replace(/[&<>]/g,"");
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
        if(action==="home"){
          window.scrollTo({top:0,behavior:"smooth"});
        }else if(action==="create"){
          document.getElementById("create")?.scrollIntoView({behavior:"smooth",block:"start"});
          prompt?.focus();
        }else if(action==="creations"){
          document.getElementById("movies")?.scrollIntoView({behavior:"smooth",block:"start"});
        }else if(action==="pro"){
          window.location.assign("/pricing");
        }else if(action==="settings"){
          window.location.assign("/settings");
        }
      }));
      document.addEventListener("click",e=>{
        if(!menuOpenState)return;
        if(e.target.closest("#pmDrawer")||e.target.closest("#pmMenuBtn"))return;
        closeDrawer();
      });
      iconRefresh();
    }
    menuOpenState=!menuOpenState;
    drawer.classList.toggle("open",menuOpenState);
    drawer.setAttribute("aria-hidden",String(!menuOpenState));
  }
  const engineFocusPrompt=()=>{
    q(".pm-composer")?.scrollIntoView({behavior:"smooth",block:"center"});
    window.setTimeout(()=>prompt?.focus(),300);
  };
  q("#pmEngineCamera")?.addEventListener("click",engineFocusPrompt);
  q("#pmEngineFilm")?.addEventListener("click",()=>{
    if(prompt?.value.trim()) generate?.click();
    else engineFocusPrompt();
  });
  q("#pmEngineClapper")?.addEventListener("click",()=>{
    q(".pm-recent")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
  q("#pmEngineVideo")?.addEventListener("click",()=>{
    const studio=q("#shotStudio");
    if(studio&&!studio.classList.contains("hidden")){
      studio.scrollIntoView({behavior:"smooth",block:"start"});
      q("#generateShotBtn")?.focus();
      return;
    }
    q("#pmResult")?.scrollIntoView({behavior:"smooth",block:"start"});
    status.textContent="Build your movie first. OBITREND will then open the video Shot Studio for generation.";
  });

  q("#pmMenuBtn")?.addEventListener("click",openDrawer);
  q("#pmCreatorBtn")?.addEventListener("click",()=>{if(typeof openMenu==="function")openMenu("pro")});
  q("#pmProfileBtn")?.addEventListener("click",()=>{if(typeof openMenu==="function")openMenu("settings")});

  loadRecent();
  window.addEventListener("beforeunload",()=>observers.forEach(o=>o?.disconnect()));
})();