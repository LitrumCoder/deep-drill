"""Screens of the feature windows at 1280x720: python tools/shots_features.py [out_dir]"""
import functools
import http.server
import os
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'deep-drill')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'screenshots')
os.makedirs(OUT, exist_ok=True)

GPU_ARGS = ['--enable-gpu', '--use-angle=d3d11'] if os.name == 'nt' else ['--enable-gpu']


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer.request_queue_size = 128
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=GAME))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_address[1]}'

SETUP = """(() => { const s=G.Save.data; s.seenTips={tap:true,upgrade:true,engine:true,plate:true,cart:true,node:true,heat:true};
  s.daily.lastDay=Platform.dayIndex(); s.cartTimer=9999; G.UI.closeAll(); document.querySelectorAll('.tip,.hand').forEach(e=>e.remove());
  s.ach={depth_100:true,depth_1k:true,drill_100:true,taps_1k:true}; s.depth=2700; s.lv={drill:110,engine:20,grip:8,sorter:16,storage:4}; s.coins=3e9; s.gems=140;
  s.stats.playTime=999; s.stats.nodes=31; s.stats.quests=7; s.relics=[0,2]; s.planet=2; s.shards=10; })()"""

with sync_playwright() as p:
    b = p.chromium.launch(args=GPU_ARGS)
    for lang in ['en', 'ru']:
        ctx = b.new_context(viewport={'width': 1280, 'height': 720}, locale='en-US' if lang == 'en' else 'ru-RU')
        page = ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and 'ERR_FAILED' not in m.text and errs.append(m.text))
        page.route('**/crazygames-sdk-v3.js', lambda r: r.abort())
        page.goto(base + '/index.html')
        page.wait_for_selector('#loader', state='detached')
        page.evaluate(SETUP)
        time.sleep(1.5)
        page.evaluate("G.UI.closeAll()")

        def shot(name):
            page.screenshot(path=os.path.join(OUT, f'feat-{lang}-{name}.png'))

        page.evaluate("G.UI.setTab('goals')")
        time.sleep(0.5)
        shot('01-goals')
        page.evaluate("G.UI.setTab('up')")
        time.sleep(0.3)
        page.hover('.urow >> nth=0')
        time.sleep(0.4)
        shot('02-tooltip')
        page.mouse.move(10, 10)
        for typ in ['mole', 'spider', 'slime', 'cavein']:
            page.evaluate(f"(() => {{ const rt=G.Game.rt; G.Game.spawnEnemy(); rt.enemy.type='{typ}'; rt.enemy.hp=rt.enemy.max=G.Game.ENEMIES['{typ}'].hp; rt.enemy.t=0; G.UI.enemyAppeared('{typ}'); }})()")
            time.sleep(2.0)
            shot('03-enemy-' + typ)
            page.evaluate("G.Game.rt.enemy=null")
        page.evaluate("G.Save.data.depth=10000; G.Save.data.plate=null")
        time.sleep(0.3)
        page.evaluate("G.UI.confirmCore()")
        time.sleep(0.4)
        shot('04-core-confirm')
        page.evaluate("G.UI.closeAll()")
        page.evaluate("G.UI.setTab('planet')")
        time.sleep(0.4)
        page.evaluate("document.getElementById('body').scrollTop = 99999")
        time.sleep(0.3)
        shot('05-perks')
        page.evaluate("G.UI.setTab('shop')")
        time.sleep(0.4)
        page.evaluate("document.getElementById('body').scrollTop = 200")
        time.sleep(0.2)
        shot('06-shop-looks')
        print(lang, 'errors:', errs)
        ctx.close()
    b.close()
