const state={blueprint:null,sceneIndex:0,shotIndex:0};
try{const saved=localStorage.getItem("obitrend_movie_blueprint");if(saved)state.blueprint=JSON.parse(saved)}catch(e){}
const demoBlueprint={title:"The Rejected Boy",logline:"A young Nigerian boy with big dreams faces rejection from his family and community, but never gives up. Through hard work, faith and determination, he rises from being looked down on to becoming successful.",genre:"Drama",length:15,visualStyle:"Cinematic realism",visualBible:{},characters:[{name:"Chinedu",role:"Main Character",appearance:"Young, determined, kind",wardrobe:"Simple everyday clothing"},{name:"Mr. Okafor",role:"Father",appearance:"Strict, hardworking",wardrobe:"Simple work clothes"},{name:"Ngozi",role:"Mother",appearance:"Supportive, loving",wardrobe:"Traditional Nigerian clothing"},{name:"Emeka",role:"Rival",appearance:"Arrogant, jealous",wardrobe:"Modern casual clothing"}],scenes:[{heading:"The Rejection",location:"Village / Family House",duration:"2:00",shots:[{framing:"Close-up",angle:"Eye-level",camera:"Full-frame cinema camera",lens:"50mm",movement:"Slow push-in",focus:"Chinedu",lighting:"Natural daylight",sound:"Village ambience",continuity:"Chinedu leaves home"} ,{framing:"Medium shot",angle:"Slight high",camera:"Full-frame cinema camera",lens:"35mm",movement:"Static",focus:"Family",lighting:"Natural daylight",sound:"Family dialogue",continuity:"Family rejects Chinedu"}]},{heading:"The Dream",location:"City Street",duration:"2:00",shots:[{framing:"Medium shot",angle:"Tracking",camera:"Full-frame cinema camera",lens:"35mm",movement:"Tracking",focus:"Chinedu",lighting:"Warm city light",sound:"Traffic and footsteps",continuity:"Chinedu walks toward the city"},{framing:"Close-up",angle:"Eye-level",camera:"Full-frame cinema camera",lens:"50mm",movement:"Slow push-in",focus:"Chinedu",lighting:"Library practicals",sound:"Quiet study ambience",continuity:"Chinedu studies late"}]}]};
if(!state.blueprint)state.blueprint=demoBlueprint;const $=id=>document.getElementById(id);
function status(id,msg,error){const e=$(id);e.textContent=msg;e.className="status"+(error?" error":"")}
$("buildBtn").onclick=async()=>{const prompt=$("moviePrompt").value.trim();if(!prompt){status("status","Enter your movie idea first.",true);return}const b=$("buildBtn");b.disabled=true;status("status","Building your cinematic blueprint…");try{const r=await fetch("/api/plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,length:Number($("length").value),genre:$("genre").value,visualStyle:$("visualStyle").value,ratio:$("ratio").value})});const text=await r.text();let d={};try{d=JSON.parse(text)}catch{}if(!r.ok)throw new Error(d.error||"Movie planning service is temporarily unavailable. Please try again.");state.blueprint=d.blueprint;try{localStorage.setItem("obitrend_movie_blueprint",JSON.stringify(d.blueprint))}catch(e){}renderBlueprint(d.blueprint);status("status","Blueprint ready.")}catch(e){status("status",e.message,true)}finally{b.disabled=false}};
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
const CHARACTER_IMAGES=[
  "https://images.unsplash.com/photo-1723221890385-6949a72be9da?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  "https://images.unsplash.com/photo-1542995719-06bfa52c0e11?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  "https://d1jcea4y7xhp7l.cloudfront.net/wp-content/uploads/2024/03/IMG-20240327-WA0077.jpg",
  "https://images.unsplash.com/photo-1750768132075-1e0a93963ac9?auto=format&fit=crop&fm=jpg&q=80&w=1200"
];
function renderBlueprint(b){
  $("movieTitle").textContent=b.title||"Untitled Movie";
  $("movieLogline").textContent=b.logline||"";
  $("movieMeta").innerHTML=[b.genre,b.length?b.length+" minutes":null,b.visualStyle||"Cinematic realism",$("ratio")&&$("ratio").value].filter(Boolean).map(x=>"<span>"+esc(x)+"</span>").join("");
  const chars=b.characters||[];
  $("characters").innerHTML=chars.map((c,ci)=>{
    return "<div class=\"character\" data-character=\""+ci+"\" tabindex=\"0\" role=\"button\" aria-label=\"Select "+esc(c.name)+"\">"+
      "<div class=\"character-photo-frame\"><img class=\"character-photo\" src=\""+CHARACTER_IMAGES[ci%CHARACTER_IMAGES.length]+"\" alt=\""+esc(c.name)+"\" loading=\"eager\" decoding=\"async\" referrerpolicy=\"no-referrer\" onerror=\"this.onerror=null;this.style.display=\'none\';\"></div>"+
      "<div class=\"character-body\"><h3>"+esc(c.name)+"</h3><p class=\"character-role\">"+esc(c.role||"Character")+"</p><p class=\"character-description\">"+esc(c.appearance)+"<br>"+esc(c.wardrobe)+"</p></div></div>";
  }).join("");
  $("characterCount").textContent="("+chars.length+")";
  const totalShots=(b.scenes||[]).reduce((n,x)=>n+(x.shots||[]).length,0);
  $("sceneCount").textContent="("+(b.scenes||[]).length+" Scenes · "+totalShots+" Shots)";
  $("scenes").innerHTML=(b.scenes||[]).map((x,si)=>"<article class=\"scene\"><h3><span style=\"color:#e4b84d\">Scene "+(si+1)+":</span> "+esc(x.heading)+"</h3><div class=\"scene-meta\">Location: "+esc(x.location)+" &nbsp; | &nbsp; Duration: "+esc(x.duration)+"</div><div class=\"shots\">"+(x.shots||[]).map((sh,hi)=>"<div class=\"shot\"><div class=\"shot-info\"><strong><span style=\"color:#e4b84d\">Shot "+(hi+1)+":</span> "+esc(sh.framing)+"</strong><span>Type: "+esc(sh.framing)+" · Angle: "+esc(sh.angle)+"</span></div><button data-s=\""+si+"\" data-h=\""+hi+"\">Open Shot</button></div>").join("")+"</div></article>").join("");
  document.querySelectorAll(".shot button").forEach(x=>x.onclick=()=>openShot(+x.dataset.s,+x.dataset.h));
  if(typeof buildAssemblyQueue==="function")buildAssemblyQueue();
  document.querySelectorAll(".character").forEach(x=>{
    const select=()=>{document.querySelectorAll(".character").forEach(n=>n.classList.remove("selected"));x.classList.add("selected");const ci=Number(x.dataset.character),ch=(state.blueprint.characters||[])[ci];status("status",ch?"Selected character: "+ch.name:"");};
    x.addEventListener("click",select);
    x.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select()}});
  });
}
function openShot(si,hi){state.sceneIndex=si;state.shotIndex=hi;const s=state.blueprint.scenes[si],sh=s.shots[hi];$("shotStudio").classList.remove("hidden");$("shotTitle").textContent="Scene "+(si+1)+" · Shot "+(hi+1);$("shotDescription").textContent=s.heading||"";$("shotDetails").innerHTML=[["Camera",sh.camera],["Lens",sh.lens],["Framing",sh.framing],["Angle",sh.angle],["Movement",sh.movement],["Focus",sh.focus],["Lighting",sh.lighting],["Sound",sh.sound],["Continuity",sh.continuity]].filter(x=>x[1]).map(x=>"<div class=\"detail\"><b>"+esc(x[0])+"</b><span>"+esc(x[1])+"</span></div>").join("");$("shotVideo").classList.add("hidden");$("shotVideo").removeAttribute("src");$("videoPlaceholder").classList.remove("hidden");status("shotStatus","");$("shotStudio").scrollIntoView({behavior:"smooth",block:"start"})}
$("generateShotBtn").onclick=generateShot;$("closeStudio").onclick=()=>{$("shotStudio").classList.add("hidden")};const legacyMenuBtn=$("menuBtn");if(legacyMenuBtn){legacyMenuBtn.onclick=()=>{const sidebar=$("sidebar");if(!sidebar)return;const opening=!sidebar.classList.contains("open");if(opening){sidebar.classList.add("open");$("menuWorkspace")?.classList.add("hidden");document.querySelectorAll(".nav-dropdown.open").forEach(x=>x.classList.remove("open"));document.querySelectorAll(".nav-chevron.open").forEach(x=>x.classList.remove("open"));legacyMenuBtn.setAttribute("aria-expanded","true")}else{sidebar.classList.remove("open");$("menuWorkspace")?.classList.add("hidden");document.querySelectorAll(".nav-dropdown.open").forEach(x=>x.classList.remove("open"));document.querySelectorAll(".nav-chevron.open").forEach(x=>x.classList.remove("open"));legacyMenuBtn.setAttribute("aria-expanded","false")}}}
async function generateShot(){if(!state.blueprint)return;const b=$("generateShotBtn");b.disabled=true;status("shotStatus","Sending shot to the video generator…");try{const r=await fetch("/api/generate-shot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({blueprint:state.blueprint,sceneIndex:state.sceneIndex,shotIndex:state.shotIndex,ratio:$("ratio").value})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Shot generation failed.");if(d.videoUrl){showVideo(d.videoUrl);status("shotStatus","Shot ready.")}else if(d.taskId){await pollTask(d.taskId)}else throw new Error("The video provider did not return a task.")}catch(e){status("shotStatus",e.message,true)}finally{b.disabled=false}}
async function pollTask(id){for(let i=0;i<90;i++){status("shotStatus","Generating cinematic shot… "+Math.min(99,Math.round((i+1)/90*100))+"%");await new Promise(r=>setTimeout(r,5000));const r=await fetch("/api/generate-shot?taskId="+encodeURIComponent(id));const d=await r.json();if(!r.ok)throw new Error(d.error||"Video status check failed.");if(d.status==="SUCCEEDED"&&d.videoUrl){showVideo(d.videoUrl);status("shotStatus","Shot ready.");return}if(d.status==="FAILED"||d.status==="CANCELED")throw new Error("The shot could not be generated. Your project was not changed.")}throw new Error("Generation is taking longer than expected. Check the shot again shortly.")}
function showVideo(url){$("videoPlaceholder").classList.add("hidden");$("shotVideo").src=url;$("shotVideo").classList.remove("hidden");$("shotVideo").load()}

