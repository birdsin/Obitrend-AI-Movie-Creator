/* OBITREND TEXT-TO-IMAGE — isolated UI. Does not modify the movie generation engine. */
(function(){
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const ratios=["1:1","16:9","9:16","3:2","2:3","4:3","3:4"];
  function inject(){
    if(document.getElementById("textImageCard"))return;
    const anchor=document.querySelector(".pipeline-input");
    if(!anchor)return;
    const card=document.createElement("section");
    card.id="textImageCard";
    card.innerHTML='<style>'+
      '#textImageCard{margin-top:18px;background:linear-gradient(145deg,#101722,#0b1119);border:1px solid rgba(230,185,94,.22);border-radius:22px;padding:18px;box-shadow:0 18px 55px rgba(0,0,0,.22)}'+
      '#textImageCard .ti-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}'+
      '#textImageCard .ti-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(230,185,94,.12);color:#e6b95e;font-size:20px}'+
      '#textImageCard h2{margin:0;font-size:18px}#textImageCard .ti-sub{margin:4px 0 0;color:#8f98a8;font-size:12px}'+
      '#textImageCard textarea{width:100%;min-height:105px;resize:vertical;background:#070a10;color:#f7f7f8;border:1px solid rgba(255,255,255,.12);border-radius:15px;padding:14px;font:inherit;outline:none}'+
      '#textImageCard textarea:focus{border-color:#e6b95e}#textImageCard .ti-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}'+
      '#textImageCard select{width:100%;height:44px;background:#090e16;color:#f7f7f8;border:1px solid rgba(255,255,255,.12);border-radius:11px;padding:0 10px}'+
      '#textImageCard .ti-ratios{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}'+
      '#textImageCard .ti-ratio{border:1px solid rgba(255,255,255,.1);background:#090e16;color:#aeb5c2;border-radius:999px;padding:8px 10px;font-size:11px;cursor:pointer}'+
      '#textImageCard .ti-ratio.active{background:#e6b95e;color:#111;border-color:#e6b95e;font-weight:800}'+
      '#textImageCard .ti-generate{width:100%;height:48px;margin-top:12px;border:0;border-radius:13px;background:linear-gradient(100deg,#f3cc72,#e6b95e);color:#101116;font-weight:850;font-size:15px;cursor:pointer}'+
      '#textImageCard .ti-generate:disabled{opacity:.55;cursor:not-allowed}#textImageCard .ti-status{min-height:20px;margin-top:9px;color:#929dad;font-size:12px}#textImageCard .ti-status.error{color:#ff9090}'+
      '#textImageCard .ti-result{margin-top:14px;display:none;background:#05080d;border:1px solid rgba(255,255,255,.1);border-radius:15px;overflow:hidden}#textImageCard .ti-result.show{display:block}'+
      '#textImageCard .ti-result img{display:block;width:100%;max-height:620px;object-fit:contain;background:#020406}#textImageCard .ti-actions{display:flex;gap:8px;padding:10px}.ti-actions a,.ti-actions button{flex:1;min-height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#111722;color:#f7f7f8;text-decoration:none;display:grid;place-items:center;cursor:pointer;font-weight:700}.ti-actions a.primary{background:#e6b95e;color:#111;border-color:#e6b95e}'+
      '@media(max-width:600px){#textImageCard .ti-controls{grid-template-columns:1fr}.ti-actions{flex-direction:column}}'+
      '</style>'+ 
      '<div class="ti-head"><div class="ti-icon">✦</div><div><h2>Text to Image</h2><p class="ti-sub">Create a standalone image from a written prompt.</p></div></div>'+ 
      '<textarea id="textImagePrompt" maxlength="5000" placeholder="Describe the image you want... e.g. A cinematic Lagos fashion campaign at golden hour, luxury styling, realistic photography"></textarea>'+ 
      '<div class="ti-controls"><select id="textImageModel"><option value="gpt-image-2-5-flare">GPT Image 2.5 Flare · Fast</option><option value="gpt-image-2-5-sunburst">GPT Image 2.5 Sunburst · Detail</option></select><div style="height:44px;display:flex;align-items:center;padding:0 12px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:#090e16;color:#929dad;font-size:12px">PNG output · model controlled</div></div>'+ 
      '<div class="ti-ratios">'+ratios.map((r,i)=>'<button type="button" class="ti-ratio'+(i===0?' active':'')+'" data-ratio="'+r+'">'+r+'</button>').join("")+'</div>'+ 
      '<button id="textImageGenerate" class="ti-generate" type="button">Generate Image</button>'+ 
      '<div id="textImageStatus" class="ti-status"></div>'+ 
      '<div id="textImageResult" class="ti-result"><img id="textImageOutput" alt="Generated image"><div class="ti-actions"><a id="textImageDownload" class="primary" href="#" target="_blank" rel="noopener">Download Image</a><button id="textImageSave" type="button">Save to My Creations</button></div></div>';
    anchor.insertAdjacentElement("afterend",card);
    let ratio="1:1";
    card.querySelectorAll(".ti-ratio").forEach(b=>b.addEventListener("click",()=>{card.querySelectorAll(".ti-ratio").forEach(x=>x.classList.remove("active"));b.classList.add("active");ratio=b.dataset.ratio;}));
    const status=m=>{const el=document.getElementById("textImageStatus");if(el){el.textContent=m||"";el.className="ti-status"}};
    async function poll(id){
      for(let i=0;i<90;i++){
        await new Promise(r=>setTimeout(r,5000));
        const r=await fetch("/api/generate-image?id="+encodeURIComponent(id),{cache:"no-store"});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.error||"Unable to check image generation.");
        if(d.status==="SUCCEEDED"&&d.imageUrl)return d.imageUrl;
        if(d.status==="FAILED")throw new Error(d.error||"Flixly image generation failed.");
        status("Generating image… still processing.");
      }
      throw new Error("Image generation timed out while waiting for Flixly.");
    }
    document.getElementById("textImageGenerate").addEventListener("click",async()=>{
      const prompt=document.getElementById("textImagePrompt").value.trim();
      const btn=document.getElementById("textImageGenerate");
      if(prompt.length<2){status("Enter a prompt first.");document.getElementById("textImagePrompt").focus();return;}
      btn.disabled=true;status("Starting image generation…");
      try{
        const r=await fetch("/api/generate-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,model:document.getElementById("textImageModel").value,aspect_ratio:ratio})});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.error||"Flixly could not start the image.");
        let url=d.imageUrl;
        if(!url&&d.id)url=await poll(d.id);
        if(!url)throw new Error("No image was returned.");
        document.getElementById("textImageOutput").src=url;
        document.getElementById("textImageDownload").href=url;
        document.getElementById("textImageResult").classList.add("show");
        localStorage.setItem("obitrend_last_text_image",JSON.stringify({url,prompt,model:d.model||document.getElementById("textImageModel").value,ratio,created:Date.now()}));
        status("Image generated successfully.");
      }catch(e){status(e?.message||"Image generation failed.");document.getElementById("textImageStatus").classList.add("error");}
      finally{btn.disabled=false}
    });
    document.getElementById("textImageSave").addEventListener("click",()=>{
      const raw=localStorage.getItem("obitrend_last_text_image");
      if(!raw){status("Generate an image first.");return}
      let list=[];try{list=JSON.parse(localStorage.getItem("obitrend_text_image_history")||"[]")}catch(_){list=[]}
      const item=JSON.parse(raw);list.unshift(item);localStorage.setItem("obitrend_text_image_history",JSON.stringify(list.slice(0,30)));status("Saved to My Creations.");
    });
  }
  function addMenuEntry(){
    const nav=document.querySelector("#movieDrawer .movie-drawer-nav");
    if(!nav||nav.querySelector('[data-movie-nav="text-image"]'))return;
    const b=document.createElement("button");b.type="button";b.dataset.movieNav="text-image";b.innerHTML='<span class="movie-drawer-icon">✦</span><span>Text to Image</span>';
    const create=nav.querySelector('[data-movie-nav="create"]');
    if(create)create.insertAdjacentElement("afterend",b);else nav.appendChild(b);
    b.addEventListener("click",()=>{document.getElementById("movieDrawer")?.classList.remove("open");document.getElementById("movieDrawerOverlay")?.classList.remove("open");document.getElementById("textImagePrompt")?.scrollIntoView({behavior:"smooth",block:"center"});document.getElementById("textImagePrompt")?.focus();});
  }
  function start(){inject();addMenuEntry();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
