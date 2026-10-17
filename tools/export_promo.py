"""Render promo/promo.html headless and save the three CrazyGames covers into promo/."""
import base64
import os
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PROMO = ROOT / 'promo'

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto((PROMO / 'promo.html').as_uri())
    page.wait_for_function('window.promoReady === true', timeout=10000)
    page.wait_for_timeout(200)
    for cid, name in [('landscape', 'cover-landscape-1920x1080.png'), ('portrait', 'cover-portrait-800x1200.png'), ('square', 'cover-square-800x800.png')]:
        data = page.evaluate(f"document.getElementById('{cid}').toDataURL('image/png')")
        (PROMO / name).write_bytes(base64.b64decode(data.split(',', 1)[1]))
        print('saved', PROMO / name, os.path.getsize(PROMO / name), 'bytes')
    print('errors:', errors)
    b.close()