window.addEventListener("DOMContentLoaded",()=>{if(state.blueprint)renderBlueprint(state.blueprint)});

const MENU_DATA={
 templates:[
  ["The Rejected Boy","A poor boy rejected by his relatives fights through hardship and builds a new life."],
  ["The Last Journey","A family discovers a hidden truth during one unforgettable journey."],
  ["Dreams of Lagos","A young creator pursues a dream in Lagos while facing pressure from home."],
  ["The Comeback","After losing everything, a determined person rebuilds their life from nothing."]
 ],
 models:["Cinematic realism","Luxury fashion film","Dark thriller","Warm romantic cinema","Epic blockbuster","Documentary realism"],
 backgrounds:["Lagos city","Luxury hotel","Family house","Modern city street","Beach resort","Village","Airport","Restaurant","Night city"],
 colors:["Black","White","Red","Navy Blue","Oxblood","Brown","Gold","Cream","Emerald","Sky Blue"]
};
function menuOpen(title,subtitle,html){
 const w=$("menuWorkspace"); const sidebar=$("sidebar"); if(!w||!sidebar)return;
 if(!sidebar.contains(w))sidebar.appendChild(w);
 $("menuWorkspaceTitle").textContent=title;$("menuWorkspaceSubtitle").textContent=subtitle||"";$("menuWorkspaceBody").innerHTML=html;
 w.classList.remove("hidden");
}
function menuClose(){
 const w=$("menuWorkspace"); if(!w)return;
 w.classList.add("hidden");
 const anchor=$("blueprintSection");
 if(anchor&&w.parentElement!==anchor.parentElement)anchor.parentElement.insertBefore(w,anchor);
}
function menuButton(label,action,cls="outline-btn"){return '<button class="'+cls+' menu-action" data-menu-action="'+esc(action)+'">'+esc(label)+'</button>'}
function renderMenuCard(title,text,action){
 return '<div class="menu-card"><div><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p></div>'+menuButton("Open",action)+'</div>'
}
function saveHistory(b){
 try{
  const h=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]");
  h.unshift({title:b.title||"Untitled Movie",genre:b.genre||"",length:b.length||"",created:new Date().toISOString(),blueprint:b});
  localStorage.setItem("obitrend_movie_history",JSON.stringify(h.slice(0,20)));
 }catch(e){}
}
function openMenu(name){
 const actions={
  home:()=>{menuClose();window.scrollTo({top:0,behavior:"smooth"})},
  "create-image":()=>menuOpen("Create Image","Create a cinematic still from your movie concept.",
   '<div class="menu-form"><label>Movie image idea</label><textarea id="menuImagePrompt" placeholder="Describe the cinematic frame you want..."></textarea><div class="menu-grid">'+renderMenuCard("Character Poster","Create a character-focused movie poster concept.","poster")+renderMenuCard("Cinematic Still","Create a detailed still-frame prompt from your story.","still")+'</div><div id="menuActionStatus" class="status"></div></div>'),
  "create-video":()=>{menuClose();$("scenes")?.scrollIntoView({behavior:"smooth",block:"start"});status("status",state.blueprint?"Choose any shot and open Shot Studio to generate video.":"Build a movie blueprint first, then generate video shots.")},
  creations:()=>{
   let h=[];try{h=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]")}catch(e){}
   const body=h.length?h.map((x,i)=>'<div class="menu-card"><div><h3>'+esc(x.title)+'</h3><p>'+esc(x.genre)+' · '+esc(x.length)+' minutes · '+new Date(x.created).toLocaleString()+'</p></div>'+menuButton("Open","history:"+i)+'</div>').join(""):'<div class="empty-menu">No saved movies yet. Build your first movie blueprint.</div>';
   menuOpen("My Creations","Your saved movie projects on this device.",body);
  },
  templates:()=>menuOpen("Templates","Start quickly from a ready-made movie concept.",MENU_DATA.templates.map((x,i)=>renderMenuCard(x[0],x[1],"template:"+i)).join("")),
  models:()=>menuOpen("Model Styles","Choose the visual direction for your next movie.",MENU_DATA.models.map((x,i)=>renderMenuCard(x,"Use this visual style for the next blueprint.","model:"+i)).join("")),
  backgrounds:()=>menuOpen("Backgrounds","Choose the world where your movie takes place.",MENU_DATA.backgrounds.map((x,i)=>renderMenuCard(x,"Use this setting in your next movie concept.","background:"+i)).join("")),
  colors:()=>menuOpen("Outfit Colors","Choose a wardrobe color direction for your movie.",MENU_DATA.colors.map((x,i)=>renderMenuCard(x,"Use this wardrobe color direction.","color:"+i)).join("")),
  pro:()=>menuOpen("Pro Plans","Premium movie creation options.",renderMenuCard("Weekly Pro","20 movie credits · 7 days","pro:weekly")+renderMenuCard("Monthly Pro","80 movie credits · 30 days","pro:monthly")+'<div class="status">Payment can be connected to your existing billing flow when the movie subscription backend is enabled.</div>'),
  credits:()=>menuOpen("My Credits","Your current movie studio credit balance.",'<div class="credit-box"><strong>47</strong><span>Credits available</span></div>'+renderMenuCard("How credits work","Credits are used when generating movie shots.","credits-info")),
  settings:()=>menuOpen("Settings","Movie Creator settings are saved on this device.",'<div class="settings-list"><label class="setting-row"><span>Save movie history</span><input id="settingHistory" type="checkbox" checked></label><button class="outline-btn menu-action" data-menu-action="clear-history">Clear saved history</button><button class="outline-btn menu-action" data-menu-action="clear-project">Clear current project</button></div><div id="menuActionStatus" class="status"></div>'),
  help:()=>menuOpen("Help & Support","Quick help for the Movie Creator.",renderMenuCard("How do I create a movie?","Open Create Image, enter an idea, then build your cinematic blueprint.","help:create")+renderMenuCard("How do I generate video?","Open Create Video, choose a shot, then use Generate This Shot.","help:video")+renderMenuCard("Generation failed?","Your blueprint stays saved so you can try the shot again.","help:error"))
 };
 (actions[name]||actions.home)();
}
document.querySelectorAll(".nav-item").forEach(a=>a.addEventListener("click",e=>{if(a.closest(".nav-group")?.querySelector(".nav-dropdown"))return;const href=a.getAttribute("href")||"#home";if(href.startsWith("#")){e.preventDefault();openMenu(href.slice(1));document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("selected"));a.classList.add("selected")}}));
$("menuWorkspaceClose")?.addEventListener("click",menuClose);
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-menu-action]");if(!b)return;const action=b.dataset.menuAction;
 if(action.startsWith("template:")){const x=MENU_DATA.templates[+action.split(":")[1]];$("moviePrompt").value=x[1];$("createPanel").classList.remove("hidden");menuClose();$("createPanel").scrollIntoView({behavior:"smooth"});return}
 if(action.startsWith("model:")){localStorage.setItem("obitrend_movie_model_style",MENU_DATA.models[+action.split(":")[1]]);$("visualStyle").value=MENU_DATA.models[+action.split(":")[1]];status("status","Model style selected: "+MENU_DATA.models[+action.split(":")[1]]);return}
 if(action.startsWith("background:")){localStorage.setItem("obitrend_movie_background",MENU_DATA.backgrounds[+action.split(":")[1]]);status("status","Background selected: "+MENU_DATA.backgrounds[+action.split(":")[1]]);return}
 if(action.startsWith("color:")){localStorage.setItem("obitrend_movie_color",MENU_DATA.colors[+action.split(":")[1]]);status("status","Outfit color selected: "+MENU_DATA.colors[+action.split(":")[1]]);return}
 if(action==="poster"||action==="still"){const p=$("menuImagePrompt")?.value.trim()||state.blueprint?.logline||"Create a cinematic movie frame";$("menuActionStatus").textContent=(action==="poster"?"Poster prompt ready: ":"Cinematic still prompt ready: ")+p;return}
 if(action.startsWith("history:")){let h=[];try{h=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]")}catch(e){}const x=h[+action.split(":")[1]];if(x?.blueprint){state.blueprint=x.blueprint;renderBlueprint(x.blueprint);menuClose();window.scrollTo({top:0,behavior:"smooth"})}return}
 if(action.startsWith("pro:")){status("status","Selected "+(action.endsWith("weekly")?"Weekly":"Monthly")+" Pro plan. Payment setup can be connected here.");return}
 if(action==="credits-info"){const s=$("menuActionStatus");if(s)s.textContent="Movie credits are consumed by video-shot generation.";return}
 if(action==="clear-history"){localStorage.removeItem("obitrend_movie_history");const s=$("menuActionStatus");if(s)s.textContent="Saved movie history cleared.";return}
 if(action==="clear-project"){localStorage.removeItem("obitrend_movie_blueprint");state.blueprint=demoBlueprint;renderBlueprint(state.blueprint);const s=$("menuActionStatus");if(s)s.textContent="Current project reset.";return}
 if(action.startsWith("help:")){const s=$("menuActionStatus");if(s)s.textContent=action.endsWith("create")?"Enter a movie idea, choose options, and tap Build Movie Blueprint.":action.endsWith("video")?"Open a shot and tap Generate This Shot. The status area shows progress.":"Your project blueprint remains saved while a shot is being generated."}
});
const originalBuildHandler=$("buildBtn")?.onclick;
if(originalBuildHandler)$("buildBtn").onclick=async()=>{await originalBuildHandler();if(state.blueprint)saveHistory(state.blueprint)};

