const CACHE="obitrend-movie-shell-v4";
const CORE=["/","/index.html","/styles.css","/app.js","/movie-auth.js","/prompt-movie-dashboard.css","/prompt-movie-dashboard.js"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    return response;
  }).catch(()=>caches.match(event.request).then(r=>r||caches.match("/"))));
});
self.addEventListener("push",event=>{
  let data={};try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?.text()||""}}
  event.waitUntil(self.registration.showNotification(data.title||"OBITREND Movie Creator",{
    body:data.body||"Your movie generation has finished.",
    icon:"/icons/obitrend-192.svg",
    badge:"/icons/obitrend-192.svg",
    data:data.data||{url:"/"}
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=event.notification.data?.url||"/";
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const client of list){if("focus" in client)return client.focus();}
    return clients.openWindow(url);
  }));
});
