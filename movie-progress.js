(function(){
  const STYLE_ID="movieProgressCardStyles";
  const CARD_ID="movieProgressCard";
  const SNAPSHOT_KEY="obitrend_movie_last_production_snapshot";
  let timer=null;
  let productionId="";

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement("style");
    s.id=STYLE_ID;
    s.textContent=`
      .movie-progress-card{margin:16px 0 0;background:linear-gradient(145deg,#101722,#0a0e15);border:1px solid rgba(230,185,94,.24);border-radius:22px;padding:18px;box-shadow:0 18px 55px rgba(0,0,0,.28);overflow:hidden}
      .movie-progress-head{display:flex;align-items:center;gap:12px}
      .movie-progress-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#e6b95e,#9b7429);color:#111;font-size:20px;box-shadow:0 8px 25px rgba(230,185,94,.18)}
      .movie-progress-title{flex:1}.movie-progress-title b{display:block;font-size:16px}.movie-progress-title span{display:block;color:#8f98a8;font-size:11px;margin-top:4px}
      .movie-progress-percent{font-size:24px;font-weight:900;color:#e6b95e;min-width:58px;text-align:right}
      .movie-progress-track{height:10px;background:#070a10;border:1px solid rgba(255,255,255,.08);border-radius:999px;margin:17px 0 12px;overflow:hidden}
      .movie-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#9b7429,#e6b95e,#f3d17b);border-radius:999px;transition:width .6s ease;box-shadow:0 0 18px rgba(230,185,94,.28)}
      .movie-progress-meta{display:flex;justify-content:space-between;gap:10px;color:#aeb5c2;font-size:12px}
      .movie-progress-meta strong{color:#f7f7f8}
      .movie-progress-status{margin-top:13px;color:#8f98a8;font-size:12px;line-height:1.55;display:flex;align-items:center;gap:8px}
      .movie-progress-dot{width:8px;height:8px;border-radius:50%;background:#e6b95e;box-shadow:0 0 0 5px rgba(230,185,94,.08);animation:movieProgressPulse 1.4s infinite}
      .movie-progress-card.done{border-color:rgba(109,206,159,.35)}.movie-progress-card.done .movie-progress-percent{color:#74cfa3}.movie-progress-card.done .movie-progress-fill{background:linear-gradient(90deg,#4f9c79,#74cfa3)}.movie-progress-card.done .movie-progress-dot{background:#74cfa3;animation:none}
      .movie-progress-card.failed{border-color:rgba(255,100,100,.35)}.movie-progress-card.failed .movie-progress-percent{color:#ff9b9b}.movie-progress-card.failed .movie-progress-dot{background:#ff7373;animation:none}
      .movie-progress-card.idle{border-color:rgba(230,185,94,.18)}.movie-progress-card.idle .movie-progress-dot{animation:none;opacity:.65}
      @keyframes movieProgressPulse{50%{opacity:.35;transform:scale(.75)}}
      @media(max-width:600px){.movie-progress-card{padding:15px}.movie-progress-percent{font-size:21px}.movie-progress-meta{font-size:11px}}
    `;
    document.head.appendChild(s);
  }

  function ensureCard(){
    let card=document.getElementById(CARD_ID);
    if(card)return card;
    const host=document.querySelector(".pipeline-input");
    if(!host)return null;
    card=document.createElement("section");
    card.id=CARD_ID;
    card.className="movie-progress-card idle";
    card.hidden=false;
    card.innerHTML=`
      <div class="movie-progress-head">
        <div class="movie-progress-icon">▶</div>
        <div class="movie-progress-title"><b id="movieProgressTitle">Movie generation</b><span id="movieProgressSubtitle">Ready for your movie generation</span></div>
        <div id="movieProgressPercent" class="movie-progress-percent">0%</div>
      </div>
      <div class="movie-progress-track" aria-label="Movie generation progress"><div id="movieProgressFill" class="movie-progress-fill"></div></div>
      <div class="movie-progress-meta"><span>Shots <strong id="movieProgressShots">0 / 0</strong></span><span id="movieProgressProvider">Flixly · ready</span></div>
      <div class="movie-progress-status"><span class="movie-progress-dot"></span><span id="movieProgressStatus">No movie generation is currently running.</span></div>
    `;
    host.appendChild(card);
    return card;
  }

  function setText(id,value){const e=document.getElementById(id);if(e)e.textContent=String(value??"");}

  function saveSnapshot(p){
    try{
      localStorage.setItem(SNAPSHOT_KEY,JSON.stringify({
        id:p?.id||productionId||"",
        title:p?.title||"Movie generation",
        status:p?.status||"generating",
        provider_status:p?.provider_status||"waiting",
        completed_segments:Number(p?.completed_segments)||0,
        total_segments:Number(p?.total_segments)||0,
        last_error:p?.last_error||"",
        video_urls:Array.isArray(p?.video_urls)?p.video_urls.filter(Boolean).map(String):[],
        updated_at:p?.updated_at||new Date().toISOString()
      }));
    }catch(_){}
  }

  function readSnapshot(){
    try{
      const p=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||"null");
      return p&&typeof p==="object"?p:null;
    }catch(_){return null}
  }

  function renderIdle(){
    const card=ensureCard();if(!card)return;
    card.hidden=false;
    card.classList.remove("done","failed");card.classList.add("idle");
    setText("movieProgressTitle","Movie generation");
    setText("movieProgressSubtitle","Ready for your movie generation");
    setText("movieProgressPercent","0%");
    const fill=document.getElementById("movieProgressFill");if(fill)fill.style.width="0%";
    setText("movieProgressShots","0 / 0");
    setText("movieProgressProvider","Provider · ready");
    setText("movieProgressStatus","No movie generation is currently running.");
  }

  function updateCard(p){
    const card=ensureCard();if(!card)return;
    card.hidden=false;
    const total=Math.max(1,Number(p?.total_segments)||1);
    const completed=Math.max(0,Math.min(total,Number(p?.completed_segments)||0));
    let percent=Math.round((completed/total)*100);
    const status=String(p?.status||"generating").toLowerCase();
    const provider=String(p?.provider_status||"waiting").toLowerCase();
    if(status==="completed")percent=100;
    card.classList.toggle("done",status==="completed");
    card.classList.toggle("failed",status==="failed");
    card.classList.toggle("idle",status!=="completed"&&status!=="failed"&&provider!=="processing");
    setText("movieProgressTitle",p?.title||"Movie generation");
    setText("movieProgressSubtitle",
      status==="completed"?"Movie generation complete":
      status==="failed"?"Movie generation failed":
      "Generation continues in the background");
    setText("movieProgressPercent",percent+"%");
    const fill=document.getElementById("movieProgressFill");if(fill)fill.style.width=percent+"%";
    setText("movieProgressShots",completed+" / "+total);
    const taskProvider=String(p?.provider_task_id||"").toLowerCase().startsWith("kling:")?"Kling":"Flixly";
    setText("movieProgressProvider",taskProvider+" · "+(status==="failed"?"failed":status==="completed"?"ready":(provider==="processing"?"processing":provider)));
    let message;
    if(status==="completed")message="All shots generated successfully. Your movie is ready for the next final-cut step.";
    else if(status==="failed")message=p?.last_error||"Movie generation failed. Your reserved credit was protected.";
    else if(provider==="processing")message="Shot "+Math.min(total,completed+1)+" of "+total+" is currently generating.";
    else message="Your movie is queued and will continue automatically.";
    setText("movieProgressStatus",message);
    saveSnapshot(p);
  }

  async function poll(){
    const card=ensureCard();
    if(!card)return;
    const id=localStorage.getItem("obitrend_movie_active_production_id")||"";
    if(id){
      if(id!==productionId)productionId=id;
      if(!window.getMovieProduction)return;
      try{
        const p=await window.getMovieProduction(id);
        if(p){updateCard(p);return;}
      }catch(_){}
    }
    const snapshot=readSnapshot();
    if(snapshot){
      updateCard(snapshot);
      return;
    }
    renderIdle();
  }

  function start(){
    injectStyles();
    ensureCard();
    poll();
    if(!timer)timer=setInterval(poll,5000);
  }

  document.addEventListener("DOMContentLoaded",start);
  window.addEventListener("movieBackgroundGenerationStarted",start);
  window.movieProgressRefresh=start;
})();