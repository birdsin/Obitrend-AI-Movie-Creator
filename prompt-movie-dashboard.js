(()=>{ 
  const q=s=>document.querySelector(s);
  document.body.classList.add("pm-mode");
  const startup=q("#obitrendStartup");
  window.setTimeout(()=>startup?.classList.add("hide"),1700);

  const prompt=q("#pmPrompt"), enginePrompt=q("#moviePrompt"), generate=q("#pmGenerate"), engineBuild=q("#buildBtn"), status=q("#pmStatus");
  const examples=[...document.querySelectorAll(".pm-example")];
  examples.forEach(b=>b.addEventListener("click",()=>{prompt.value=b.dataset.prompt||"";prompt.focus()}));

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
  function loadRecent(){
    let history=[];try{history=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]")}catch{}
    if(!Array.isArray(history)||!history.length)return;
    recent.innerHTML=history.slice(0,3).map((x,i)=>{
      const b=x?.blueprint||{};return '<button class="pm-project" type="button"><div class="pm-project-art">MOVIE '+(i+1)+'</div><b>'+String(b.title||"Untitled Movie").replace(/[&<>]/g,"")+'</b><span>'+String(b.genre||"Cinematic")+' · '+String(b.length||15)+' min</span></button>'
    }).join("");
  }
  loadRecent();
  window.addEventListener("beforeunload",()=>observers.forEach(o=>o?.disconnect()));
})();