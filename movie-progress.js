(function(){
  const STYLE_ID="movieProgressCardStyles";
  const CARD_ID="movieProgressCard";
  let timer=null;
  let productionId="";
  let lastStatus="";

  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}

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
    card.className="movie-progress-card";
    card.hidden=true;
    card.innerHTML=`
      <div class="movie-progress-head">
        <div class="movie-progress-icon">▶</div>
        <div class="movie-progress-title"><b id="movieProgressTitle">Movie generation</b><span id="movieProgressSubtitle">Preparing background generation…</span></div>
        <div id="movieProgressPercent" class="movie-progress-percent">0%</div>
      </div>
      <div class="movie-progress-track" aria-label="Movie generation progress"><div id="movieProgressFill" class="movie-progress-fill"></div></div>
      <div class="movie-progress-meta"><span>Shots <strong id="movieProgressShots">0 / 0</strong></span><span id="movieProgressProvider">Flixly · waiting</span></div>
      <div class="movie-progress-status"><span class="movie-progress-dot"></span><span id="movieProgressStatus">Waiting for a movie generation to start.</span></div>
    `;
    host.appendChild(card);
    return card;
  }

  function updateCard(p){
    const card=ensureCard(); if(!card)return;
    card.hidden=false;
    const total=Math.max(1,Number(p?.total_segments)||1);
    const completed=Math.max(0,Math.min(total,Number(p?.completed_segments)||0));
    let percent=Math.round((completed/total)*100);
    const status=String(p?.status||"generating").toLowerCase();
    const provider=String(p?.provider_status||"waiting").toLowerCase();
    if(status==="completed")percent=100;
    card.classList.toggle("done",status==="completed");
    card.classList.toggle("failed",status==="failed");
    document.getElementById("movieProgressTitle").textContent=p?.title||"Movie generation";
    document.getElementById("movieProgressSubtitle").textContent=status==="completed"?"Movie generation complete":"Generation continues in the background";
    document.getElementById("movieProgressPercent").textContent=percent+"%";
    document.getElementById("movieProgressFill").style.width=percent+"%";
    document.getElementById("movieProgressShots").textContent=completed+" / "+total;
    document.getElementById("movieProgressProvider").textContent="Flixly · "+(provider==="processing"?"processing":provider);
    let message;
    if(status==="completed")message="All shots generated successfully. Your movie is ready for the next final-cut step.";
    else if(status==="failed")message=p?.last_error||"Movie generation failed. Your reserved credit was protected.";
    else if(provider==="processing")message="Shot "+Math.min(total,completed+1)+" of "+total+" is currently generating.";
    else message="Your movie is queued and will continue automatically.";
    document.getElementById("movieProgressStatus").textContent=message;
    lastStatus=status+"|"+completed+"|"+provider;
  }

  async function poll(){
    if(!window.getMovieProduction)return;
    const id=localStorage.getItem("obitrend_movie_active_production_id")||"";
    if(!id)return;
    if(id!==productionId){productionId=id;ensureCard();}
    try{
      const p=await window.getMovieProduction(id);
      if(!p)return;
      updateCard(p);
      if(p.status==="completed"||p.status==="failed"){
        if(timer){clearInterval(timer);timer=null;}
      }
    }catch(_){}
  }

  function start(){
    injectStyles();ensureCard();poll();
    if(!timer)timer=setInterval(poll,5000);
  }

  document.addEventListener("DOMContentLoaded",start);
  window.addEventListener("movieBackgroundGenerationStarted",start);
  window.movieProgressRefresh=start;
})();