const state={blueprint:null,sceneIndex:0,shotIndex:0};
try{const saved=localStorage.getItem("obitrend_movie_blueprint");if(saved)state.blueprint=JSON.parse(saved)}catch(e){}
const demoBlueprint={title:"The Rejected Boy",logline:"A young Nigerian boy with big dreams faces rejection from his family and community, but never gives up. Through hard work, faith and determination, he rises from being looked down on to becoming successful.",genre:"Drama",length:15,visualStyle:"Cinematic realism",visualBible:{},characters:[{name:"Chinedu",role:"Main Character",appearance:"Young, determined, kind",wardrobe:"Simple everyday clothing"},{name:"Mr. Okafor",role:"Father",appearance:"Strict, hardworking",wardrobe:"Simple work clothes"},{name:"Ngozi",role:"Mother",appearance:"Supportive, loving",wardrobe:"Traditional Nigerian clothing"},{name:"Emeka",role:"Rival",appearance:"Arrogant, jealous",wardrobe:"Modern casual clothing"}],scenes:[{heading:"The Rejection",location:"Village / Family House",duration:"2:00",shots:[{framing:"Close-up",angle:"Eye-level",camera:"Full-frame cinema camera",lens:"50mm",movement:"Slow push-in",focus:"Chinedu",lighting:"Natural daylight",sound:"Village ambience",continuity:"Chinedu leaves home"} ,{framing:"Medium shot",angle:"Slight high",camera:"Full-frame cinema camera",lens:"35mm",movement:"Static",focus:"Family",lighting:"Natural daylight",sound:"Family dialogue",continuity:"Family rejects Chinedu"}]},{heading:"The Dream",location:"City Street",duration:"2:00",shots:[{framing:"Medium shot",angle:"Tracking",camera:"Full-frame cinema camera",lens:"35mm",movement:"Tracking",focus:"Chinedu",lighting:"Warm city light",sound:"Traffic and footsteps",continuity:"Chinedu walks toward the city"},{framing:"Close-up",angle:"Eye-level",camera:"Full-frame cinema camera",lens:"50mm",movement:"Slow push-in",focus:"Chinedu",lighting:"Library practicals",sound:"Quiet study ambience",continuity:"Chinedu studies late"}]}]};
if(!state.blueprint)state.blueprint=demoBlueprint;const $=id=>document.getElementById(id);
function status(id,msg,error){const e=$(id);e.textContent=msg;e.className="status"+(error?" error":"")}
$("buildBtn").onclick=async()=>{const prompt=$("moviePrompt").value.trim();if(!prompt){status("status","Enter your movie idea first.",true);return}const b=$("buildBtn");b.disabled=true;status("status","Building your cinematic blueprint…");try{const r=await fetch("/api/plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,length:Number($("length").value),genre:$("genre").value,visualStyle:$("visualStyle").value,ratio:$("ratio").value})});const text=await r.text();let d={};try{d=JSON.parse(text)}catch{}if(!r.ok)throw new Error(d.error||"Movie planning service is temporarily unavailable. Please try again.");state.blueprint=d.blueprint;try{localStorage.setItem("obitrend_movie_blueprint",JSON.stringify(d.blueprint))}catch(e){}renderBlueprint(d.blueprint);status("status","Blueprint ready.")}catch(e){status("status",e.message,true)}finally{b.disabled=false}};
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderBlueprint(b){$("movieTitle").textContent=b.title||"Untitled Movie";$("movieLogline").textContent=b.logline||"";$("movieMeta").innerHTML=[b.genre,b.length?b.length+" minutes":null,b.visualStyle||"Cinematic realism",$("ratio")&&$("ratio").value].filter(Boolean).map(x=>"<span>"+esc(x)+"</span>").join("");$("characters").innerHTML=(b.characters||[]).map((c,ci)=>"<div class=\"character\" data-character=\""+ci+"\" tabindex=\"0\" role=\"button\" aria-label=\"Select "+esc(c.name)+"\"><h3>"+esc(c.name)+"</h3><p>"+esc(c.role||"Character")+"<br>"+esc(c.appearance)+"<br>"+esc(c.wardrobe)+"</p></div>").join("");$("characterCount").textContent="("+(b.characters||[]).length+")";const totalShots=(b.scenes||[]).reduce((n,x)=>n+(x.shots||[]).length,0);$("sceneCount").textContent="("+(b.scenes||[]).length+" Scenes · "+totalShots+" Shots)";$("scenes").innerHTML=(b.scenes||[]).map((x,si)=>"<article class=\"scene\"><h3><span style=\"color:#e4b84d\">Scene "+(si+1)+":</span> "+esc(x.heading)+"</h3><div class=\"scene-meta\">Location: "+esc(x.location)+" &nbsp; | &nbsp; Duration: "+esc(x.duration)+"</div><div class=\"shots\">"+(x.shots||[]).map((sh,hi)=>"<div class=\"shot\"><div class=\"shot-info\"><strong><span style=\"color:#e4b84d\">Shot "+(hi+1)+":</span> "+esc(sh.framing)+"</strong><span>Type: "+esc(sh.framing)+" · Angle: "+esc(sh.angle)+"</span></div><button data-s=\""+si+"\" data-h=\""+hi+"\">Open Shot</button></div>").join("")+"</div></article>").join("");document.querySelectorAll(".shot button").forEach(x=>x.onclick=()=>openShot(+x.dataset.s,+x.dataset.h));document.querySelectorAll(".character").forEach(x=>{const select=()=>{document.querySelectorAll(".character").forEach(n=>n.classList.remove("selected"));x.classList.add("selected");const ci=Number(x.dataset.character),ch=(state.blueprint.characters||[])[ci];status("status",ch?"Selected character: "+ch.name:"");};x.addEventListener("click",select);x.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select()}})});}
function openShot(si,hi){state.sceneIndex=si;state.shotIndex=hi;const s=state.blueprint.scenes[si],sh=s.shots[hi];$("shotStudio").classList.remove("hidden");$("shotTitle").textContent="Scene "+(si+1)+" · Shot "+(hi+1);$("shotDescription").textContent=s.heading||"";$("shotDetails").innerHTML=[["Camera",sh.camera],["Lens",sh.lens],["Framing",sh.framing],["Angle",sh.angle],["Movement",sh.movement],["Focus",sh.focus],["Lighting",sh.lighting],["Sound",sh.sound],["Continuity",sh.continuity]].filter(x=>x[1]).map(x=>"<div class=\"detail\"><b>"+esc(x[0])+"</b><span>"+esc(x[1])+"</span></div>").join("");$("shotVideo").classList.add("hidden");$("shotVideo").removeAttribute("src");$("videoPlaceholder").classList.remove("hidden");status("shotStatus","");$("shotStudio").scrollIntoView({behavior:"smooth",block:"start"})}
$("generateShotBtn").onclick=generateShot;$("closeStudio").onclick=()=>{$("shotStudio").classList.add("hidden")};$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");$("editBtn").onclick=()=>$("createPanel").classList.toggle("hidden");$("generateMovieBtn").onclick=()=>$("scenes").scrollIntoView({behavior:"smooth"});
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
  $("scenes")?.scrollIntoView({behavior:"smooth",block:"start"});
  status("status",state.blueprint?"Choose a shot below and tap Open Shot to continue.":"Build a movie blueprint first.");
 });
 document.querySelectorAll(".outline-btn,.gold-btn,.tab,.nav-item,.character,.shot button").forEach(el=>{
  el.style.touchAction="manipulation";
  el.style.webkitTapHighlightColor="transparent";
 });
});
