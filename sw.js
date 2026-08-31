const CACHE='404-v2';
const ASSETS=['/','index.html','style.css','app.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.hostname.includes('firebase')||u.hostname.includes('google')||u.hostname.includes('imgbb')||u.hostname.includes('paypal')||u.hostname.includes('ibb.co'))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('index.html')));return;}e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{if(resp&&resp.status===200){const cl=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));}return resp;}).catch(()=>caches.match('index.html'))));});
