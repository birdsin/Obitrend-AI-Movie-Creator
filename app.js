document.addEventListener("DOMContentLoaded",()=>{
  if(state.blueprint && localStorage.getItem("obitrend_movie_blueprint")){
    renderBlueprint(state.blueprint);
  }
  verifyMoviePaymentReturn();
});
const state={blueprint:null,sceneIndex:0,shotIndex:0};
const assemblyState={queue:[],running:false,urls:{}};
try{const saved=localStorage.getItem("obitrend_movie_blueprint");if(saved)state.blueprint=JSON.parse(saved)}catch(e){}
const demoBlueprint={title:"The Rejected Boy",logline:"A young Nigerian boy with big dreams faces rejection from his family and community, but never gives up. Through hard work, faith and determination, he rises from being looked down on to becoming successful.",genre:"Drama",length:15,visualStyle:"Cinematic realism",visualBible:{},characters:[{name:"Chinedu",role:"Main Character",appearance:"Young, determined, kind",wardrobe:"Simple everyday clothing"},{name:"Mr. Okafor",role:"Father",appearance:"Strict, hardworking",wardrobe:"Simple work clothes"},{name:"Ngozi",role:"Mother",appearance:"Supportive, loving",wardrobe:"Traditional Nigerian clothing"},{name:"Emeka",role:"Rival",appearance:"Arrogant, jealous",wardrobe:"Modern casual clothing"}],scenes:[{heading:"The Rejection",location:"Village / Family House",duration:"2:00",shots:[{framing:"Close-up",angle:"Eye-level",camera:"Full-frame cinema camera",lens:"50mm",movement:"Slow push-in",focus:"Chinedu",lighting:"Natural daylight",sound:"Village ambience",continuity:"Chinedu leaves home"} ,{framing:"Medium shot",angle:"Slight high",camera:"Full-frame cinema camera",lens:"35mm",movement:"Static",focus:"Family",lighting:"Natural daylight",sound:"Family dialogue",continuity:"Family rejects Chinedu"}]},{heading:"The Dream",location:"City Street",duration:"2:00",shots:[{framing:"Medium shot",angle:"Tracking",camera:"Full-frame cinema camera",lens:"35mm",movement:"Tracking",focus:"Chinedu",lighting:"Warm city light",sound:"Traffic and footsteps",continuity:"Chinedu walks toward the city"},{framing:"Close-up",angle:"Eye-level",camera:"Full-frame cinema camera",lens:"50mm",movement:"Slow push-in",focus:"Chinedu",lighting:"Library practicals",sound:"Quiet study ambience",continuity:"Chinedu studies late"}]}]};
if(!state.blueprint)state.blueprint=demoBlueprint;const $=id=>document.getElementById(id);

