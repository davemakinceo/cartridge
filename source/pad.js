/* DEVS controller layer.
   Wraps navigator.getGamepads() so every page (the app and the EmulatorJS player) sees the
   standard W3C layout: 0 ✕/A, 1 ○/B, 2 □/X, 3 △/Y, 4 L1, 5 R1, 6 L2, 7 R2, 8 select, 9 start,
   10 L3, 11 R3, 12-15 d-pad up/down/left/right, 16 home; axes = left X/Y, right X/Y.
   Order of precedence: the user's own setup > the browser's standard mapping > a built-in profile.
   Mapping entries: {t:"b", i}          raw button i
                    {t:"a", i, rest, d}  raw axis i, value (axis - rest) * d clamped to 0..1
                    {t:"h", i, dir}      raw hat-switch axis i (8-way POV), dir up|down|left|right
   plus _axes: [lx, ly, rx, ry] raw axis indices for the two sticks. */
(function () {
  if (!navigator.getGamepads || window.CartridgePad) return;
  const raw = navigator.getGamepads.bind(navigator);
  let cal = {};

  /* Built-in profiles for controllers whose raw layout is known.
     Backbone One PlayStation Edition, raw (non-standard) signature: verified layout from
     github.com/Samfa12-tech/backbone-controller-mapping-chrome (Chrome, USB, Oct 2026):
     ✕0 ○1 □3 △4 L1 6 R1 7 L2 8 R2 9 ⋯10 ☰11 Backbone 12 L3 13 R3 14;
     sticks axes 0/1 and 2/5, triggers axes 4/3 (rest -1), d-pad = hat on axis 9 (rest ≈ +1.2857). */
  const PROFILES = [{
    name: "Backbone One",
    match: (g) => /backbone|358a/i.test(g.id) && g.mapping !== "standard" && g.axes.length >= 10 && g.buttons.length >= 15,
    map: {
      0: { t: "b", i: 0 }, 1: { t: "b", i: 1 }, 2: { t: "b", i: 3 }, 3: { t: "b", i: 4 },
      4: { t: "b", i: 6 }, 5: { t: "b", i: 7 }, 6: { t: "b", i: 8 }, 7: { t: "b", i: 9 },
      8: { t: "b", i: 10 }, 9: { t: "b", i: 11 }, 10: { t: "b", i: 13 }, 11: { t: "b", i: 14 },
      12: { t: "h", i: 9, dir: "up" }, 13: { t: "h", i: 9, dir: "down" },
      14: { t: "h", i: 9, dir: "left" }, 15: { t: "h", i: 9, dir: "right" }, 16: { t: "b", i: 12 },
      _axes: [0, 1, 2, 5],
    },
  }];
  const profileFor = (g) => PROFILES.find((p) => p.match(g));

  /* 8-way hat as Chrome reports it: up -1, then +2/7 per step clockwise, released ≈ +1.2857 */
  const HAT_BITS = [1, 1 | 8, 8, 2 | 8, 2, 2 | 4, 4, 1 | 4];   // up=1 down=2 left=4 right=8
  const DIR_BIT = { up: 1, down: 2, left: 4, right: 8 };
  function hat(v) {
    if (v == null || v > 1.1 || v < -1.1) return 0;
    const k = Math.round((v + 1) / (2 / 7));
    return k >= 0 && k <= 7 ? HAT_BITS[k] : 0;
  }
  function read(gp, m) {
    if (!m) return 0;
    if (m.t === "b") { const b = gp.buttons[m.i]; return b ? (b.pressed ? Math.max(b.value || 0, 1) : b.value || 0) : 0; }
    const a = gp.axes[m.i];
    if (a == null) return 0;
    if (m.t === "h") return hat(a) & DIR_BIT[m.dir] ? 1 : 0;
    return Math.max(0, Math.min(1, (a - m.rest) * m.d));
  }
  function wrap(gp) {
    const c = cal[gp.id] || (gp.mapping !== "standard" && profileFor(gp)?.map);
    if (!c) return gp;
    const buttons = [];
    for (let s = 0; s < 17; s++) {
      const v = read(gp, c[s]);   // skipped buttons stay unpressed
      buttons.push({ pressed: v > 0.5, touched: v > 0.5, value: v });
    }
    const ax = c._axes || [0, 1, 2, 3], A = gp.axes;
    return {
      id: gp.id, index: gp.index, connected: gp.connected, timestamp: gp.timestamp,
      mapping: "standard", axes: ax.map((i) => (i == null ? 0 : A[i] || 0)),
      buttons, vibrationActuator: gp.vibrationActuator, hapticActuators: gp.hapticActuators,
    };
  }
  navigator.getGamepads = function () { return Array.from(raw()).map((g) => (g ? wrap(g) : g)); };
  window.CartridgePad = {
    raw, hat,
    set(c) { cal = c || {}; },
    get() { return cal; },
    has(id) { return !!cal[id]; },
    profile(g) { return g && g.mapping !== "standard" ? profileFor(g) : null; },
  };

  // the player page loads the user's setup straight from the app's database
  if (!window.__cartridgeApp) {
    try {
      const r = indexedDB.open("cartridge", 1);
      r.onsuccess = () => {
        try {
          const t = r.result.transaction("kv", "readonly").objectStore("kv").get("settings");
          t.onsuccess = () => { if (t.result && t.result.gpCal) cal = t.result.gpCal; };
        } catch {}
      };
    } catch {}
  }
})();
