import json, hashlib, pathlib, shutil
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).parent
out = root/"dist"
shutil.rmtree(out, ignore_errors=True); out.mkdir()
core = (root/"node_modules/jsnes/dist/jsnes.min.js").read_text()
html = (root/"src/app.html").read_text().replace("/*__JSNES__*/", "/* JSNES 3.0.0 — Apache-2.0 — github.com/bfirsh/jsnes */\n" + core.replace("</script", "<\\/script"))
(out/"index.html").write_text(html)
shutil.copy(root/"src/play.html", out/"play.html")

# ---- EmulatorJS runtime (GPL-3.0) ----
ejs_src = root/"node_modules/@emulatorjs/emulatorjs/data"
ejs = out/"ejs"; (ejs/"src").mkdir(parents=True); (ejs/"cores/reports").mkdir(parents=True); (ejs/"localization").mkdir()
shutil.copy(ejs_src/"loader.js", ejs/"loader.js")
order = ["emulator.js","nipplejs.js","shaders.js","storage.js","gamepad.js","GameManager.js","socket.io.min.js","compression.js"]
bundle = "\n;\n".join((ejs_src/"src"/f).read_text() for f in order)
assert "    checkForUpdates() {" in bundle
bundle = bundle.replace("    checkForUpdates() {", "    checkForUpdates() { return; // offline app: no update ping", 1)
(ejs/"emulator.min.js").write_text(bundle)
shutil.copy(ejs_src/"emulator.css", ejs/"emulator.min.css")
shutil.copytree(ejs_src/"compression", ejs/"compression")
shutil.copy(ejs_src/"localization/en-US.json", ejs/"localization/en-US.json")
shutil.copy(root/"node_modules/@emulatorjs/emulatorjs/LICENSE", ejs/"LICENSE.txt")
(ejs/"version.json").write_text((ejs_src/"version.json").read_text())
CORES = ["fbneo","mame2003_plus","gambatte","mgba","snes9x","genesis_plus_gx","mupen64plus_next","pcsx_rearmed","stella2014","mednafen_pce","handy"]
for c in CORES:
    pkg = root/f"node_modules/@emulatorjs/core-{c}"
    for v in ("wasm", "legacy-wasm"):
        shutil.copy(pkg/f"{c}-{v}.data", ejs/f"cores/{c}-{v}.data")
    shutil.copy(pkg/f"reports/{c}.json", ejs/f"cores/reports/{c}.json")

def icon(size, maskable=False):
    im = Image.new("RGB", (size, size), "#121216"); d = ImageDraw.Draw(im); s = size/192
    pad = 0 if maskable else 12*s
    d.rounded_rectangle([pad, pad, size-pad, size-pad], radius=(0 if maskable else 40*s), fill="#e5484d")
    d.rounded_rectangle([56*s, 62*s, 136*s, 128*s], radius=8*s, outline="white", width=int(11*s))
    d.rectangle([76*s, 128*s, 116*s, 140*s], fill="white")
    return im
icon(192).save(out/"icon-192.png"); icon(512).save(out/"icon-512.png"); icon(512, True).save(out/"icon-maskable.png")
(out/"manifest.webmanifest").write_text(json.dumps({
  "name": "Cartridge", "short_name": "Cartridge", "description": "Offline retro console emulator",
  "start_url": "./", "scope": "./", "display": "fullscreen", "orientation": "any",
  "background_color": "#121216", "theme_color": "#121216",
  "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}, indent=1))
shell = ["./", "index.html", "play.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png",
         "ejs/loader.js", "ejs/emulator.min.js", "ejs/emulator.min.css", "ejs/localization/en-US.json",
         "ejs/compression/extractzip.js", "ejs/compression/extract7z.js"]
ver = hashlib.sha1(b"".join((out/f).read_bytes() for f in shell if f != "./")).hexdigest()[:10]
(out/"sw.js").write_text(f"""// Cartridge service worker: app shell precached; emulator cores cached the first time they're used.
const SHELL = "cartridge-shell-{ver}", CORES = "cartridge-cores-v1";
const FILES = {json.dumps(shell)};
self.addEventListener("install", e => {{ e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener("activate", e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== CORES).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener("fetch", e => {{
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const isCore = url.pathname.includes("/ejs/cores/") || url.pathname.includes("/ejs/compression/");
  e.respondWith(caches.match(e.request, {{ ignoreSearch: true }}).then(hit => hit || fetch(e.request).then(res => {{
    if (res.ok && isCore) {{ const copy = res.clone(); caches.open(CORES).then(c => c.put(e.request, copy)); }}
    return res;
  }}).catch(() => url.pathname.endsWith(".html") || url.pathname.endsWith("/") ? caches.match("index.html") : Response.error())));
}});
""")
total = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
print("built", ver, f"{total/2**20:.1f} MB total")