/* Reliable touch controls for dashboard tabs and blueprint actions */
function wireTouchAction(el,fn){
 if(!el)return;
 let last=0;
 const run=e=>{const now=Date.now();if(now-last<350)return;last=now;if(e&&e.cancelable)e.preventDefault();fn(e)};
 el.addEventListener("pointerup",run,{passive:false});
 el.addEventListener("click",run,{passive:false});
}
document.addEventListener("DOMContentLoaded",()=>{
 const tabs=document.querySelectorAll(".tabs .tab");
 tabs.forEach((tab,i)=>wireTouchAction(tab,()=>{
  tabs.forEach(t=>t.classList.remove("active"));tab.classList.add("active");
  if(i===0){$("blueprintSection")?.scrollIntoView({behavior:"smooth",block:"start"});}
  else {$("scenes")?.scrollIntoView({behavior:"smooth",block:"start"});}
 }));
 wireTouchAction($("editBtn"),()=>{
  const p=$("createPanel");if(!p)return;
  p.classList.toggle("hidden");
  if(!p.classList.contains("hidden"))p.scrollIntoView({behavior:"smooth",block:"start"});
 });
 wireTouchAction($("generateMovieBtn"),()=>{
  if(!state.blueprint){status("status","Build a movie blueprint first.");$("createPanel")?.classList.remove("hidden");$("createPanel")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
  const scenes=state.blueprint.scenes||[];
  if(!scenes.length){status("status","No movie scenes are available yet.");return;}
  const shots=scenes[0].shots||[];
  if(!shots.length){status("status","No shots are available for this movie.");return;}
  openShot(0,0);
 });
 document.querySelectorAll(".outline-btn,.gold-btn,.tab,.nav-item,.character,.shot button").forEach(el=>{
  el.style.touchAction="manipulation";
  el.style.webkitTapHighlightColor="transparent";
 });
});

const assemblyState={queue:[],running:false,urls:{}};
function buildAssemblyQueue(){
 assemblyState.queue=[];
 (state.blueprint?.scenes||[]).forEach((scene,si)=>(scene.shots||[]).forEach((shot,hi)=>assemblyState.queue.push({si,hi,scene,shot,key:si+"-"+hi,state:"waiting",url:null})));
 renderAssembly();
}
function renderAssembly(){
 const q=$("assemblyQueue"),bar=$("assemblyProgressBar"),pct=$("assemblyProgress");
 if(!q)return;
 if(!assemblyState.queue.length){q.innerHTML='<div class="empty-menu">Build a movie blueprint first.</div>';if(bar)bar.style.width="0%";if(pct)pct.textContent="0%";return}
 const done=assemblyState.queue.filter(x=>x.state==="ready").length;
 const percent=Math.round(done/assemblyState.queue.length*100);
 if(bar)bar.style.width=percent+"%";if(pct)pct.textContent=percent+"%";
 q.innerHTML=assemblyState.queue.map((x,i)=>{
  const status=x.state==="ready"?"Ready":x.state==="generating"?"Generating…":x.state==="failed"?"Failed":"Waiting";
  const media=x.url?'<video controls playsinline src="'+esc(x.url)+'"></video>':'';
  return '<div class="assembly-item '+x.state+'"><div class="assembly-number">'+(i+1)+'</div><div><h3>Scene '+(x.si+1)+' · Shot '+(x.hi+1)+' — '+esc(x.shot.framing||"Cinematic shot")+'</h3><p>'+esc(x.scene.heading||"")+'</p></div><div class="assembly-state">'+status+'</div>'+media+'</div>'
 }).join("");
}
async function generateAssemblyItem(item){
 item.state="generating";renderAssembly();
 const r=await fetch("/api/generate-shot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({blueprint:state.blueprint,sceneIndex:item.si,shotIndex:item.hi,ratio:$("ratio").value})});
 const d=await r.json();
 if(!r.ok)throw new Error(d.error||"Shot generation failed.");
 if(d.videoUrl)return d.videoUrl;
 if(!d.taskId)throw new Error("The video provider did not return a task.");
 for(let i=0;i<90;i++){
  $("assemblyStatus").textContent="Generating Scene "+(item.si+1)+" Shot "+(item.hi+1)+"… "+Math.min(99,Math.round((i+1)/90*100))+"%";
  await new Promise(r=>setTimeout(r,5000));
  const s=await fetch("/api/generate-shot?taskId="+encodeURIComponent(d.taskId));const x=await s.json();
  if(!s.ok)throw new Error(x.error||"Video status check failed.");
  if(x.status==="SUCCEEDED"&&x.videoUrl)return x.videoUrl;
  if(x.status==="FAILED"||x.status==="CANCELED")throw new Error("The shot could not be generated.");
 }
 throw new Error("Generation is taking longer than expected.");
}
async function runAssembly(full){
 if(assemblyState.running||!state.blueprint)return;
 if(!assemblyState.queue.length)buildAssemblyQueue();
 const items=assemblyState.queue.filter(x=>x.state!=="ready");
 const targets=full?items:items.slice(0,1);
 if(!targets.length){$("assemblyStatus").textContent="All movie shots are already generated.";return}
 assemblyState.running=true;
 $("generateNextShotBtn").disabled=true;$("generateFullMovieBtn").disabled=true;
 try{
  for(const item of targets){
   try{item.url=await generateAssemblyItem(item);item.state="ready";assemblyState.urls[item.key]=item.url;renderAssembly();$("assemblyStatus").textContent="Scene "+(item.si+1)+" Shot "+(item.hi+1)+" ready.";localStorage.setItem("obitrend_movie_assembly",JSON.stringify(assemblyState.urls))}
   catch(e){item.state="failed";renderAssembly();$("assemblyStatus").textContent=e.message;break}
  }
 }finally{assemblyState.running=false;$("generateNextShotBtn").disabled=false;$("generateFullMovieBtn").disabled=false;renderAssembly()}
}
document.addEventListener("DOMContentLoaded",()=>{
 $("generateNextShotBtn")?.addEventListener("click",()=>runAssembly(false));
 $("generateFullMovieBtn")?.addEventListener("click",()=>runAssembly(true));
 if(state.blueprint){buildAssemblyQueue();try{const saved=JSON.parse(localStorage.getItem("obitrend_movie_assembly")||"{}");assemblyState.queue.forEach(x=>{if(saved[x.key]){x.url=saved[x.key];x.state="ready"}});renderAssembly()}catch(e){}}
});

/* Navigation dropdown menus — real app menu behavior */
(function(){
  const closeAll=()=>{
    document.querySelectorAll(".nav-dropdown.open").forEach(p=>p.classList.remove("open"));
    document.querySelectorAll(".nav-chevron.open").forEach(b=>b.classList.remove("open"));
  };
  const toggle=(group)=>{
    const panel=group?.querySelector(".nav-dropdown");
    const btn=group?.querySelector(".nav-chevron");
    if(!panel)return;
    const opening=!panel.classList.contains("open");
    closeAll();
    if(opening){panel.classList.add("open");btn?.classList.add("open");}
  };
  document.querySelectorAll(".nav-chevron").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();
      toggle(btn.closest(".nav-group"));
    },{passive:false});
  });
  document.querySelectorAll(".nav-group > .nav-item").forEach(item=>{
    item.addEventListener("click",e=>{
      if(e.target.closest(".nav-chevron"))return;
      const group=item.closest(".nav-group");
      if(!group?.querySelector(".nav-dropdown"))return;
      e.preventDefault();e.stopPropagation();
      toggle(group);
    },{passive:false});
  });
  document.addEventListener("click",e=>{
    if(e.target.closest(".sidebar"))return;
    closeAll();
  });
  document.addEventListener("click",e=>{
    const b=e.target.closest(".nav-dropdown [data-menu-action]");
    if(!b)return;
    e.preventDefault();e.stopPropagation();
    const action=b.dataset.menuAction;
    closeAll();
    if(action==="home:dashboard"){openMenu("home");return}
    if(action==="home:blueprint"){menuClose();$("blueprintSection")?.scrollIntoView({behavior:"smooth",block:"start"});return}
    if(action==="home:recent"){openMenu("creations");return}
    if(action==="create-image:poster"||action==="create-image:still"||action==="create-image:character"){
      menuOpen("Create Image","Create a cinematic image from your movie concept.",
        '<div class="menu-form"><label>Movie image idea</label><textarea id="menuImagePrompt" placeholder="Describe the cinematic frame you want..."></textarea><div class="menu-grid">'+
        renderMenuCard("Movie Poster","Create a poster concept for your story.","poster")+
        renderMenuCard("Cinematic Still","Create a detailed still-frame concept.","still")+
        renderMenuCard("Character Frame","Create a character-focused frame.","character")+
        '</div><div id="menuActionStatus" class="status"></div></div>');
      return;
    }
    if(action==="create-video:shot"){openMenu("create-video");return}
    if(action==="create-video:full"){$("movieAssembly")?.scrollIntoView({behavior:"smooth",block:"start"});status("status","Movie Assembly is ready. Use Generate Full Movie to generate the shots in story order.");return}
    if(action==="create-video:studio"){
      const scenes=state.blueprint?.scenes||[];const shots=scenes[0]?.shots||[];
      if(shots.length)openShot(0,0);else{status("status","Build a movie blueprint first, then open Shot Studio.");$("createPanel")?.classList.remove("hidden");$("createPanel")?.scrollIntoView({behavior:"smooth",block:"start"});}
      return;
    }
    if(action==="creations:movies"||action==="creations:history"){openMenu("creations");return}
    if(action==="creations:shots"){$("movieAssembly")?.scrollIntoView({behavior:"smooth",block:"start"});return}
    if(action.startsWith("templates:")){
      const map={drama:0,action:1,romance:2,thriller:3};const i=map[action.split(":")[1]]??0;const x=MENU_DATA.templates[i]||MENU_DATA.templates[0];
      $("moviePrompt").value=x[1];$("createPanel").classList.remove("hidden");$("createPanel").scrollIntoView({behavior:"smooth",block:"start"});status("status","Template selected: "+x[0]);return;
    }
    if(action.startsWith("model:")){const i=+action.split(":")[1];localStorage.setItem("obitrend_movie_model_style",MENU_DATA.models[i]);$("visualStyle").value=MENU_DATA.models[i];status("status","Model style selected: "+MENU_DATA.models[i]);return}
    if(action.startsWith("background:")){const i=+action.split(":")[1];localStorage.setItem("obitrend_movie_background",MENU_DATA.backgrounds[i]);status("status","Background selected: "+MENU_DATA.backgrounds[i]);return}
    if(action.startsWith("color:")){const i=+action.split(":")[1];localStorage.setItem("obitrend_movie_color",MENU_DATA.colors[i]);status("status","Outfit color selected: "+MENU_DATA.colors[i]);return}
    if(action.startsWith("pro:")){status("status","Selected "+(action.endsWith("weekly")?"Weekly":"Monthly")+" Pro plan. Payment setup can be connected here.");return}
    if(action==="credits:balance"){openMenu("credits");return}
    if(action==="credits:usage"){openMenu("credits");status("status","Credits usage is shown in My Credits.");return}
    if(action==="credits:info"){openMenu("credits");return}
    if(action==="settings:general"||action==="settings:history"||action==="settings:reset"){openMenu("settings");return}
    if(action.startsWith("help:")){openMenu("help");return}
  },true);
})();

