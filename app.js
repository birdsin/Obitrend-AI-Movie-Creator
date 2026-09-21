const state={blueprint:null,sceneIndex:0,shotIndex:0};
try{const saved=localStorage.getItem("obitrend_movie_blueprint");if(saved)state.blueprint=JSON.parse(saved)}catch(e){}
const demoBlueprint={title:"The Rejected Boy",logline:"A young Nigerian boy with big dreams faces rejection from his family and community, but never gives up. Through hard work, faith and determination, he rises from being looked down on to becoming successful.",genre:"Drama",length:15,visualStyle:"Cinematic realism",visualBible:{},characters:[{name:"Chinedu",role:"Main Character",appearance:"Young, determined, kind",wardrobe:"Simple everyday clothing"},{name:"Mr. Okafor",role:"Father",appearance:"Strict, hardworking",wardrobe:"Simple work clothes"},{name:"Ngozi",role:"Mother",appearance:"Supportive, loving",wardrobe:"Traditional Nigerian clothing"},{name:"Emeka",role:"Rival",appearance:"Arrogant, jealous",wardrobe:"Modern casual clothing"}],scenes:[{heading:"The Rejection",location:"Village / Family House",duration:"2:00",shots:[{framing:"Close-up",angle:"Eye-level",camera:"Full-frame cinema camera",lens:"50mm",movement:"Slow push-in",focus:"Chinedu",lighting:"Natural daylight",sound:"Village ambience",continuity:"Chinedu leaves home"} ,{framing:"Medium shot",angle:"Slight high",camera:"Full-frame cinema camera",lens:"35mm",movement:"Static",focus:"Family",lighting:"Natural daylight",sound:"Family dialogue",continuity:"Family rejects Chinedu"}]},{heading:"The Dream",location:"City Street",duration:"2:00",shots:[{framing:"Medium shot",angle:"Tracking",camera:"Full-frame cinema camera",lens:"35mm",movement:"Tracking",focus:"Chinedu",lighting:"Warm city light",sound:"Traffic and footsteps",continuity:"Chinedu walks toward the city"},{framing:"Close-up",angle:"Eye-level",camera:"Full-frame cinema camera",lens:"50mm",movement:"Slow push-in",focus:"Chinedu",lighting:"Library practicals",sound:"Quiet study ambience",continuity:"Chinedu studies late"}]}]};
if(!state.blueprint)state.blueprint=demoBlueprint;const $=id=>document.getElementById(id);
function status(id,msg,error){const e=$(id);e.textContent=msg;e.className="status"+(error?" error":"")}
$("buildBtn").onclick=async()=>{const prompt=$("moviePrompt").value.trim();if(!prompt){status("status","Enter your movie idea first.",true);return}const b=$("buildBtn");b.disabled=true;status("status","Building your cinematic blueprint…");try{const r=await fetch("/api/plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,length:Number($("length").value),genre:$("genre").value,visualStyle:$("visualStyle").value,ratio:$("ratio").value})});const text=await r.text();let d={};try{d=JSON.parse(text)}catch{}if(!r.ok)throw new Error(d.error||"Movie planning service is temporarily unavailable. Please try again.");state.blueprint=d.blueprint;try{localStorage.setItem("obitrend_movie_blueprint",JSON.stringify(d.blueprint))}catch(e){}renderBlueprint(d.blueprint);status("status","Blueprint ready.")}catch(e){status("status",e.message,true)}finally{b.disabled=false}};
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
const CHARACTER_SPRITE="data:image/jpeg;base64,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";
const CHARACTER_SPRITE_POSITIONS=["0% 0%","100% 0%","0% 100%","100% 100%"];
function renderBlueprint(b){
  $("movieTitle").textContent=b.title||"Untitled Movie";
  $("movieLogline").textContent=b.logline||"";
  $("movieMeta").innerHTML=[b.genre,b.length?b.length+" minutes":null,b.visualStyle||"Cinematic realism",$("ratio")&&$("ratio").value].filter(Boolean).map(x=>"<span>"+esc(x)+"</span>").join("");
  const chars=b.characters||[];
  $("characters").innerHTML=chars.map((c,ci)=>{
    const pos=CHARACTER_SPRITE_POSITIONS[ci%CHARACTER_SPRITE_POSITIONS.length];
    return "<div class=\\"character\\" data-character=\\""+ci+"\\" tabindex=\\"0\\" role=\\"button\\" aria-label=\\"Select "+esc(c.name)+"\\">"+
      "<div class=\\"character-photo-frame\\"><img class=\\"character-photo character-photo-sprite\\" src=\\""+CHARACTER_SPRITE+"\\" alt=\\""+esc(c.name)+"\\" loading=\\"eager\\" decoding=\\"async\\" style=\\"object-position:"+pos+";\\"></div>"+
      "<div class=\\"character-body\\"><h3>"+esc(c.name)+"</h3><p class=\\"character-role\\">"+esc(c.role||"Character")+"</p><p class=\\"character-description\\">"+esc(c.appearance)+"<br>"+esc(c.wardrobe)+"</p></div></div>";
  }).join("");
  $("characterCount").textContent="("+chars.length+")";
  const totalShots=(b.scenes||[]).reduce((n,x)=>n+(x.shots||[]).length,0);
  $("sceneCount").textContent="("+(b.scenes||[]).length+" Scenes · "+totalShots+" Shots)";
  $("scenes").innerHTML=(b.scenes||[]).map((x,si)=>"<article class=\\"scene\\"><h3><span style=\\"color:#e4b84d\\">Scene "+(si+1)+":</span> "+esc(x.heading)+"</h3><div class=\\"scene-meta\\">Location: "+esc(x.location)+" &nbsp; | &nbsp; Duration: "+esc(x.duration)+"</div><div class=\\"shots\\">"+(x.shots||[]).map((sh,hi)=>"<div class=\\"shot\\"><div class=\\"shot-info\\"><strong><span style=\\"color:#e4b84d\\">Shot "+(hi+1)+":</span> "+esc(sh.framing)+"</strong><span>Type: "+esc(sh.framing)+" · Angle: "+esc(sh.angle)+"</span></div><button data-s=\\""+si+"\\" data-h=\\""+hi+"\\">Open Shot</button></div>").join("")+"</div></article>").join("");
  document.querySelectorAll(".shot button").forEach(x=>x.onclick=()=>openShot(+x.dataset.s,+x.dataset.h));
  if(typeof buildAssemblyQueue==="function")buildAssemblyQueue();
  document.querySelectorAll(".character").forEach(x=>{
    const select=()=>{document.querySelectorAll(".character").forEach(n=>n.classList.remove("selected"));x.classList.add("selected");const ci=Number(x.dataset.character),ch=(state.blueprint.characters||[])[ci];status("status",ch?"Selected character: "+ch.name:"");};
    x.addEventListener("click",select);
    x.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select()}});
  });
}
function openShot(si,hi){state.sceneIndex=si;state.shotIndex=hi;const s=state.blueprint.scenes[si],sh=s.shots[hi];$("shotStudio").classList.remove("hidden");$("shotTitle").textContent="Scene "+(si+1)+" · Shot "+(hi+1);$("shotDescription").textContent=s.heading||"";$("shotDetails").innerHTML=[["Camera",sh.camera],["Lens",sh.lens],["Framing",sh.framing],["Angle",sh.angle],["Movement",sh.movement],["Focus",sh.focus],["Lighting",sh.lighting],["Sound",sh.sound],["Continuity",sh.continuity]].filter(x=>x[1]).map(x=>"<div class=\"detail\"><b>"+esc(x[0])+"</b><span>"+esc(x[1])+"</span></div>").join("");$("shotVideo").classList.add("hidden");$("shotVideo").removeAttribute("src");$("videoPlaceholder").classList.remove("hidden");status("shotStatus","");$("shotStudio").scrollIntoView({behavior:"smooth",block:"start"})}
$("generateShotBtn").onclick=generateShot;$("closeStudio").onclick=()=>{$("shotStudio").classList.add("hidden")};$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
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
 const w=$("menuWorkspace"); if(!w)return;
 $("menuWorkspaceTitle").textContent=title;$("menuWorkspaceSubtitle").textContent=subtitle||"";$("menuWorkspaceBody").innerHTML=html;
 w.classList.remove("hidden");w.scrollIntoView({behavior:"smooth",block:"start"});
}
function menuClose(){$("menuWorkspace")?.classList.add("hidden")}
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
 const closeDrawer=()=>$("sidebar")?.classList.remove("open");
 closeDrawer();
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
document.querySelectorAll(".nav-item").forEach(a=>a.addEventListener("click",e=>{const href=a.getAttribute("href")||"#home";if(href.startsWith("#")){e.preventDefault();openMenu(href.slice(1));document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("selected"));a.classList.add("selected")}}));
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
