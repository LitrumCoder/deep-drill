"""Quick screenshots for layout checks: python tools/shot.py out_dir [js_to_run_before_shot]"""
import functools
import http.server
import os
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'deep-drill')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'screenshots', 'tmp')
JS = sys.argv[2] if len(sys.argv) > 2 else ''
os.makedirs(OUT, exist_ok=True)

SIZES = [('p390', 390, 844, True), ('l1280', 1280, 720, False), ('l821', 821, 462, False), ('m800', 800, 450, True), ('l1920', 1920, 1080, False)]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer.request_queue_size = 128
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=GAME))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_address[1]}'

with sync_playwright() as p:
    b = p.chromium.launch()
    for tag, w, h, mob in SIZES:
        ctx = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mob, has_touch=mob, device_scale_factor=1)
        page = ctx.new_page()
        errs = []
        page.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.route('**/crazygames-sdk-v3.js', lambda r: r.abort())
        page.goto(base + '/index.html')
        page.wait_for_selector('#loader', state='detached', timeout=8000)
        if JS:
            page.evaluate(JS)
        time.sleep(0.8)
        page.screenshot(path=os.path.join(OUT, tag + '.png'))
        print(tag, 'errors:', errs)
        ctx.close()
    b.close()
