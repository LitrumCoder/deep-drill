"""Record CrazyGames preview videos (no sound, no cursor): python tools/record_video.py
Output: videos/deep-drill-landscape.mp4 (1920x1080) and videos/deep-drill-portrait.mp4 (1080x1620), about 19 s each.
The video opens on the static cover, then shows scripted gameplay: surface start, overdrive, a pest fight,
a plate break and a core blast."""
import functools
import http.server
import os
import pathlib
import shutil
import subprocess
import threading
import time

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'videos'
OUT.mkdir(exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
GPU_ARGS = ['--enable-gpu', '--use-angle=d3d11'] if os.name == 'nt' else ['--enable-gpu']


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer.request_queue_size = 128
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'

QUIET = """(() => { const s=G.Save.data; s.seenTips={tap:true,upgrade:true,engine:true,plate:true,cart:true,node:true,heat:true};
  s.daily.lastDay=Platform.dayIndex(); s.cartTimer=9999; s.stats.playTime=0; G.Game.rt.enemyTimer=9999;
  s.ach={depth_100:true,depth_1k:true,depth_5k:true,taps_1k:true,drill_100:true,first_core:true}; G.UI.closeAll();
  document.querySelectorAll('.tip,.hand').forEach(e=>e.remove()); })()"""
DEEP = """(() => { const s=G.Save.data; s.lv={drill:110,engine:32,sorter:30,grip:16,storage:5}; s.coins=3.4e9; s.gems=180;
  s.pets={bot:3,bat:4,golem:4}; s.depth=1430; s.plate=null; G.Game.rt.camB=0; s.cartTimer=4; G.UI.setTab('up'); })()"""


def record(name, w, h, cover):
    tmp = OUT / ('tmp-' + name)
    shutil.rmtree(tmp, ignore_errors=True)
    with sync_playwright() as p:
        b = p.chromium.launch(args=GPU_ARGS)
        ctx = b.new_context(viewport={'width': w, 'height': h}, record_video_dir=str(tmp), record_video_size={'width': w, 'height': h},
                            locale='en-US', is_mobile=h > w, has_touch=h > w)
        page = ctx.new_page()
        page.on('pageerror', lambda e: print('pageerror:', e))
        page.on('requestfailed', lambda rq: 'crazygames' not in rq.url and print('request failed:', rq.url, rq.failure))
        t_page = time.time()
        page.route('**/crazygames-sdk-v3.js', lambda r: r.abort())
        page.goto(f'{BASE}/promo/{cover}')
        page.evaluate("""(() => { const img=document.querySelector('img'); document.body.style.cssText='margin:0;background:#000;overflow:hidden';
           img.style.cssText='display:block;width:100vw;height:100vh;object-fit:cover'; })()""")
        page.wait_for_timeout(150)
        t_cover = time.time()
        page.wait_for_timeout(1500)
        page.goto(f'{BASE}/deep-drill/index.html')
        page.wait_for_selector('#loader', state='detached')
        page.evaluate(QUIET)
        page.add_style_tag(content='* { cursor: none !important; }')
        r = page.evaluate("(() => { const R=G.Render.R; return [R.x, R.y, R.w, R.h]; })()")
        tx, ty = r[0] + r[2] * 0.62, r[1] + r[3] * 0.72
        t0 = time.time()
        k = 0
        deep = boomed = False
        while time.time() - t0 < 16.5:
            el = time.time() - t0
            k += 1
            if not deep and el > 3.0:
                page.evaluate(DEEP)
                deep = True
            if deep and not boomed:
                page.evaluate(f"G.Game.tap({tx}, {ty})")
            if deep and k % 7 == 0:
                page.evaluate("(() => { const n=G.Render.nodes[0]; if (n) G.Render.collect(n); })()")
            if not deep:
                page.evaluate(f"G.Game.tap({tx}, {ty})")
            if deep and 6.5 < el < 6.7:
                page.evaluate("(() => { const rt=G.Game.rt; if (!rt.enemy) { G.Game.spawnEnemy(); rt.enemy.type='mole'; rt.enemy.hp=rt.enemy.max=5; G.UI.enemyAppeared('mole'); } })()")
            if deep and 8.4 < el < 9.6 and k % 2 == 0:
                page.evaluate("(() => { const L=G.Render.L.enemy; if (L) { const x=L.x+L.w/2, y=L.y+L.h/2; G.Game.rt.tapTimes=[]; G.Render.enemyFx(G.Game.hitEnemy(), x, y); } })()")
            if deep and 10.2 < el < 10.4:
                page.evaluate("G.Save.data.depth = 1499.6; G.Game.rt.enemy = null")
            if deep and 10.4 < el < 12 and k % 3 == 0:
                page.evaluate("(() => { const s=G.Save.data; if (s.plate) s.plate.hp = Math.min(s.plate.hp, G.Game.plateMax()*0.35); })()")
            if deep and not boomed and el > 13.2:
                page.evaluate("(() => { G.UI.closeAll(); const s=G.Save.data; s.depth=10000; s.plate=null; })()")
                page.wait_for_timeout(250)
                page.evaluate("G.UI.confirmCore()")
                page.wait_for_timeout(500)
                page.locator('button:visible', has_text='Blow it up!').first.click()
                page.mouse.move(2, 2)
                boomed = True
            page.wait_for_timeout(100)
        page.wait_for_timeout(300)
        ctx.close()
        b.close()
    vids = list(tmp.glob('*.webm'))
    src = vids[0]
    dst = OUT / f'deep-drill-{name}.mp4'
    skip = max(0.0, t_cover - t_page)
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-ss', f'{skip:.2f}', '-i', str(src), '-t', '19.5', '-an',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', str(dst)], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    for old in OUT.glob(f'deep-drill-{name}.webm'):
        old.unlink()
    print('saved', dst, os.path.getsize(dst) // 1024, 'KB', f'(skipped {skip:.2f}s)')


if __name__ == '__main__':
    import sys
    which = sys.argv[1:] or ['landscape', 'portrait']
    if 'landscape' in which:
        record('landscape', 1920, 1080, 'cover-landscape-1920x1080.png')
    if 'portrait' in which:
        record('portrait', 1080, 1620, 'cover-portrait-800x1200.png')
