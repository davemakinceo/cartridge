# Cartridge

An offline retro console emulator for Android, installed from Chrome as a web app.

**Install:** open https://davemakinceo.github.io/cartridge/ in Chrome, then tap ⋮ → **Install app** (or **Add to Home screen** → **Install**).

Systems: NES, Game Boy / Color / Advance, SNES, Genesis / Mega Drive, Master System, Game Gear, N64, PlayStation, Atari 2600, TurboGrafx-16, Atari Lynx, and arcade (FBNeo and MAME 2003-Plus).
Controllers: Backbone One, Xbox, PlayStation, Switch Pro, 8BitDo and other Bluetooth/USB gamepads.

Play only ROMs you have the right to use: homebrew, or dumps of cartridges and discs you own. No games are included.

## Licenses
- NES core: [JSNES](https://github.com/bfirsh/jsnes) (Apache-2.0), inlined in `index.html`.
- Other systems: [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) 4.2.3 and its RetroArch cores (GPL-3.0, see `ejs/LICENSE.txt`). Core sources: fbneo, mame2003_plus, gambatte, mgba, snes9x, genesis_plus_gx, mupen64plus_next, pcsx_rearmed, stella2014, mednafen_pce and handy, each at github.com/EmulatorJS/<core>-libretro. The only change to EmulatorJS is that the update check is disabled.
- `source/` holds the app sources and the build script.
