"""Render the three CrazyGames covers from the live 3D scene: python tools/export_promo.py
The game is staged (deep gem layer, upgraded drill, pets, treasures, overdrive sparks), the UI is hidden and only the title is drawn.
Output: promo/cover-landscape-1920x1080.png, promo/cover-portrait-800x1200.png, promo/cover-square-800x800.png"""
import functools
import http.server
import os
import pathlib
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PROMO = ROOT / 'promo'
GPU_ARGS = ['--enable-gpu', '--use-angle=d3d11'] if os.name == 'nt' else ['--enable-gpu']


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer.request_queue_size = 128
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'deep-drill')))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'

STAGE = """(() => { const s=G.Save.data, rt=G.Game.rt;
  Object.assign(s.seenTips,{tap:true,upgrade:true,engine:true,plate:true,cart:true,node:true,heat:true});
  s.daily.lastDay=Platform.dayIndex(); s.cartTimer=9999; rt.enemyTimer=9999; s.stats.playTime=0;
  s.planet=1; s.lv={drill:160,engine:35,sorter:35,grip:35,storage:8}; s.pets={bot:3,bat:0,golem:0};
  s.depth=3200; s.plate=null; s.skins.active='classic'; G.Save.save=()=>{}; G.UI.closeAll();
  // keep drilling (sparks, spinning head) but hold the rock still so the shot can be composed
  const upd=G.Game.update; G.Game.update = dt => { const c=rt.camB; upd(dt); rt.camB=c; s.depth=3200; s.plate=null; }; })()"""

# scene box per cover: where the drill is framed, the title takes the rest
LAYOUTS = {
    'landscape': dict(w=1920, h=1080, box='0 0 0 820px', scale=1.45, title='left:70px; top:300px; width:820px; text-align:center;', size=190, sub=78),
    'portrait': dict(w=800, h=1200, box='380px 0 0 0', scale=1.3, title='left:0; right:0; top:70px; text-align:center;', size=150, sub=62),
    'square': dict(w=800, h=800, box='240px 0 0 0', scale=1.0, title='left:0; right:0; top:34px; text-align:center;', size=128, sub=52),
}

TITLE_CSS = """
#hud, #sheet, .sctop, .scright, .platebox, .corebox, .lbanner, .tip, .hand, .utip, #fx { display: none !important; }
#ui { zoom: 1 !important; }
#app { grid-template-areas: "scene" !important; grid-template-columns: 1fr !important; grid-template-rows: 1fr !important; max-width: none !important; max-height: none !important; }
.ctitle { position: fixed; z-index: 50; font-family: Nunito, sans-serif; font-weight: 900; line-height: .95; pointer-events: none; }
.ctitle .row { position: relative; display: block; }
.ctitle .s, .ctitle .f { display: block; }
.ctitle .s { -webkit-text-stroke: var(--sw) #3A1606; color: #3A1606; filter: drop-shadow(0 var(--sh) 0 #2A0E02) drop-shadow(0 18px 30px rgba(0,0,0,.45)); }
.ctitle .f { position: absolute; inset: 0; background: linear-gradient(#FFF6B0 10%, #FFD447 48%, #FF9F2E 92%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.ctitle .sub .f { background: linear-gradient(#FFFFFF, #D8ECFF); -webkit-background-clip: text; background-clip: text; }
"""


def title_html(size, sub):
    def row(text, px, cls=''):
        return (f'<span class="row {cls}" style="font-size:{px}px; --sw:{px * 0.17:.0f}px; --sh:{px * 0.06:.0f}px">'
                f'<span class="s">{text}</span><span class="f">{text}</span></span>')
    return row('DEEPER!', size) + row('IDLE DRILL', sub, 'sub')


def place_nodes(page, w, h):
    # treasures on both sides of the shaft, at fixed spots so the cover is the same every run
    page.evaluate("""(() => { const N=G.Render.nodes; while (N.length) G.Render.collect(N[0]);
      const roll=G.Game.rollNode, spots=[['gem',-4.0,4.4],['chest',4.2,0.4],['nugget',-3.7,-1.9],['relic',4.0,5.2]];
      for (const [type,x,y] of spots) { G.Game.rollNode=()=>({type, relic: type==='relic' ? 3 : -1}); G.Render.spawnNode();
        const n=N[N.length-1]; n.life=999; n.x=x; n.gy += n.mesh.position.y - y; }
      G.Game.rollNode=roll; })()""")


with sync_playwright() as p:
    b = p.chromium.launch(args=GPU_ARGS)
    for name, L in LAYOUTS.items():
        page = b.new_page(viewport={'width': L['w'], 'height': L['h']}, locale='en-US')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('**/crazygames-sdk-v3.js', lambda r: r.abort())
        page.goto(BASE + '/index.html')
        page.wait_for_selector('#loader', state='detached', timeout=20000)
        page.evaluate(STAGE)
        page.add_style_tag(content=TITLE_CSS + f"#app {{ padding: {L['box']} !important; }}")
        page.evaluate(f"G.Render.setViewScale({L['scale']})")
        page.wait_for_timeout(1500)
        place_nodes(page, L['w'], L['h'])
        for _ in range(14):
            page.evaluate("G.Game.rt.tapTimes=[]; G.Game.tap(0, 0)")
            page.wait_for_timeout(60)
        page.evaluate(f"""(() => {{ const d=document.createElement('div'); d.className='ctitle'; d.style.cssText='{L['title']}';
          d.innerHTML='{title_html(L['size'], L['sub'])}'; document.body.append(d); }})()""")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(500)
        out = PROMO / f"cover-{name}-{L['w']}x{L['h']}.png"
        page.screenshot(path=str(out))
        print('saved', out, os.path.getsize(out), 'bytes', 'errors:', errors)
        page.close()
    b.close()
