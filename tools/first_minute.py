"""Play the first minute like a new player and screenshot it: python tools/first_minute.py [out_dir]"""
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


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer.request_queue_size = 128
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=GAME))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_address[1]}'

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, locale='en-US')
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.route('**/crazygames-sdk-v3.js', lambda r: r.abort())
    page.goto(base + '/index.html')
    page.wait_for_selector('#loader', state='detached')
    r = page.evaluate("(() => { const R=G.Render.R; return [R.x, R.y, R.w, R.h]; })()")
    t0 = time.time()
    marks = [3, 12, 25, 40, 60]
    k = 0
    while marks:
        el = time.time() - t0
        x, y = r[0] + r[2] * (0.3 + 0.4 * ((k * 37) % 10) / 10), r[1] + r[3] * 0.75
        page.mouse.click(x, y)
        k += 1
        if k % 6 == 0:
            for sel in ['.urow:nth-child(1) .ubtn.can', '.urow:nth-child(2) .ubtn.can', '.urow:nth-child(3) .ubtn.can', '.urow:nth-child(4) .ubtn.can']:
                loc = page.locator(sel)
                if loc.count():
                    loc.first.click()
                    break
        if k % 15 == 0:
            page.evaluate("(() => { const n=G.Render.nodes[0]; if (n) { const R=G.Render.R, P=G.Render.PX; } })()")
            node = page.evaluate("(() => { const n=G.Render.nodes[0]; if (!n) return null; const R=G.Render.R, P=G.Render.PX; return [R.x+(n.x+5)*P, R.y+(G.Render.L.tipY-R.y)+(n.wy-G.Game.rt.camB)*P+5*P]; })()")
            if node:
                page.mouse.click(*node)
        if el >= marks[0]:
            page.screenshot(path=os.path.join(OUT, f'first-{marks[0]:02d}s.png'))
            marks.pop(0)
        page.wait_for_timeout(180)
    print(page.evaluate("({depth: Math.round(G.Save.data.depth), drill: G.Save.data.lv.drill, coins: Math.round(G.Save.data.coins), quests: G.Save.data.stats.quests, nodes: G.Save.data.stats.nodes, plates: G.Save.data.stats.plates})"))
    print('errors:', errs)
    b.close()