/* Targeted mobile fix: Pro Plans must open from the row or chevron. */
(function(){
  const proGroup=document.querySelector('.nav-group a[href="#pro"]')?.closest('.nav-group');
  if(!proGroup)return;
  const proPanel=proGroup.querySelector('.nav-dropdown');
  const proChevron=proGroup.querySelector('.nav-chevron');
  const openPro=()=>{
    document.querySelectorAll('.nav-dropdown.open').forEach(p=>{if(p!==proPanel)p.classList.remove('open')});
    document.querySelectorAll('.nav-chevron.open').forEach(b=>{if(b!==proChevron)b.classList.remove('open')});
    const opening=!proPanel.classList.contains('open');
    proPanel.classList.toggle('open',opening);
    proChevron?.classList.toggle('open',opening);
  };
  proGroup.querySelector('.nav-item')?.addEventListener('pointerup',e=>{
    if(e.target.closest('.nav-chevron'))return;
    e.preventDefault();e.stopPropagation();openPro();
  },{passive:false});
  proChevron?.addEventListener('pointerup',e=>{
    e.preventDefault();e.stopPropagation();openPro();
  },{passive:false});
})();

/* Real dashboard quick actions */
document.addEventListener("DOMContentLoaded",()=>{
  const create=()=>{$("createPanel")?.classList.remove("hidden");$("createPanel")?.scrollIntoView({behavior:"smooth",block:"start"});};
  $("dashboardCreateBtn")?.addEventListener("click",create);
  $("quickMovieBtn")?.addEventListener("click",create);
  $("quickImageBtn")?.addEventListener("click",()=>{openMenu("Create Image","Create a cinematic image from your movie concept.","");});
  $("quickVideoBtn")?.addEventListener("click",()=>{$("movieAssembly")?.scrollIntoView({behavior:"smooth",block:"start"});});
  $("openRecentMovieBtn")?.addEventListener("click",()=>{$("blueprintSection")?.scrollIntoView({behavior:"smooth",block:"start"});});
});

