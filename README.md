# Deeper! Idle Drill

Pixel-art idle clicker for [CrazyGames](https://www.crazygames.com): drill through 10 layers of a planet, smash the plates between them, blow up the core and fly to the next world.

Pure HTML5 + JavaScript, no engine, no build step and no external assets. All the graphics are drawn in code, and all the sound is synthesized with WebAudio.

## Run locally

On Windows, double-click `run.bat`. It starts a local server and opens http://localhost:8080; close the window to stop. On any OS:

```bash
cd deep-drill
python -m http.server 8080
```

Open http://localhost:8080. On localhost the CrazyGames SDK runs in its `local` mode. Without the SDK the game falls back to localStorage.

## Layout

| Path | What |
|---|---|
| `deep-drill/` | the game itself, the root of the upload zip (`index.html`, `css/`, `js/`, `fonts/`) |
| `deep-drill/js/platform.js` | CrazyGames SDK v3 layer: ads, gameplay events, Data-module saves |
| `deep-drill/js/game/` | formulas, simulation, goals, gem content, pixel sprites, renderer |
| `promo/` | `promo.html` draws the covers; exported PNGs |
| `tools/` | build, tests, balance sim, font builder, video recorder |
| `DECISIONS.md` | design decisions and deviations from the original spec (RU) |
| `PORTAL.md` | what to put into the CrazyGames Developer Portal (RU/EN) |

## Tools

Python tools need Playwright. Video export also needs `imageio-ffmpeg`, and the font builder needs `fonttools`.

```bash
python tools/build.py           # stamp ?v=<hash> on css/js and pack build/deep-drill.zip
python tools/autotest.py        # headless tests: acceptance, 4 screen sizes, real SDK in local mode
python tools/export_promo.py    # promo/cover-*.png (1920x1080, 800x1200, 800x800)
python tools/record_video.py    # videos/*.mp4 preview clips (1920x1080 and 1080x1620)
python tools/make_font.py       # rebuild the DrillPixel UI font
node tools/balance-sim.js       # balance simulation of the core formulas
```
