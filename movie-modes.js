(()=>{ 
  "use strict";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const modes=[
    ["t2v","🎬","Text-to-Video","Generate cinematic video directly from descriptive text with camera, lighting and action control.","Describe a scene, camera, lighting and action."],
    ["i2v","📸","Image-to-Video","Animate a still image with realistic motion, depth, physics and cinematic camera movement.","Upload an image, then describe natural movement."],
    ["v2v","🎞","Video-to-Video","Modify existing footage while maintaining the original motion track and subject movement.","Change visual treatment, environment or style."],
    ["frame","🔄","First-to-Last Frame","Generate a smooth cinematic sequence connecting a start frame to an end frame.","Choose a start frame and an end frame."],
    ["avatar","🧑‍🎤","Avatar & Lip-Sync","Synchronize speech or audio with a portrait or digital character for realistic talking scenes.","Create expressive, synchronized talking scenes."]
  ];

  const style=document.createElement("style");
  style.textContent=`
  .omv-section{margin:26px 0 0}.omv-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:14px}.omv-head h2{margin:0}.omv-head p{margin:4px 0 0;opacity:.68}.omv-badge{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#e6b95e;border:1px solid rgba(230,185,94,.28);border-radius:999px;padding:7px 10px;white-space:nowrap}
  .omv-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.omv-card{appearance:none;border:1px solid rgba(255,255,255,.09);background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));color:inherit;border-radius:18px;padding:18px;text-align:left;min-height:168px;cursor:pointer;transition:.18s transform,.18s border-color,.18s background}.omv-card:hover,.omv-card.active{transform:translateY(-2px);border-color:rgba(230,185,94,.62);background:linear-gradient(145deg,rgba(230,185,94,.13),rgba(255,255,255,.025))}.omv-icon{font-size:28px;display:block;margin-bottom:18px}.omv-card b{display:block;font-size:15px}.omv-card small{display:block;margin-top:8px;line-height:1.45;opacity:.68}.omv-work{display:none;margin-top:16px;padding:18px;border:1px solid rgba(230,185,94,.25);border-radius:18px;background:rgba(7,9,14,.76)}.omv-work.open{display:block}.omv-work h3{margin:0 0 5px}.omv-work p{margin:0 0 14px;opacity:.7}.omv-controls{display:grid;grid-template-columns:1fr 1fr;gap:12px}.omv-field{display:flex;flex-direction:column;gap:7px}.omv-field.full{grid-column:1/-1}.omv-field label{font-size:12px;opacity:.7}.omv-field textarea,.omv-field input,.omv-field select{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#090c13;color:inherit;padding:12px;outline:none}.omv-actions{display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}.omv-primary{border:0;border-radius:12px;padding:12px 18px;background:#e6b95e;color:#090a0d;font-weight:800;cursor:pointer}.omv-primary:disabled{opacity:.5;cursor:wait}.omv-file{font-size:12px}.omv-preview{display:none;max-width:220px;max-height:220px;border-radius:14px;object-fit:cover;border:1px solid rgba(230,185,94,.3);margin-top:10px}.omv-preview.show{display:block}.omv-status{font-size:13px;min-height:20px;opacity:.78}.omv-status.error{color:#ff8b8b;opacity:1}.omv-note{padding:11px 12px;border-radius:12px;background:rgba(230,185,94,.07);border:1px solid rgba(230,185,94,.16);font-size:12px;line-height:1.5}.omv-result video{width:100%;max-height:520px;border-radius:14px;margin-top:12px;background:#000}
  @media(max-width:900px){.omv-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.omv-grid{grid-template-columns:1fr}.omv-controls{grid-template-columns:1fr}.omv-field.full{grid-column:auto}.omv-head{align-items:start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  function mount(){
    if(document.getElementById("obitrendMovieModes"))return;
    const anchor=document.querySelector(".pm-movie-cards");
    if(!anchor)return;
    const section=document.createElement("section");
    section.id="obitrendMovieModes";section.className="omv-section";
    section.innerHTML='<div class="omv-head"><div><h2>OBITREND FILM STUDIO</h2><p>Create realistic video, transform footage, animate images, bridge frames, or build talking characters.</p></div><span class="omv-badge">5 film creation modes</span></div><div class="omv-grid">'+
      modes.map(m=>'<button class="omv-card" type="button" data-mode="'+m[0]+'"><span class="omv-icon">'+m[1]+'</span><b>'+m[2]+'</b><small>'+m[3]+'</small></button>').join("")+
      '</div><div id="omvWork" class="omv-work"></div>';
    anchor.parentNode.insertBefore(section,anchor.nextSibling);
    section.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>openMode(b.dataset.mode)));
  }

  function openMode(mode){
    document.querySelectorAll(".omv-card").forEach(x=>x.classList.toggle("active",x.dataset.mode===mode));
    const w=document.getElementById("omvWork");if(!w)return;
    if(mode==="i2v"){renderI2V(w);return}
    const m=modes.find(x=>x[0]===mode)||modes[0];
    w.classList.add("open");
    w.innerHTML='<h3>'+m[1]+" "+m[2]+'</h3><p>'+m[4]+'</p><div class="omv-note">This mode is part of the OBITREND unified Movie Studio architecture. Its workspace is isolated from the existing movie blueprint workflow so provider integrations can be enabled without changing your current movie generator.</div>';
    w.scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  function renderI2V(w){
    w.classList.add("open");
    w.innerHTML=`
      <h3>📸 Realistic Image-to-Video</h3>
      <p>Animate one image into realistic live-action video while preserving the subject, face, clothing, objects, environment and visual identity as faithfully as the provider allows.</p>
      <div class="omv-controls">
        <div class="omv-field full"><label>Starting image</label><input id="omvI2VFile" class="omv-file" type="file" accept="image/jpeg,image/png,image/webp"><img id="omvI2VPreview" class="omv-preview" alt="Selected image preview"></div>
        <div class="omv-field full"><label>Motion prompt</label><textarea id="omvI2VPrompt" rows="4" placeholder="Example: The model slowly walks toward the camera. Natural cloth movement, realistic hair movement, subtle breathing, physically accurate shadows, smooth cinematic tracking camera."></textarea></div>
        <div class="omv-field"><label>Camera movement</label><select id="omvI2VCamera"><option>Natural tracking</option><option>Slow push-in</option><option>Slow pull-out</option><option>Pan</option><option>Orbit</option><option>Static camera</option></select></div>
        <div class="omv-field"><label>Motion strength</label><select id="omvI2VMotion"><option>Natural</option><option>Subtle</option><option>Dynamic</option></select></div>
        <div class="omv-field"><label>Duration</label><select id="omvI2VDuration"><option value="5">5 seconds</option><option value="10">10 seconds</option><option value="15" selected>15 seconds</option></select></div>
        <div class="omv-field"><label>Aspect ratio</label><select id="omvI2VRatio"><option value="16:9">16:9 Landscape</option><option value="9:16">9:16 Portrait</option><option value="1:1">1:1 Square</option></select></div>
      </div>
      <div class="omv-actions"><button id="omvI2VGenerate" class="omv-primary" type="button">✨ Generate Realistic Video</button><span id="omvI2VStatus" class="omv-status" aria-live="polite"></span></div>
      <div id="omvI2VResult" class="omv-result"></div>`;
    const file=document.getElementById("omvI2VFile");
    file.onchange=()=>{
      const f=file.files?.[0];const img=document.getElementById("omvI2VPreview");if(!f){img.classList.remove("show");return}
      const url=URL.createObjectURL(f);img.src=url;img.classList.add("show");
    };
    document.getElementById("omvI2VGenerate").onclick=()=>generateI2V();
    w.scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  async function dataUri(file){
    return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=reject;r.readAsDataURL(file)});
  }

  async function generateI2V(){
    const file=document.getElementById("omvI2VFile")?.files?.[0];
    const prompt=document.getElementById("omvI2VPrompt")?.value.trim();
    const status=document.getElementById("omvI2VStatus"),btn=document.getElementById("omvI2VGenerate"),result=document.getElementById("omvI2VResult");
    if(!file){status.textContent="Choose an image first.";status.className="omv-status error";return}
    if(!prompt){status.textContent="Describe the movement first.";status.className="omv-status error";return}
    if(file.size>5*1024*1024){status.textContent="Please choose an image under 5 MB.";status.className="omv-status error";return}
    btn.disabled=true;status.className="omv-status";status.textContent="Securing 1 OBITREND movie credit…";result.innerHTML="";
    let reservation=null;
    try{
      await window.movieAuthReady;
      await window.refreshMovieEntitlement();
      if(window.getMovieCredits()<=0)throw new Error("You have no movie credits available.");
      reservation=await window.reserveMovieCredit();
      const image=await dataUri(file);
      const camera=document.getElementById("omvI2VCamera").value;
      const motion=document.getElementById("omvI2VMotion").value;
      const duration=Number(document.getElementById("omvI2VDuration").value);
      const ratio=document.getElementById("omvI2VRatio").value;
      const blueprint={title:"OBITREND Image-to-Video",genre:"Image-to-Video",length:duration/60,visualStyle:"Photorealistic live-action",visualBible:{realism:"photorealistic live-action video",continuity:"preserve the source image identity, wardrobe, face, body proportions, objects and environment",lighting:"natural physically plausible lighting"},characters:[{name:"Source subject",appearance:"Preserve the subject exactly as visible in the uploaded image.",wardrobe:"Preserve all visible clothing, colors, patterns and materials exactly as visible."}],scenes:[{heading:"Image to Video",location:"Source image environment",time:"natural",purpose:"Animate the uploaded keyframe realistically.",dialogue:"",shots:[{camera:camera,lens:"50mm natural perspective",framing:"match source image",angle:"match source image",movement:camera,focus:"source subject and uploaded image details",lighting:"match source image with physically plausible changes",sound:"natural cinematic ambience",continuity:"preserve source image identity"}]}]};
      const access=await window.getMovieAccessToken();
      const r=await fetch("/api/generate-shot",{method:"POST",headers:{"content-type":"application/json","Authorization":"Bearer "+access,"x-movie-reservation":reservation},body:JSON.stringify({provider:"kling",blueprint,sceneIndex:0,shotIndex:0,imageDataUri:image,duration,ratio})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"Image-to-video generation could not start.");
      if(!d.taskId)throw new Error("The video provider did not return a task.");
      status.textContent="Video is generating…";
      for(let i=0;i<180;i++){
        await new Promise(r=>setTimeout(r,4000));
        const token=await window.getMovieAccessToken();
        const s=await fetch("/api/generate-shot?taskId="+encodeURIComponent(d.taskId),{headers:{"Authorization":"Bearer "+token,"x-movie-reservation":reservation}});
        const x=await s.json().catch(()=>({}));
        if(!s.ok)throw new Error(x.error||"Could not check video status.");
        if(x.status==="SUCCEEDED"&&x.videoUrl){
          await window.finishMovieCredit("commit",reservation);reservation=null;
          result.innerHTML='<video controls autoplay playsinline src="'+esc(x.videoUrl)+'"></video>';
          status.textContent="Your realistic image-to-video clip is ready.";
          return;
        }
        if(x.status==="FAILED"||x.status==="CANCELED")throw new Error(x.error||"Generation failed. Your OBITREND credit was restored.");
        status.textContent="Generating realistic motion… "+Math.min(99,Math.round((i+1)/180*99))+"%";
      }
      throw new Error("Generation is taking longer than expected. Your credit remains protected while the provider job is checked.");
    }catch(e){
      if(reservation){try{await window.finishMovieCredit("release",reservation)}catch(_){}}
      status.textContent=e?.message||"Image-to-video generation failed. Your credit was restored.";
      status.className="omv-status error";
    }finally{btn.disabled=false}
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();