/* Android dashboard interaction layer */
document.addEventListener("DOMContentLoaded",()=>{
  const showCreate=()=>{
    const p=$("createPanel");
    if(!p)return;
    p.classList.remove("hidden");
    p.scrollIntoView({behavior:"smooth",block:"start"});
    $("moviePrompt")?.focus();
  };
  const showAssembly=()=>{
    const a=$("movieAssembly");
    if(a){a.scrollIntoView({behavior:"smooth",block:"start"});return;}
    showCreate();
  };
  const notify=(msg)=>{
    const p=$("createPanel");
    if(!p)return;
    p.classList.remove("hidden");
    const s=$("status");
    if(s)status("status",msg);
    p.scrollIntoView({behavior:"smooth",block:"start"});
  };

  $("androidCreateMovieBtn")?.addEventListener("click",showCreate);
  $("androidCreateNav")?.addEventListener("click",showCreate);
  document.querySelectorAll('[data-android-action="movie"]').forEach(b=>b.addEventListener("click",showCreate));
  document.querySelectorAll('[data-android-action="image"]').forEach(b=>b.addEventListener("click",()=>{
    showCreate();
    if($("moviePrompt"))$("moviePrompt").placeholder="Describe the movie image, poster or cinematic still you want...";
    if($("visualStyle"))$("visualStyle").value="Cinematic realism";
  }));
  document.querySelectorAll('[data-android-action="video"]').forEach(b=>b.addEventListener("click",showAssembly));
  document.querySelectorAll('[data-android-action="characters"]').forEach(b=>b.addEventListener("click",()=>{
    if(state.blueprint?.scenes?.length){$("scenes")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
    notify("Build your movie blueprint first to create consistent AI characters.");
  }));

  $("androidSeeCreate")?.addEventListener("click",showCreate);
  $("androidMoviesNav")?.addEventListener("click",()=>{
    document.querySelector(".android-projects")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
  $("androidSeeMovies")?.addEventListener("click",()=>{
    document.querySelector(".android-projects")?.scrollIntoView({behavior:"smooth",block:"start"});
  });

  document.querySelectorAll(".android-projects button").forEach((b,i)=>b.addEventListener("click",()=>{
    if(i===0 && state.blueprint){renderBlueprint(state.blueprint);$("blueprintSection")?.scrollIntoView({behavior:"smooth",block:"start"});}
    else notify("This project is ready to be connected to your saved movie library.");
  }));

  const nav=document.querySelector(".android-bottom-nav");
  nav?.querySelectorAll("button").forEach((b,i)=>b.addEventListener("click",()=>{
    nav.querySelectorAll("button").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    if(i===0)window.scrollTo({top:0,behavior:"smooth"});
    if(i===1)showCreate();
    if(i===2)document.querySelector(".android-projects")?.scrollIntoView({behavior:"smooth",block:"start"});
    if(i===3)notify("Movie Templates are ready to be connected to your template library.");
    if(i===4)notify("Profile and account settings are ready to be connected.");
  }));

  const menuBtn=$("androidMenuBtn");
  if(menuBtn){
    let drawer=document.getElementById("androidDrawer");
    if(!drawer){
      drawer=document.createElement("div");
      drawer.id="androidDrawer";
      drawer.className="android-drawer";
      drawer.innerHTML='<div class="android-drawer-head"><b>♛ OBITREND</b><button type="button" id="androidDrawerClose">×</button></div>'+
        '<button data-drawer-action="home">⌂ <span>Home</span></button>'+
        '<button data-drawer-action="create">＋ <span>Create Movie</span></button>'+
        '<button data-drawer-action="movies">▣ <span>My Movies</span></button>'+
        '<button data-drawer-action="templates">▦ <span>Templates</span></button>'+
        '<button data-drawer-action="credits">◉ <span>My Credits</span></button>'+
        '<button data-drawer-action="settings">⚙ <span>Settings</span></button>'+
        '<button data-drawer-action="help">? <span>Help & Support</span></button>';
      document.body.appendChild(drawer);
      const close=()=>drawer.classList.remove("open");
      $("androidDrawerClose")?.addEventListener("click",close);
      drawer.addEventListener("click",e=>{
        const b=e.target.closest("[data-drawer-action]");if(!b)return;
        const a=b.dataset.drawerAction;
        if(a==="home"){close();window.scrollTo({top:0,behavior:"smooth"});}
        else if(a==="create"){close();showCreate();}
        else if(a==="movies"){close();document.querySelector(".android-projects")?.scrollIntoView({behavior:"smooth"});}
        else {close();notify(a==="credits"?"Your movie credits are shown at the top of the app.":a==="settings"?"Settings will be available here.":"Help & Support will be available here.");}
      });
    }
    menuBtn.addEventListener("click",()=>drawer.classList.toggle("open"));
  }
});