function getMovieHistory(){
  try{
    const h=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]");
    return Array.isArray(h)?h:[];
  }catch(e){return []}
}
const MOVIE_PLANS={
  oneDay:{name:"1 Day Pro",priceNaira:5000,credits:1,durationDays:1},
  twoDays:{name:"2 Day Pro",priceNaira:10000,credits:2,durationDays:2},
  sixDays:{name:"6 Day Pro",priceNaira:20000,credits:4,durationDays:6},
  weekly:{name:"7 Day Pro",priceNaira:40000,credits:8,durationDays:7},
  fourteenDays:{name:"14 Day Pro",priceNaira:50000,credits:10,durationDays:14},
  monthly:{name:"1 Month Pro",priceNaira:100000,credits:20,durationDays:30}
};
function getMovieEntitlement(){
  if(movieServerEntitlement){
    return {
      plan:movieServerEntitlement.plan_name||"Free",
      active:Boolean(movieServerEntitlement.active),
      expiresAt:movieServerEntitlement.expires_at||null,
      credits:Number(movieServerEntitlement.credits||0),
      userId:movieServerEntitlement.public_user_id||window.moviePublicUserId||null
    };
  }
  return {plan:"Free",active:false,expiresAt:null,credits:0,userId:window.moviePublicUserId||null};
}
function setMoviePlan(plan,expiresAt=null){
  const value=String(plan||"Free");
  const data={plan:value,active:value!=="Free",expiresAt:expiresAt||null};
  localStorage.setItem("obitrend_movie_entitlement",JSON.stringify(data));
  localStorage.setItem("obitrend_movie_plan",value);
  if(value==="Free")localStorage.setItem("obitrend_movie_credits","0");
  updateAndroidStats();
  return data;
}
async function startMoviePayment(planKey){
  const plan=MOVIE_PLANS[planKey];
  if(!plan){status("status","Invalid movie plan.",true);return}
  try{
    let email=localStorage.getItem("obitrend_movie_email")||"";
    email=window.prompt("Enter the email you use for Paystack payment:",email)||"";
    email=email.trim().toLowerCase();
    if(!email)return;
    localStorage.setItem("obitrend_movie_email",email);
    status("status","Opening secure Paystack checkout…");
    await window.movieAuthReady;
    const token=await window.getMovieAccessToken();
    const r=await fetch("https://vjlitqujcujwsislprfg.supabase.co/functions/v1/movie-payment",{method:"POST",headers:{"content-type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({action:"initialize",plan:planKey,email})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||"Could not start payment.");
    localStorage.setItem("obitrend_movie_pending_reference",d.reference);
    localStorage.setItem("obitrend_movie_pending_plan",planKey);
    window.location.href=d.authorization_url;
  }catch(e){status("status",e.message||"Secure payment setup failed.",true)}
}
async function verifyMoviePaymentReturn(){
  const q=new URLSearchParams(window.location.search);
  if(q.get("movie_payment")!=="success")return;
  const reference=q.get("reference")||localStorage.getItem("obitrend_movie_pending_reference")||"";
  if(!reference)return;
  status("status","Verifying your movie payment…");
  try{
    await window.movieAuthReady;
    const token=await window.getMovieAccessToken();
    const r=await fetch("https://vjlitqujcujwsislprfg.supabase.co/functions/v1/movie-payment",{method:"POST",headers:{"content-type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({action:"verify",reference})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.success)throw new Error(d.error||"Payment verification failed.");
    localStorage.setItem("obitrend_movie_verified_reference",reference);
    localStorage.removeItem("obitrend_movie_pending_reference");
    localStorage.removeItem("obitrend_movie_pending_plan");
    if(d.email)localStorage.setItem("obitrend_movie_email",d.email);
    history.replaceState({},document.title,window.location.pathname);
    await refreshMovieEntitlement();
    status("status",d.planName+" activated. "+d.credits+" movie credits added.");
    setTimeout(()=>{resumeSavedMovieAfterPayment();},350);
  }catch(e){status("status",e.message||"Payment verification failed.",true)}
}
let movieServerEntitlement=null;
async function refreshMovieEntitlement(){
  await window.movieAuthReady;
  const token=await window.getMovieAccessToken();
  const r=await fetch("https://vjlitqujcujwsislprfg.supabase.co/functions/v1/movie-credit",{method:"POST",headers:{"content-type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({action:"status"})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||"Could not load your movie entitlement.");
  movieServerEntitlement=d||{plan_name:"Free",credits:0,active:false};
  updateAndroidStats();
  return movieServerEntitlement;
}
function getMovieCredits(){return Number(movieServerEntitlement?.credits||0)}
function setMovieCredits(){updateAndroidStats();return getMovieCredits()}
async function reserveMovieCredit(){
  await window.movieAuthReady;
  const token=await window.getMovieAccessToken();

  // A reservation is temporary. Validate it immediately before handing it to
  // the video endpoint so an expired/stale token can never reach generation.
  // If validation fails, release/refund that reservation and create one fresh.
  for(let attempt=0;attempt<2;attempt++){
    const r=await fetch("https://vjlitqujcujwsislprfg.supabase.co/functions/v1/movie-credit",{
      method:"POST",
      headers:{"content-type":"application/json","Authorization:"Bearer "+token},
      body:JSON.stringify({action:"reserve"})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||"No movie credits available. Please upgrade your Pro plan.");

    movieServerEntitlement=movieServerEntitlement||{};
    movieServerEntitlement.credits=Number(d.remaining_credits||0);
    updateAndroidStats();

    const reservationToken=String(d?.reservation_token||d?.reservationToken||d?.token||"").trim();
    if(!reservationToken)throw new Error("Could not create a secure movie credit reservation. Please try again.");

    const vr=await fetch("https://vjlitqujcujwsislprfg.supabase.co/functions/v1/movie-credit",{
      method:"POST",
      headers:{"content-type":"application/json","Authorization:"Bearer "+token},
      body:JSON.stringify({action:"validate",token:reservationToken})
    });
    const vd=await vr.json().catch(()=>({}));

    if(vr.ok&&vd.valid===true)return reservationToken;

    // The reservation was not usable. Release it if possible so the user's
    // credit is never lost, then obtain one clean reservation.
    try{
      await fetch("https://vjlitqujcujwsislprfg.supabase.co/functions/v1/movie-credit",{
        method:"POST",
        headers:{"content-type":"application/json","Authorization:"Bearer "+token},
        body:JSON.stringify({action:"release",token:reservationToken})
      });
    }catch(_){}

    if(attempt===1){
      throw new Error("Could not create a valid movie credit reservation. Please try again.");
    }
  }
  throw new Error("Could not create a valid movie credit reservation. Please try again.");
}
async function movieProductionRequest(action,payload={}){
  await window.movieAuthReady;
  const token=await window.getMovieAccessToken();
  const r=await fetch("https://vjlitqujcujwsislprfg.supabase.co/functions/v1/movie-credit",{
    method:"POST",
    headers:{"content-type":"application/json","Authorization":"Bearer "+token},
    body:JSON.stringify({action,...payload})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||"Movie production service is temporarily unavailable.");
  return d;
}
async function createMovieProduction(blueprint,totalSegments){
  const d=await movieProductionRequest("production_create",{
    title:blueprint?.title||"Untitled Movie",
    blueprint,
    length_minutes:Number(blueprint?.length||1),
    total_segments:Number(totalSegments||0)
  });
  if(!d.production_id)throw new Error("Could not save the movie production.");
  localStorage.setItem("obitrend_movie_active_production_id",String(d.production_id));
  return String(d.production_id);
}
async function getMovieProduction(productionId){
  if(!productionId)return null;
  const d=await movieProductionRequest("production_status",{production_id:productionId});
  return d&&d.id?d:null;
}
async function saveMovieProductionSegment(productionId,segmentIndex,videoUrl){
  return movieProductionRequest("production_segment",{
    production_id:productionId,
    segment_index:Number(segmentIndex),
    video_url:String(videoUrl||"")
  });
}
async function setMovieProductionStatus(productionId,productionStatus){
  if(!productionId)return null;
  return movieProductionRequest("production_status_update",{
    production_id:productionId,
    status:productionStatus
  });
}
async function resumeSavedMovieAfterPayment(){
  const id=localStorage.getItem("obitrend_movie_active_production_id")||"";
  if(!id||typeof window.resumeMovieProduction!=="function")return false;
  try{
    await refreshMovieEntitlement();
    const production=await getMovieProduction(id);
    if(!production||production.status==="completed"||Number(production.completed_segments)>=Number(production.total_segments)){
      localStorage.removeItem("obitrend_movie_active_production_id");
      return false;
    }
    status("status","Credits added. Continuing your unfinished movie automatically…");
    await window.resumeMovieProduction(id,production);
    return true;
  }catch(e){
    console.error("Movie resume after payment:",e);
    status("status","Credits added. Your unfinished movie is saved and ready to continue.",false);
    return false;
  }
}

async function finishMovieCredit(action,token){
  const access=await window.getMovieAccessToken();
  const r=await fetch("https://vjlitqujcujwsislprfg.supabase.co/functions/v1/movie-credit",{method:"POST",headers:{"content-type":"application/json","Authorization":"Bearer "+access},body:JSON.stringify({action,token})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok)throw new Error(d.error||("Could not "+action+" movie credit."));
  try{await refreshMovieEntitlement()}catch(_){/* The credit operation already succeeded; never retry it automatically. */}
  return true;
}
function getMoviePlan(){return movieServerEntitlement?.plan_name||"Free"}
function getMoviePlanLabel(){
  const e=getMovieEntitlement();
  if(e.plan==="Free")return "Free";
  if(e.expiresAt){
    const d=new Date(e.expiresAt);
    if(!Number.isNaN(d.getTime()))return e.plan+" · "+d.toLocaleDateString();
  }
  return e.plan;
}
function updateAndroidStats(){
  const history=getMovieHistory();
  const movies=history.length;
  const scenes=history.reduce((total,item)=>{
    const list=item&&item.blueprint&&Array.isArray(item.blueprint.scenes)?item.blueprint.scenes:[];
    return total+list.length;
  },0);
  const moviesEl=$("androidMoviesCount"),scenesEl=$("androidScenesCount"),creditsEl=$("androidCreditsCount"),planEl=$("androidPlanStatus");
  if(moviesEl)moviesEl.textContent=String(movies);
  if(scenesEl)scenesEl.textContent=String(scenes);
  if(creditsEl)creditsEl.textContent=String(getMovieCredits());
  if(planEl)planEl.textContent=getMoviePlanLabel();
}
function status(id,msg,error){const e=$(id);e.textContent=msg;e.className="status"+(error?" error":"")}
$("buildBtn").onclick=async()=>{const prompt=$("moviePrompt").value.trim();if(!prompt){status("status","Enter your movie idea first.",true);return}const b=$("buildBtn");b.disabled=true;status("status","Building your cinematic blueprint…");try{const r=await fetch("/api/plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,length:Number($("length").value),genre:$("genre").value,visualStyle:$("visualStyle").value,ratio:$("ratio").value})});const text=await r.text();let d={};try{d=JSON.parse(text)}catch{}if(!r.ok)throw new Error(d.error||"Movie planning service is temporarily unavailable. Please try again.");state.blueprint=d.blueprint;try{localStorage.setItem("obitrend_movie_blueprint",JSON.stringify(d.blueprint))}catch(e){}renderBlueprint(d.blueprint);status("status","Blueprint ready.")}catch(e){status("status",e.message,true)}finally{b.disabled=false}};
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
const CHARACTER_IMAGES=[
  "https://images.unsplash.com/photo-1723221890385-6949a72be9da?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  "https://images.unsplash.com/photo-1542995719-06bfa52c0e11?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  "https://d1jcea4y7xhp7l.cloudfront.net/wp-content/uploads/2024/03/IMG-20240327-WA0077.jpg",
  "https://images.unsplash.com/photo-1750768132075-1e0a93963ac9?auto=format&fit=crop&fm=jpg&q=80&w=1200"
];
function showGeneratedBlueprint(){
  $("createPanel")?.classList.add("hidden");
  const legacy=$("legacyMovieDashboard");
  if(legacy){
    legacy.classList.add("movie-blueprint-visible");
    legacy.setAttribute("aria-hidden","false");
  }
  $("legacyMovieDashboard")?.scrollIntoView({behavior:"smooth",block:"start"});
}
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
$("generateShotBtn")?.addEventListener("click",generateShot);$("closeStudio")?.addEventListener("click",()=>{$("shotStudio")?.classList.add("hidden")});const legacyMenuBtn=$("menuBtn");if(legacyMenuBtn){legacyMenuBtn.onclick=()=>{const sidebar=$("sidebar");if(!sidebar)return;const opening=!sidebar.classList.contains("open");if(opening){sidebar.classList.add("open");$("menuWorkspace")?.classList.add("hidden");document.querySelectorAll(".nav-dropdown.open").forEach(x=>x.classList.remove("open"));document.querySelectorAll(".nav-chevron.open").forEach(x=>x.classList.remove("open"));legacyMenuBtn.setAttribute("aria-expanded","true")}else{sidebar.classList.remove("open");$("menuWorkspace")?.classList.add("hidden");document.querySelectorAll(".nav-dropdown.open").forEach(x=>x.classList.remove("open"));document.querySelectorAll(".nav-chevron.open").forEach(x=>x.classList.remove("open"));legacyMenuBtn.setAttribute("aria-expanded","false")}}}
async function generateShot(){
  if(!state.blueprint)return;
  const b=$("generateShotBtn");b.disabled=true;
  let reservation=null;
  try{
    await window.movieAuthReady;
    await refreshMovieEntitlement();
    reservation=await reserveMovieCredit();
    const token=await window.getMovieAccessToken();
    status("shotStatus","Sending shot to the video generator…");
    const r=await fetch("/api/generate-shot",{method:"POST",headers:{"content-type":"application/json","Authorization":"Bearer "+token,"x-movie-reservation":reservation},body:JSON.stringify({blueprint:state.blueprint,sceneIndex:state.sceneIndex,shotIndex:state.shotIndex,ratio:$("ratio").value,reservationToken:reservation})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){
      const e=new Error(d.error||"Shot generation failed.");
      e.creditReleased=Boolean(d.reservationReleased);
      throw e;
    }
    if(d.videoUrl){
      await finishMovieCredit("commit",reservation);
      reservation=null;
      showVideo(d.videoUrl);
      status("shotStatus","Shot ready.");
    }else if(d.taskId){
      await pollTask(d.taskId,reservation);
      reservation=null;
    }else{
      throw new Error("The video provider did not return a task.");
    }
  }catch(e){
    if(reservation&&!e?.creditReleased&&!e?.creditReleaseDeferred){
      try{await finishMovieCredit("release",reservation)}catch(_){}
    }
    status("shotStatus",e.message||"Shot generation failed.",true);
  }finally{b.disabled=false}
}
async function pollTask(id,reservation){
  for(let i=0;i<360;i++){
    status("shotStatus","Generating cinematic shot… "+Math.min(99,Math.round((i+1)/360*100))+"%");
    await new Promise(r=>setTimeout(r,5000+Math.floor(Math.random()*1500)));
    const token=await window.getMovieAccessToken();
    const r=await fetch("/api/generate-shot?taskId="+encodeURIComponent(id),{headers:{"Authorization":"Bearer "+token,"x-movie-reservation":reservation}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(d.error||"Video status check failed. Your movie credit remains protected while the provider status is checked.");e.creditReleaseDeferred=true;throw e;}
    if(d.status==="SUCCEEDED"&&d.videoUrl){
      await finishMovieCredit("commit",reservation);
      showVideo(d.videoUrl);
      status("shotStatus","Shot ready.");
      return;
    }
    if(d.status==="FAILED"||d.status==="CANCELED"){
      const e=new Error("The shot could not be generated. Your OBITREND movie credit was restored.");
      e.creditReleased=Boolean(d.reservationReleased);
      throw e;
    }
  }
  throw new Error("The shot is still processing. Keep this page open and wait for the movie to finish.");
}
function showVideo(url){$("videoPlaceholder").classList.add("hidden");$("shotVideo").src=url;$("shotVideo").classList.remove("hidden");$("shotVideo").load()}

window.addEventListener("DOMContentLoaded",()=>{updateAndroidStats();if(state.blueprint)renderBlueprint(state.blueprint)});
window.addEventListener("DOMContentLoaded",async()=>{try{await refreshMovieEntitlement();}catch(e){status("status",e.message||"Secure Movie Creator account setup is unavailable.",true)}});

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
 $("menuWorkspaceTitle").textContent=title||"OBITREND";
 $("menuWorkspaceSubtitle").textContent=subtitle||"";
 $("menuWorkspaceBody").innerHTML=html||"";
 w.classList.remove("hidden");
 w.setAttribute("aria-hidden","false");
 document.body.classList.add("menu-workspace-open");
}
function menuClose(){
 const w=$("menuWorkspace"); if(!w)return;
 w.classList.add("hidden");
 w.setAttribute("aria-hidden","true");
 document.body.classList.remove("menu-workspace-open");
}
function menuButton(label,action,cls="outline-btn"){return '<button class="'+cls+' menu-action" data-menu-action="'+esc(action)+'">'+esc(label)+'</button>'}
function renderMenuCard(title,text,action){
 return '<div class="menu-card"><div><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p></div>'+menuButton("Open",action)+'</div>'
}
function saveHistory(b,videoUrl="",shortNumber=null,videoUrls=null){
 try{
  if(!b||(!videoUrl&&(!Array.isArray(videoUrls)||!videoUrls.length)))return false;
  const h=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]");
  const urls=Array.isArray(videoUrls)?videoUrls.filter(Boolean).map(String):[];
  const primary=String(videoUrl||urls[0]||"");
  const baseTitle=b.title||"Untitled Movie";
  const title=Number(shortNumber)>1?baseTitle+" — Short "+Number(shortNumber):baseTitle;
  h.unshift({title,genre:b.genre||"",length:b.length||"",created:new Date().toISOString(),generated:true,videoUrl:primary,videoUrls:urls,blueprint:b,shortNumber:Number(shortNumber)||1});
  localStorage.setItem("obitrend_movie_history",JSON.stringify(h.filter(x=>x&&x.generated===true&&(x.videoUrl||(Array.isArray(x.videoUrls)&&x.videoUrls.length))).slice(0,20)));
  return true;
 }catch(e){return false}
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
  pro:()=>{
    const renderPro=()=>{
      const e=getMovieEntitlement();
      const expiry=e.expiresAt?new Date(e.expiresAt).toLocaleDateString():"Not set";
      menuOpen("Pro Plans","Premium movie creation options.",
        '<div class="credit-box"><strong>'+esc(e.plan||"Free")+'</strong><span>Current plan</span></div>'+
        '<div class="status">User ID: '+esc(e.userId||window.moviePublicUserId||"Creating…")+'</div>'+
        '<div class="status">Movie credits: '+getMovieCredits()+' · Expiry: '+esc(expiry)+'</div>'+
        renderMenuCard("1 Day Pro","₦5,000 · 1 video credit · 1 day","pro:oneDay")+
        renderMenuCard("2 Day Pro","₦10,000 · 2 video credits · 2 days","pro:twoDays")+
        renderMenuCard("6 Day Pro","₦20,000 · 4 video credits · 6 days","pro:sixDays")+
        renderMenuCard("7 Day Pro","₦40,000 · 8 video credits · 7 days","pro:weekly")+
        renderMenuCard("14 Day Pro","₦50,000 · 10 video credits · 14 days","pro:fourteenDays")+
        renderMenuCard("1 Month Pro","₦100,000 · 20 video credits · 1 month","pro:monthly")+
        '<div class="status">Plan activation must come from the payment/entitlement system. This screen does not create a paid subscription by itself.</div>');
    };
    renderPro();
    Promise.resolve(window.movieAuthReady)
      .then(()=>refreshMovieEntitlement())
      .then(()=>renderPro())
      .catch(()=>renderPro());
  },
  credits:()=>menuOpen("My Credits","Your current movie studio credit balance.",
    '<div class="credit-box"><strong>'+getMovieCredits()+'</strong><span>Credits available</span></div>'+
    '<div class="status">User ID: '+esc(getMovieEntitlement().userId||"Creating…")+'</div>'+
    '<div class="status">Plan: '+esc(getMoviePlanLabel())+'</div>'+
    renderMenuCard("How credits work","One movie credit is consumed only after a video shot is successfully generated.","credits-info")+
    '<div id="menuActionStatus" class="status"></div>'),
  settings:()=>{
   const renderSettings=()=>{
     const e=getMovieEntitlement();
     menuOpen("Settings","Live account balance and Movie Creator settings.",
       '<div class="settings-live-grid">'+
       '<div class="credit-box"><strong>'+getMovieCredits()+'</strong><span>Live movie credits</span></div>'+
       '<div class="status">Plan: <b>'+esc(e.plan||"Free")+'</b><br>User ID: '+esc(e.userId||window.moviePublicUserId||"Creating…")+'<br>Expiry: '+esc(e.expiresAt?new Date(e.expiresAt).toLocaleDateString():"—")+'</div>'+
       '</div>'+
       '<div class="settings-list">'+
       '<label class="setting-row"><span>Save movie history</span><input id="settingHistory" type="checkbox" checked></label>'+
       '<button class="outline-btn menu-action" data-menu-action="clear-history">Clear saved history</button>'+
       '<button class="outline-btn menu-action" data-menu-action="clear-project">Clear current project</button>'+
       '<button class="logout-btn" id="movieLogoutBtn" type="button">Logout</button>'+
       '</div><div id="menuActionStatus" class="status"></div>');
     document.getElementById("movieLogoutBtn")?.addEventListener("click",async()=>{
       const b=document.getElementById("movieLogoutBtn"); if(b)b.disabled=true;
       try{await window.movieAuthReady; await window.movieSupabase?.auth?.signOut(); window.location.reload();}
       catch(e){if(b)b.disabled=false; const s=$("menuActionStatus");if(s)s.textContent=e?.message||"Logout failed."; }
     });
   };
   renderSettings();
   Promise.resolve(window.movieAuthReady).then(()=>refreshMovieEntitlement()).then(renderSettings).catch(()=>renderSettings());
 },
  help:()=>menuOpen("Help & Support","Quick help for the Movie Creator.",renderMenuCard("How do I create a movie?","Open Create Image, enter an idea, then build your cinematic blueprint.","help:create")+renderMenuCard("How do I generate video?","Open Create Video, choose a shot, then use Generate This Shot.","help:video")+renderMenuCard("Generation failed?","Your blueprint stays saved so you can try the shot again.","help:error"))
 };
 (actions[name]||actions.home)();
}
document.querySelectorAll(".nav-item").forEach(a=>a.addEventListener("click",e=>{if(a.closest(".nav-group")?.querySelector(".nav-dropdown"))return;const href=a.getAttribute("href")||"#home";if(href.startsWith("#")){e.preventDefault();openMenu(href.slice(1));document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("selected"));a.classList.add("selected")}}));
const closeWorkspaceButton=()=>{
 if(typeof window.navigateTo==="function"){
   window.navigateTo("home");
   return;
 }
 const w=$("menuWorkspace");
 if(!w)return;
 w.classList.add("hidden");
 w.setAttribute("aria-hidden","true");
 document.body.classList.remove("menu-workspace-open");
};
$("menuWorkspaceClose")?.addEventListener("pointerdown",e=>{
 e.preventDefault();
 e.stopPropagation();
 closeWorkspaceButton();
},{passive:false});
$("menuWorkspaceClose")?.addEventListener("click",e=>{
 e.preventDefault();
 e.stopPropagation();
 closeWorkspaceButton();
},{passive:false});
$("menuWorkspaceBack")?.addEventListener("pointerup",e=>{
 e.preventDefault();
 e.stopPropagation();
 menuClose();
 const drawer=$("androidDrawer");
 const overlay=$("drawerOverlay");
 if(drawer)drawer.classList.remove("open");
 if(overlay)overlay.classList.remove("open");
 document.body.classList.remove("menu-workspace-open");
 const dashboard=$("promptDashboard");
 if(dashboard){
   dashboard.classList.remove("hidden");
   dashboard.setAttribute("data-page","home");
   dashboard.scrollIntoView({behavior:"smooth",block:"start"});
 }
},{passive:false});
$("menuWorkspaceBack")?.addEventListener("click",e=>{
 e.preventDefault();
 e.stopPropagation();
 menuClose();
 const drawer=$("androidDrawer");
 const overlay=$("drawerOverlay");
 if(drawer)drawer.classList.remove("open");
 if(overlay)overlay.classList.remove("open");
 document.body.classList.remove("menu-workspace-open");
 const dashboard=$("promptDashboard");
 if(dashboard){
   dashboard.classList.remove("hidden");
   dashboard.setAttribute("data-page","home");
   dashboard.scrollIntoView({behavior:"smooth",block:"start"});
 }
},{passive:false});
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-menu-action]");if(!b)return;const action=b.dataset.menuAction;
 if(action.startsWith("template:")){const x=MENU_DATA.templates[+action.split(":")[1]];$("moviePrompt").value=x[1];$("createPanel").classList.remove("hidden");menuClose();$("createPanel").scrollIntoView({behavior:"smooth"});return}
 if(action.startsWith("model:")){localStorage.setItem("obitrend_movie_model_style",MENU_DATA.models[+action.split(":")[1]]);$("visualStyle").value=MENU_DATA.models[+action.split(":")[1]];status("status","Model style selected: "+MENU_DATA.models[+action.split(":")[1]]);return}
 if(action.startsWith("background:")){localStorage.setItem("obitrend_movie_background",MENU_DATA.backgrounds[+action.split(":")[1]]);status("status","Background selected: "+MENU_DATA.backgrounds[+action.split(":")[1]]);return}
 if(action.startsWith("color:")){localStorage.setItem("obitrend_movie_color",MENU_DATA.colors[+action.split(":")[1]]);status("status","Outfit color selected: "+MENU_DATA.colors[+action.split(":")[1]]);return}
 if(action==="poster"||action==="still"){const p=$("menuImagePrompt")?.value.trim()||state.blueprint?.logline||"Create a cinematic movie frame";$("menuActionStatus").textContent=(action==="poster"?"Poster prompt ready: ":"Cinematic still prompt ready: ")+p;return}
 if(action.startsWith("history:")){let h=[];try{h=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]")}catch(e){}const x=h[+action.split(":")[1]];if(x?.blueprint){state.blueprint=x.blueprint;renderBlueprint(x.blueprint);menuClose();window.scrollTo({top:0,behavior:"smooth"})}return}
 if(action.startsWith("pro:")){const key=action.slice(4);startMoviePayment(key);return}
 if(action==="credits-info"){const s=$("menuActionStatus");if(s)s.textContent="Movie credits are consumed by video-shot generation.";return}
 if(action==="clear-history"){localStorage.removeItem("obitrend_movie_history");updateAndroidStats();const s=$("menuActionStatus");if(s)s.textContent="Saved movie history cleared.";return}
 if(action==="clear-project"){localStorage.removeItem("obitrend_movie_blueprint");state.blueprint=demoBlueprint;renderBlueprint(state.blueprint);updateAndroidStats();const s=$("menuActionStatus");if(s)s.textContent="Current project reset.";return}
 if(action.startsWith("help:")){const s=$("menuActionStatus");if(s)s.textContent=action.endsWith("create")?"Enter a movie idea, choose options, and tap Build Movie Blueprint.":action.endsWith("video")?"Open a shot and tap Generate This Shot. The status area shows progress.":"Your project blueprint remains saved while a shot is being generated."}
});
const originalBuildHandler=$("buildBtn")?.onclick;
if(originalBuildHandler)$("buildBtn").onclick=async()=>{await originalBuildHandler();if(state.blueprint)saveHistory(state.blueprint);updateAndroidStats()};

/* Reliable mobile Create Movie button binding */
document.addEventListener("DOMContentLoaded",()=>{
  const build=$("buildBtn");
  if(!build)return;
  build.type="button";
  build.style.touchAction="manipulation";
  let running=false;
  const runBuild=async(e)=>{
    if(e&&e.cancelable)e.preventDefault();
    if(running)return;
    const prompt=$("moviePrompt")?.value.trim();
    if(!prompt){
      status("status","Enter your movie idea first.",true);
      $("moviePrompt")?.focus();
      return;
    }
    running=true;
    build.disabled=true;
    status("status","Building your cinematic blueprint…");
    try{
      const r=await fetch("/api/plan",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          prompt,
          length:Number($("length")?.value||15),
          genre:$("genre")?.value||"Drama",
          visualStyle:$("visualStyle")?.value||"Cinematic realism",
          ratio:$("ratio")?.value||"16:9"
        })
      });
      const text=await r.text();
      let d={};try{d=JSON.parse(text)}catch{}
      if(!r.ok)throw new Error(d.error||"Movie planning service is temporarily unavailable. Please try again.");
      if(!d.blueprint)throw new Error("The movie planner returned no blueprint. Please try again.");
      state.blueprint=d.blueprint;
      try{localStorage.setItem("obitrend_movie_blueprint",JSON.stringify(d.blueprint))}catch(e){}
      renderBlueprint(d.blueprint);
      showGeneratedBlueprint();
      saveHistory(d.blueprint);
      updateAndroidStats();
      status("status","Blueprint ready.");
    }catch(e){
      status("status",e?.message||"Movie planning failed. Please try again.",true);
    }finally{
      running=false;
      build.disabled=false;
    }
  };
  build.onclick=null;
  build.addEventListener("pointerup",runBuild,{passive:false});
  build.addEventListener("click",runBuild,{passive:false});
});

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
  await window.movieAuthReady;
  await refreshMovieEntitlement();
  let reservation=null;
  try{
    reservation=await reserveMovieCredit();
    const token=await window.getMovieAccessToken();
    item.state="generating";renderAssembly();
    const r=await fetch("/api/generate-shot",{
      method:"POST",
      headers:{"content-type":"application/json","Authorization":"Bearer "+token,"x-movie-reservation":reservation},
      body:JSON.stringify({blueprint:state.blueprint,sceneIndex:item.si,shotIndex:item.hi,ratio:$("ratio").value,reservationToken:reservation})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok){
      const e=new Error(d.error||"Shot generation failed.");
      e.creditReleased=Boolean(d.reservationReleased);
      throw e;
    }
    if(d.videoUrl){
      await finishMovieCredit("commit",reservation);
      reservation=null;
      return d.videoUrl;
    }
    if(!d.taskId)throw new Error("The video provider did not return a task.");

    for(let i=0;i<360;i++){
      $("assemblyStatus").textContent="Generating Scene "+(item.si+1)+" Shot "+(item.hi+1)+"… "+Math.min(99,Math.round((i+1)/360*100))+"%";
      await new Promise(r=>setTimeout(r,5000+Math.floor(Math.random()*1500)));
      const pollToken=await window.getMovieAccessToken();
      const s=await fetch("/api/generate-shot?taskId="+encodeURIComponent(d.taskId),{headers:{"Authorization":"Bearer "+pollToken,"x-movie-reservation":reservation}});
      const x=await s.json().catch(()=>({}));
      if(!s.ok){const e=new Error(x.error||"Video status check failed. Your movie credit remains protected while the provider status is checked.");e.creditReleaseDeferred=true;throw e;}
      if(x.status==="SUCCEEDED"&&x.videoUrl){
        await finishMovieCredit("commit",reservation);
        reservation=null;
        return x.videoUrl;
      }
      if(x.status==="FAILED"||x.status==="CANCELED"){
        const e=new Error("The shot could not be generated. Your OBITREND movie credit was restored.");
        e.creditReleased=Boolean(x.reservationReleased);
        throw e;
      }
    }
    throw new Error("The shot is still processing. Keep this page open and wait for the movie to finish.");
  }catch(e){
    if(reservation&&!e?.creditReleased&&!e?.creditReleaseDeferred){
      try{await finishMovieCredit("release",reservation)}catch(_){}
    }
    throw e;
  }
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
    if(action.startsWith("pro:")){const key=action.slice(4);startMoviePayment(key);return}
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
  $("androidSeeMovies")?.addEventListener("click",()=>{
    document.querySelector(".android-projects")?.scrollIntoView({behavior:"smooth",block:"start"});
  });

  function openMovieProject(index){
    if(index===0 && state.blueprint){
      renderBlueprint(state.blueprint);
      showGeneratedBlueprint();
      const nav=document.querySelector(".android-bottom-nav");
      nav?.querySelectorAll("button").forEach(x=>x.classList.remove("active"));
      nav?.querySelectorAll("button")[2]?.classList.add("active");
      return;
    }
    notify("This project is ready to be connected to your saved movie library.");
  }
  document.querySelectorAll(".android-projects button").forEach((b,i)=>{
    b.type="button";
    b.style.touchAction="manipulation";
    b.addEventListener("pointerup",e=>{e.preventDefault();openMovieProject(i)},{passive:false});
    b.addEventListener("click",e=>{e.preventDefault();openMovieProject(i)},{passive:false});
  });

  const nav=document.querySelector(".android-bottom-nav");
  const setNavActive=(id)=>{
    nav?.querySelectorAll("button").forEach(x=>x.classList.remove("active"));
    document.getElementById(id)?.classList.add("active");
  };
  $("androidHomeNav")?.addEventListener("click",()=>{
    menuClose();document.getElementById("androidDrawer")?.classList.remove("open");
    setNavActive("androidHomeNav");window.scrollTo({top:0,behavior:"smooth"});
  });
  $("androidCreateNav")?.addEventListener("click",()=>{
    menuClose();document.getElementById("androidDrawer")?.classList.remove("open");
    setNavActive("androidCreateNav");showCreate();
  });
  $("androidMoviesNav")?.addEventListener("click",()=>{
    document.getElementById("androidDrawer")?.classList.remove("open");
    setNavActive("androidMoviesNav");openMenu("creations");
  });
  $("androidTemplatesNav")?.addEventListener("click",()=>{
    document.getElementById("androidDrawer")?.classList.remove("open");
    setNavActive("androidTemplatesNav");openMenu("templates");
  });
  $("androidProfileNav")?.addEventListener("click",()=>{
    document.getElementById("androidDrawer")?.classList.remove("open");
    setNavActive("androidProfileNav");openMenu("pro");
  });

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
        else if(a==="movies"){close();window.navigateTo?.("my-movies");}
        else if(a==="credits"){close();openMenu("credits");}
        else {close();notify(a==="settings"?"Settings will be available here.":"Help & Support will be available here.");}
      });
    }
    menuBtn.addEventListener("click",()=>drawer.classList.toggle("open"));
  }
});

/* FINAL MOBILE DRAWER NAVIGATION FIX — stable 41ae317, no router */
(function(){
  const byId=id=>document.getElementById(id);
  const drawer=byId("androidDrawer");
  const overlay=byId("drawerOverlay");
  if(!drawer)return;
  window.lucide?.createIcons?.();

  function closeDrawer(){
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden","true");
    overlay?.classList.remove("open");
    overlay?.setAttribute("aria-hidden","true");
    document.body.style.overflow="";
  }
  function openDrawer(){
    closeWorkspace();
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden","false");
    overlay?.classList.add("open");
    overlay?.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }
  function closeWorkspace(){
    const w=byId("menuWorkspace");
    if(w){w.classList.add("hidden");w.setAttribute("aria-hidden","true");}
    document.body.classList.remove("menu-workspace-open");
  }
  function setActive(page){
    drawer.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===page));
  }
  function safeScroll(el){
    if(!el)return false;
    try{el.scrollIntoView({behavior:"smooth",block:"start"});return true}catch(_){el.scrollIntoView();return true}
  }
  function showCreate(){
    const p=byId("createPanel");
    if(!p)return;
    p.classList.remove("hidden");
    safeScroll(p);
    setTimeout(()=>byId("moviePrompt")?.focus(),250);
  }
  function navigateTo(page){
    try{
      closeDrawer();
      setActive(page);
      if(page==="home"){
        closeWorkspace();
        window.scrollTo({top:0,behavior:"smooth"});
        return;
      }
      if(page==="create"){
        closeWorkspace();
        showCreate();
        return;
      }
      if(page==="my-movies"){
        let h=[];
        try{h=JSON.parse(localStorage.getItem("obitrend_movie_history")||"[]")}catch(_){h=[]}
        const body=h.length?h.map((x,i)=>'<div class="menu-card"><div><h3>'+esc(x.title||"Untitled Movie")+'</h3><p>'+esc(x.genre||"")+' · '+esc(x.length||"")+' minutes · '+new Date(x.created||Date.now()).toLocaleString()+'</p></div>'+menuButton("Open","history:"+i)+'</div>').join(""):'<div class="empty-menu">No saved movies yet. Build your first movie blueprint.</div>';
        menuOpen("My Movies","Your saved movie projects on this device.",body);
        return;
      }
      if(page==="pro"){
        openMenu("pro");
        return;
      }
      if(page==="settings"){
        openMenu("settings");
        return;
      }
      navigateTo("home");
    }catch(e){
      console.error("OBITREND navigation error:",e);
      closeDrawer();closeWorkspace();setActive("home");
      window.scrollTo({top:0,behavior:"smooth"});
    }
  }
  window.navigateTo=navigateTo;
  window.openDrawer=openDrawer;
  window.closeDrawer=closeDrawer;

  const menuButtons=[byId("pmMenuBtn"),byId("androidMenuBtn")].filter(Boolean);
  menuButtons.forEach(btn=>{
    btn.type="button";
    btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openDrawer();},{passive:false});
  });
  byId("androidDrawerClose")?.addEventListener("click",e=>{e.preventDefault();closeDrawer();});
  overlay?.addEventListener("click",closeDrawer);
  drawer.addEventListener("click",e=>{
    const btn=e.target.closest("[data-nav]");
    if(!btn)return;
    e.preventDefault();e.stopPropagation();
    navigateTo(btn.dataset.nav);
  },{passive:false});
  byId("menuWorkspaceClose")?.addEventListener("click",closeWorkspace);
  const workspaceBack=byId("menuWorkspaceBack");
  if(workspaceBack){
    let backLock=false;
    const goBackToMenu=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      if(backLock)return;
      backLock=true;
      closeWorkspace();
      openDrawer();
      window.setTimeout(()=>{backLock=false},400);
    };
    workspaceBack.addEventListener("pointerup",goBackToMenu,{passive:false});
    workspaceBack.addEventListener("click",goBackToMenu,{passive:false});
  }
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeDrawer();closeWorkspace();}});
})();

// Public movie-client bridge for the prompt dashboard. Keep the existing workflow unchanged.
window.refreshMovieEntitlement=refreshMovieEntitlement;
window.reserveMovieCredit=reserveMovieCredit;
window.finishMovieCredit=finishMovieCredit;
window.generateShot=generateShot;
window.getMovieCredits=getMovieCredits;
window.createMovieProduction=createMovieProduction;
window.getMovieProduction=getMovieProduction;
window.setMovieProductionStatus=setMovieProductionStatus;
window.saveMovieProductionSegment=saveMovieProductionSegment;
window.saveHistory=saveHistory;
