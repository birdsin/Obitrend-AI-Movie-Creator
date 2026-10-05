/* OBITREND MY CREATIONS — isolated saved video/image folders. */
(function(){
  const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const css="
    #myCreationsWorkspace{position:fixed;inset:0;z-index:130;background:#05070b;overflow:auto;padding:18px}
    #myCreationsWorkspace .mc-shell{max-width:980px;margin:0 auto}
    #myCreationsWorkspace .mc-head{display:flex;align-items:center;justify-content:space-between;padding:10px 0 18px;border-bottom:1px solid rgba(230,185,94,.18)}
    #myCreationsWorkspace .mc-title{display:flex;align-items:center;gap:12px}.mc-title-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#e6b95e,#8d6925);color:#0a0b0f;font-size:20px}
    #myCreationsWorkspace h2{margin:0;font-size:23px;letter-spacing:-.02em}.mc-sub{margin:5px 0 0;color:#8f98a8;font-size:12px}
    #myCreationsWorkspace .mc-close{width:42px;height:42px;border-radius:13px;border:1px solid rgba(255,255,255,.1);background:#10151e;color:#fff;font-size:23px;cursor:pointer}
    #myCreationsWorkspace .mc-folders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}
    #myCreationsWorkspace .mc-folder{position:relative;min-height:150px;padding:17px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:linear-gradient(145deg,#0d121b,#090d14);overflow:hidden}
    #myCreationsWorkspace .mc-folder:before{content:"";position:absolute;right:-28px;top:-32px;width:120px;height:120px;border-radius:50%;background:rgba(230,185,94,.06)}
    #myCreationsWorkspace .mc-folder-icon{width:48px;height:38px;border-radius:10px 10px 7px 7px;background:#e6b95e;color:#111;display:grid;place-items:center;font-size:19px;position:relative;margin-bottom:15px}
    #myCreationsWorkspace .mc-folder-icon:before{content:"";position:absolute;left:0;top:-6px;width:20px;height:9px;border-radius:6px 6px 0 0;background:#d4a94f}
    #myCreationsWorkspace .mc-folder h3{margin:0;font-size:17px}.mc-count{color:#8f98a8;font-size:11px;margin-top:5px}
    #myCreationsWorkspace .mc-open{position:absolute;right:14px;bottom:14px;border:1px solid rgba(230,185,94,.25);background:#111722;color:#e6b95e;border-radius:10px;padding:9px 11px;font-weight:800;cursor:pointer}
    #myCreationsWorkspace .mc-library{margin-top:16px;display:none}.mc-library.show{display:block}
    #myCreationsWorkspace .mc-library-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
    #myCreationsWorkspace .mc-library-head h3{margin:0;font-size:16px}.mc-back{border:1px solid rgba(255,255,255,.1);background:#111722;color:#f7f7f8;border-radius:10px;padding:9px 11px;cursor:pointer}
    #myCreationsWorkspace .mc-list{display:grid;gap:10px}
    #myCreationsWorkspace .mc-item{display:grid;grid-template-columns:88px 1fr auto;gap:12px;align-items:center;background:#0b0f17;border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:10px}
    #myCreationsWorkspace .mc-thumb{width:88px;height:64px;border-radius:10px;overflow:hidden;background:#05080d;display:grid;place-items:center;color:#e6b95e;border:1px solid rgba(255,255,255,.08)}
    #myCreationsWorkspace .mc-thumb img,#myCreationsWorkspace .mc-thumb video{width:100%;height:100%;object-fit:cover}
    #myCreationsWorkspace .mc-item h4{margin:0;font-size:13px}.mc-item p{margin:4px 0 0;color:#7f8796;font-size:10px;line-height:1.45}
    #myCreationsWorkspace .mc-view{border:1px solid rgba(230,185,94,.25);background:#111722;color:#e6b95e;border-radius:9px;padding:9px 10px;text-decoration:none;font-size:11px;font-weight:800;white-space:nowrap}
    #myCreationsWorkspace .mc-empty{padding:28px 18px;text-align:center;background:#0b0f17;border:1px dashed rgba(255,255,255,.12);border-radius:15px;color:#8f98a8;font-size:12px}
    @media(max-width:600px){#myCreationsWorkspace{padding:12px}.mc-folders{grid-template-columns:1fr}.mc-item{grid-template-columns:70px 1fr}.mc-thumb{width:70px;height:56px}.mc-view{grid-column:2;justify-self:start}}
  ";
  function read(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x??fallback}catch(_){return fallback}}
  function collectImages(){const history=read("obitrend_text_image_history",[]);const last=read("obitrend_last_text_image",null);const list=Array.isArray(history)?history.slice():[];if(last?.url&&!list.some(x=>x?.url===last.url))list.unshift(last);return list.filter(x=>x?.url).slice(0,30)}
  function collectVideos(){const out=[];const seen=new Set();const add=(url,title,meta)=>{if(!url||seen.has(url))return;seen.add(url);out.push({url,title:title||"Generated video",meta:meta||""})};
    const history=read("obitrend_movie_history",[]);if(Array.isArray(history))history.forEach(x=>(Array.isArray(x?.videoUrls)?x.videoUrls:[x?.videoUrl]).filter(Boolean).forEach((u,i)=>add(u,x.title||"Generated movie",i?"Movie shot "+(i+1):"Saved movie")));
    const assembly=read("obitrend_movie_assembly",{});if(assembly&&typeof assembly==="object")Object.entries(assembly).forEach(([k,u])=>add(u,"Generated movie shot","Shot "+k.replace("-"," · ")));
    const snap=read("obitrend_movie_last_production_snapshot",null);if(Array.isArray(snap?.video_urls))snap.video_urls.forEach((u,i)=>add(u,snap.title||"Generated movie",`Shot ${i+1}`));return out.slice(0,40)}
  function inject(){
    if(document.getElementById("myCreationsWorkspace"))return;
    const s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
    const w=document.createElement("section");w.id="myCreationsWorkspace";w.hidden=true;
    w.innerHTML='<div class="mc-shell"><div class="mc-head"><div class="mc-title"><div class="mc-title-icon">▣</div><div><h2>My Creations</h2><p class="mc-sub">Your saved AI movie videos and generated images.</p></div></div><button class="mc-close" type="button" aria-label="Close">×</button></div><div class="mc-folders"><article class="mc-folder"><div class="mc-folder-icon">▶</div><h3>Video Folder</h3><div class="mc-count" id="mcVideoCount">0 saved videos</div><button class="mc-open" data-folder="videos" type="button">Open Folder</button></article><article class="mc-folder"><div class="mc-folder-icon">✦</div><h3>Image Folder</h3><div class="mc-count" id="mcImageCount">0 saved images</div><button class="mc-open" data-folder="images" type="button">Open Folder</button></article></div><div id="mcLibrary" class="mc-library"><div class="mc-library-head"><h3 id="mcLibraryTitle"></h3><button id="mcBack" class="mc-back" type="button">Back to folders</button></div><div id="mcList" class="mc-list"></div></div></div>';
    document.body.appendChild(w);const close=()=>{w.hidden=true;document.body.style.overflow=""};w.querySelector(".mc-close").addEventListener("click",close);w.querySelectorAll(".mc-open").forEach(b=>b.addEventListener("click",()=>openFolder(b.dataset.folder)));w.querySelector("#mcBack").addEventListener("click",()=>w.querySelector("#mcLibrary").classList.remove("show"));
    function render(){const v=collectVideos(),i=collectImages();w.querySelector("#mcVideoCount").textContent=v.length+" saved video"+(v.length===1?"":"s");w.querySelector("#mcImageCount").textContent=i.length+" saved image"+(i.length===1?"":"s")}
    function openFolder(type){const lib=w.querySelector("#mcLibrary"),list=w.querySelector("#mcList"),items=type==="videos"?collectVideos():collectImages();w.querySelector("#mcLibraryTitle").textContent=type==="videos"?"Video Folder":"Image Folder";list.innerHTML=items.length?items.map(x=>{const url=esc(x.url),title=esc(x.title||("Generated "+(type==="videos"?"video":"image"))),meta=esc(x.meta||x.prompt||x.ratio||"Saved to My Creations"),media=type==="videos"?'<video src="'+url+'" muted playsinline preload="metadata"></video>':'<img src="'+url+'" alt="'+title+'" loading="lazy">';return '<div class="mc-item"><div class="mc-thumb">'+media+'</div><div><h4>'+title+'</h4><p>'+meta+'</p></div><a class="mc-view" href="'+url+'" target="_blank" rel="noopener">'+(type==="videos"?"Open Video":"Open Image")+'</a></div>'}).join(""):'<div class="mc-empty">No saved '+(type==="videos"?"videos":"images")+' yet.</div>';lib.classList.add("show")}
    window.openMyCreations=()=>{render();w.hidden=false;w.querySelector("#mcLibrary").classList.remove("show");document.body.style.overflow="hidden"};window.refreshMyCreations=render;
  }
  function addMenuEntry(){const nav=document.querySelector("#movieDrawer .movie-drawer-nav");if(!nav||nav.querySelector('[data-movie-nav="creations"]'))return;const b=document.createElement("button");b.type="button";b.dataset.movieNav="creations";b.innerHTML='<span class="movie-drawer-icon">▣</span><span>My Creations</span>';const movies=nav.querySelector('[data-movie-nav="movies"]');if(movies)movies.insertAdjacentElement("afterend",b);else nav.appendChild(b);b.addEventListener("click",()=>{document.getElementById("movieDrawer")?.classList.remove("open");document.getElementById("movieDrawerOverlay")?.classList.remove("open");window.openMyCreations?.()})}
  function start(){inject();addMenuEntry();window.refreshMyCreations?.()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();