const CACHE_NAME = "app404-v2";
const CORE_ASSETS = ["./index.html","./style.css","./script.js","./manifest.json"];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE_ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener("activate", (e)=>{
  e.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

// شبكة أولًا لملفات التطبيق الأساسية (HTML/CSS/JS) — يضمن دايمًا آخر نسخة لما يكون فيه إنترنت،
// ولو النت اتقطع بيرجع للنسخة المخزنة كنسخة احتياطية بس.
self.addEventListener("fetch", (e)=>{
  if(e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isCoreAsset = url.origin === location.origin;

  if(isCoreAsset){
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res && res.status===200){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(e.request, clone));
        }
        return res;
      }).catch(()=> caches.match(e.request))
    );
    return;
  }

  // موارد خارجية (خطوط، صور، Firebase SDK): كاش أولًا مع تحديث في الخلفية
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const network = fetch(e.request).then(res=>{
        if(res && res.status===200){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(e.request, clone));
        }
        return res;
      }).catch(()=> cached);
      return cached || network;
    })
  );
});
