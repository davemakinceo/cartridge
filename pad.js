/* Cartridge controller calibration.
   Some controllers (e.g. Backbone One PlayStation Edition on Android Chrome) report their buttons
   in a non-standard order. After the user runs "Set up controller", this wraps
   navigator.getGamepads() so every page — the app and the EmulatorJS player — sees the
   standard W3C layout: 0 bottom, 1 right, 2 left, 3 top, 4 L1, 5 R1, 6 L2, 7 R2,
   8 select, 9 start, 10 L3, 11 R3, 12-15 d-pad, 16 home.
   Calibration format: { [gamepad.id]: { [standardIndex]: {t:"b", i} | {t:"a", i, rest, d} } } */
(function () {
  if (!navigator.getGamepads || window.CartridgePad) return;
  const raw = navigator.getGamepads.bind(navigator);
  let cal = {};

  function read(gp, m) {
    if (!m) return 0;
    if (m.t === "b") { const b = gp.buttons[m.i]; return b ? (b.pressed ? Math.max(b.value || 0, 1) : b.value || 0) : 0; }
    const a = gp.axes[m.i];
    if (a == null) return 0;
    return Math.max(0, Math.min(1, (a - m.rest) * m.d));
  }
  function wrap(gp) {
    const c = gp && cal[gp.id];
    if (!c) return gp;
    const buttons = [];
    for (let s = 0; s < 17; s++) {
      const v = read(gp, c[s]);   // skipped buttons stay unpressed
      buttons.push({ pressed: v > 0.5, touched: v > 0.5, value: v });
    }
    const ax = gp.axes;
    return {
      id: gp.id, index: gp.index, connected: gp.connected, timestamp: gp.timestamp,
      mapping: "standard", axes: [ax[0] || 0, ax[1] || 0, ax[2] || 0, ax[3] || 0],
      buttons, vibrationActuator: gp.vibrationActuator, hapticActuators: gp.hapticActuators,
    };
  }
  navigator.getGamepads = function () { return Array.from(raw()).map((g) => (g ? wrap(g) : g)); };
  window.CartridgePad = {
    raw,
    set(c) { cal = c || {}; },
    get() { return cal; },
    has(id) { return !!cal[id]; },
  };

  // the player page loads its calibration straight from the app's database
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
