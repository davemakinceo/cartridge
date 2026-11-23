// Cartridge service worker: app shell precached; emulator cores cached the first time they're used.
const SHELL = "cartridge-shell-5684b2570f", CORES = "cartridge-cores-v1";
const FILES = ["./", "index.html", "play.html", "pad.js", "tron.css", "logo.webp", "apple-touch-icon.png", "fonts/orbitron-500.woff2", "fonts/orbitron-700.woff2", "fonts/orbitron-900.woff2", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png", "ejs/loader.js", "ejs/emulator.min.js", "ejs/emulator.min.css", "ejs/localization/en-US.json", "ejs/compression/extractzip.js", "ejs/compression/extract7z.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== CORES).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const isCore = url.pathname.includes("/ejs/cores/") || url.pathname.includes("/ejs/compression/");
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && isCore) { const copy = res.clone(); caches.open(CORES).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => url.pathname.endsWith(".html") || url.pathname.endsWith("/") ? caches.match("index.html") : Response.error())));
});
