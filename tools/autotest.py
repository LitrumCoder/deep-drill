"""Headless autotest for Deep Drill: python tools/autotest.py"""
import functools
import http.server
import json
import os
import re
import subprocess
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'deep-drill')
SHOTS = os.path.join(ROOT, 'screenshots')
os.makedirs(SHOTS, exist_ok=True)
SAVE_KEY = 'deep-drill-save'
# headless Chromium falls back to SwiftShader (~5 fps for the 3D scene); use the real GPU so timings match a player's browser
GPU_ARGS = ['--enable-gpu', '--use-angle=d3d11'] if os.name == 'nt' else ['--enable-gpu']

results = []


def check(name, ok, info=''):
    results.append((name, bool(ok), str(info)))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{info}]' if info != '' else ''), flush=True)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer.request_queue_size = 128   # the default of 5 drops connections when the page loads all scripts at once
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=GAME))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'


def wait_for(page, js, timeout=10.0):
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(js):
            return True
        time.sleep(0.05)
    return False


def new_page(browser, w, h, mobile, errors, sdk=False, locale='en-US'):
    ctx = browser.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile,
                              device_scale_factor=2 if mobile else 1, locale=locale)
    page = ctx.new_page()

    def on_console(m):
        if m.type in ('error', 'warning'):
            if not sdk and 'ERR_FAILED' in m.text:
                return
            if 'GL Driver Message' in m.text:   # driver performance notes about reading back the shop thumbnails
                return
            errors.append(f'{m.type}: {m.text}')
    page.on('console', on_console)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))

    def on_req(r):
        u = r.url
        if u.startswith(BASE) or u.startswith('data:') or u.startswith('blob:'):
            return
        if sdk and re.match(r'https://([a-z0-9-]+\.)*crazygames\.com/', u):
            return
        if not sdk and 'crazygames-sdk-v3.js' in u:
            return
        errors.append('external request: ' + u)
    page.on('request', on_req)
    if not sdk:
        page.route('**/crazygames-sdk-v3.js', lambda r: r.abort())
    return ctx, page


def open_game(page):
    page.goto(BASE + '/index.html')
    page.wait_for_selector('#loader', state='detached', timeout=20000)
    time.sleep(0.2)


def shot(page, name):
    page.screenshot(path=os.path.join(SHOTS, name + '.png'))


def click_btn(page, text, timeout=4000):
    page.locator('button:visible', has_text=text).first.click(timeout=timeout)


def scene_point(page, fx=0.5, fy=0.75):
    r = page.evaluate("(() => { const R = G.Render.R; return {x:R.x, y:R.y, w:R.w, h:R.h}; })()")
    return r['x'] + r['w'] * fx, r['y'] + r['h'] * fy


def tap_scene(page, n=1, mobile=False):
    x, y = scene_point(page, 0.78, 0.62)
    for _ in range(n):
        if mobile:
            page.touchscreen.tap(x, y)
        else:
            page.mouse.click(x, y)
        time.sleep(0.12)


def drill_blockers(page):
    """UI elements drawn over the drill. The scene must keep the drill clear on every screen size."""
    return page.evaluate("""(() => { const b = G.Render.L.box; if (!b) return ['no drill box'];
      const out = [];
      document.querySelectorAll('#hud, #sheet, .sctop > *, .scright > *, .scleft > *, .platebox.on, .corebox.on, .lbanner.on, .toast').forEach(e => {
        const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === 'hidden') return;
        if (r.right > b.x + 4 && r.left < b.x + b.w - 4 && r.bottom > b.y + 4 && r.top < b.y + b.h - 4) out.push(e.className || e.id);
      });
      return out; })()""")


def close_modals(page):
    page.evaluate("G.UI.closeAll()")
    time.sleep(0.25)


def quiet(page):
    """Mark tutorial seen and claim daily so modals don't get in the way."""
    page.evaluate("""(() => { const s=G.Save.data; Object.assign(s.seenTips,{tap:true,upgrade:true,plate:true,engine:true,cart:true});
      s.daily.lastDay = Platform.dayIndex(); s.cartTimer = 9999; G.Save.save(); })()""")


# ---------------------------------------------------------------- scenario per viewport
def run_viewport(browser, w, h, mobile, tag):
    errors = []
    ctx, page = new_page(browser, w, h, mobile, errors)
    open_game(page)
    check(f'{tag}: loads to gameplay', page.evaluate("!!G.Game && !document.getElementById('loader')"))
    time.sleep(0.6)
    shot(page, f'{tag}-01-start')
    bl = drill_blockers(page)
    check(f'{tag}: no UI over the drill at start', not bl, bl)

    tap_scene(page, 3, mobile)
    check(f'{tag}: 3 taps counted, tutorial step 1 done', page.evaluate("G.Save.data.stats.taps === 3 && !!G.Save.data.seenTips.tap"),
          page.evaluate("G.Save.data.stats.taps"))

    page.evaluate("G.Save.data.coins = 40")
    wait_for(page, "!!document.querySelector('.tip')", 3)
    time.sleep(0.3)
    shot(page, f'{tag}-02-upgrade-tip')
    page.locator('.urow').first.locator('button').click()
    check(f'{tag}: drill bought via button', page.evaluate("G.Save.data.lv.drill >= 2"))
    quiet(page)

    page.evaluate("G.Save.data.depth = 49.5; G.Save.data.coins = 1234")
    wait_for(page, "!!G.Save.data.plate", 6)
    time.sleep(0.4)
    shot(page, f'{tag}-03-plate')
    check(f'{tag}: plate box visible', page.locator('.platebox.on').count() == 1)
    page.evaluate("G.UI.toast('Achievement: Drill Bit level 100 test toast')")
    time.sleep(0.3)
    bl = drill_blockers(page)
    check(f'{tag}: plate bar and toasts keep the drill clear', not bl, bl)
    page.evaluate("G.Save.data.plate.hp = 0.01")
    wait_for(page, "!G.Save.data.plate", 3)
    time.sleep(0.25)
    shot(page, f'{tag}-04-new-layer')
    bl = drill_blockers(page)
    check(f'{tag}: new-layer banner keeps the drill clear', not bl, bl)
    check(f'{tag}: layer 1 reached after plate', page.evaluate("G.Game.layer() === 1"))
    time.sleep(1.6)

    page.evaluate("G.UI.setTab('planet')")
    time.sleep(0.4)
    shot(page, f'{tag}-05-planet')
    page.evaluate("G.Save.data.gems = 120; G.UI.setTab('shop')")
    time.sleep(0.4)
    shot(page, f'{tag}-06-shop')
    page.evaluate("G.UI.setTab('up')")

    page.evaluate("G.UI.showSettings()")
    time.sleep(0.4)
    shot(page, f'{tag}-07-settings')
    close_modals(page)

    page.evaluate("G.Save.data.daily.lastDay = null; G.UI.showDaily()")
    time.sleep(0.4)
    shot(page, f'{tag}-08-daily')
    close_modals(page)
    page.evaluate("G.Save.data.daily.lastDay = Platform.dayIndex()")

    page.evaluate("G.Retention.progress(G.Save.data.dailyTasks.list[0].tpl, 9999); G.UI.showTasks()")
    time.sleep(0.4)
    shot(page, f'{tag}-09-tasks')
    close_modals(page)

    page.evaluate("G.UI.showGeode()")
    time.sleep(0.4)
    shot(page, f'{tag}-10-geode')
    close_modals(page)

    page.evaluate("G.UI.showTurbo()")
    time.sleep(0.4)
    shot(page, f'{tag}-11-turbo')
    close_modals(page)

    page.evaluate("G.Save.data.cartTimer = 0")
    wait_for(page, "!!G.Game.rt.cart", 3)
    time.sleep(3.0)
    shot(page, f'{tag}-12-cart-ride')
    cart_xy = page.evaluate("(() => { const c = G.Render.L.cart; return c ? [c.x + c.w/2, c.y + c.h/2] : null; })()")
    if cart_xy:
        if mobile:
            page.touchscreen.tap(*cart_xy)
        else:
            page.mouse.click(*cart_xy)
    ok = wait_for(page, "G.UI.anyModal()", 2)
    check(f'{tag}: cart clickable', ok)
    time.sleep(0.3)
    shot(page, f'{tag}-13-cart')
    close_modals(page)

    page.evaluate("G.Save.data.depth = 10000; G.Save.data.plate = null")
    time.sleep(0.5)
    shot(page, f'{tag}-14-core')
    bl = drill_blockers(page)
    check(f'{tag}: core button keeps the drill clear', not bl, bl)
    page.evaluate("G.UI.confirmCore()")
    time.sleep(0.4)
    shot(page, f'{tag}-15-core-confirm')
    click_btn(page, 'Blow it up!')
    time.sleep(1.3)
    shot(page, f'{tag}-16-flight')
    wait_for(page, "G.UI.anyModal()", 5)
    time.sleep(0.4)
    shot(page, f'{tag}-17-arrive')
    check(f'{tag}: arrived to planet 2', page.evaluate("G.Save.data.planet === 2 && G.Save.data.shards === 10"))
    close_modals(page)
    time.sleep(0.6)
    shot(page, f'{tag}-18-mars')

    # offline window
    page.evaluate(f"""(() => {{ const d=G.Save.data; d.lastSeen = Date.now() - 3*3600e3; d.lv.storage = 0;
       localStorage.setItem('{SAVE_KEY}', JSON.stringify(d)); G.Save.save = () => {{}}; }})()""")
    page.reload()
    page.wait_for_selector('#loader', state='detached', timeout=10000)
    time.sleep(0.5)
    shot(page, f'{tag}-19-offline')
    sec = page.evaluate("G.Game.rt.lastOffline && G.Game.rt.lastOffline.sec")
    check(f'{tag}: offline capped at 2 h with storage 0', sec == 7200, sec)
    click_btn(page, 'Collect')
    close_modals(page)

    page.evaluate("G.Save.data.settings.lang='ru'; G.setLang('ru'); G.UI.rebuild()")
    time.sleep(0.5)
    shot(page, f'{tag}-20-ru')
    page.evaluate("G.UI.setTab('planet')")
    time.sleep(0.4)
    shot(page, f'{tag}-21-ru-planet')

    over = page.evaluate("""(() => { const out=[]; document.querySelectorAll('#app *').forEach(e => {
        if (e.closest('.scroll') && !e.classList.contains('scroll')) return;
        const r=e.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1)) out.push(e.className || e.tagName); });
        return out.slice(0,5); })()""")
    check(f'{tag}: nothing outside viewport', not over, over)
    check(f'{tag}: no console errors', not errors, errors[:5])
    ctx.close()


# ---------------------------------------------------------------- acceptance tests (README §20)
def acceptance(browser):
    errors = []
    ctx, page = new_page(browser, 1280, 720, False, errors)
    open_game(page)
    quiet(page)
    r = page.evaluate("""(() => { const g = G.Game.gold(0) ? 3 : 1;
      return { P: G.Game.power(false), v: G.Game.speed(G.Game.power(false), 0), I: G.Game.income(G.Game.power(false), 0) / g }; })()""")
    check('AT1: new game P=1, v=1 m/s, income 1/s', r == {'P': 1, 'v': 1, 'I': 1}, r)

    r = page.evaluate("""(() => { const s=G.Save.data; s.lv.drill=24; s.coins=1e9; s.buyMode=1; const a=G.Game.power(false);
      G.Game.buy('drill'); return [a, G.Game.power(false)]; })()""")
    check('AT2: drill 24 -> 25 multiplies power 24 -> 75', r == [24, 75], r)

    r = page.evaluate("""(() => {
      const s=G.Save.data, rt=G.Game.rt; const out=[]; const vein=G.Retention.vein; G.Retention.vein = () => 5;
      for (const L of [3, 2]) {
        s.planet=1; s.shards=0; s.turboLeft=0; s.lv={drill:L,engine:0,sorter:0,grip:0,storage:0};
        s.depth=49.99; s.plate={hp:G.plateHP(0,1), timer:0}; rt.banner=null; rt.cart=null; s.cartTimer=9999;
        const hp0=s.plate.hp, c0=s.coins; let broke=false, regen=false;
        for (let k=0;k<620;k++){ G.Game.update(0.05); if(!s.plate){broke=true;break;} if(s.plate.timer<0.06 && k>10) regen=true; }
        out.push({L, hp0, broke, regen, coinsGrew: s.coins > c0});
      }
      G.Retention.vein = vein; rt.banner=null; return out; })()""")
    check('AT3: plate HP=75 at 50 m; P=3 breaks it in 30 s, P=2 regenerates',
          r[0]['hp0'] == 75 and r[0]['broke'] and not r[1]['broke'] and r[1]['regen'], r)
    check('AT4: coins keep growing while the plate stands', r[1]['coinsGrew'], r[1])

    r = page.evaluate("""(() => { const s=G.Save.data; s.lv.drill=1; s.coins=12345; s.buyMode='max';
      const n=G.maxBuy('drill',1,12345), c=G.cost('drill',1,n), c1=G.cost('drill',1,n+1);
      G.Game.buy('drill'); return {n, ok: c <= 12345 && c1 > 12345, lv: s.lv.drill, coins: s.coins}; })()""")
    check('AT5: MAX buys exactly the affordable levels, coins stay >= 0', r['ok'] and r['lv'] == 1 + r['n'] and r['coins'] >= 0, r)

    r = page.evaluate("""(() => { const s=G.Save.data; s.planet=1; s.shards=0; s.depth=10000; s.plate=null; s.coins=5e6; s.lv.engine=3;
      G.Game.explode(); return {S:s.shards, p:s.planet, coins:s.coins, drill:s.lv.drill, P:G.Game.power(false), H0:G.H(0,s.planet)}; })()""")
    check('AT7: core blast -> S=10, planet 2, coins 0, drill 1, P=2, H0=3', r == {'S': 10, 'p': 2, 'coins': 0, 'drill': 1, 'P': 2, 'H0': 3}, r)

    page.evaluate("G.Render.busy = () => false")
    r = page.evaluate("""(() => { const s=G.Save.data; const t0=s.stats.taps; G.Game.rt.tapTimes=[];
      for (let k=0;k<50;k++) G.Game.tap(100,100); return s.stats.taps - t0; })()""")
    check('AT8: 50 taps in a burst count as 10', r == 10, r)

    page.evaluate("""(() => { const s=G.Save.data; s.depth=149.99; s.plate={hp:1234.5, timer:7}; s.turboLeft=600; s.coins=777; G.Save.save(); })()""")
    page.reload()
    page.wait_for_selector('#loader', state='detached', timeout=10000)
    r = page.evaluate("(() => { const s=G.Save.data; return {d:s.depth, hp:s.plate && s.plate.hp, turbo:s.turboLeft}; })()")
    check('AT9: reload keeps depth, plate HP and turbo', abs(r['d'] - 149.99) < 1e-6 and r['hp'] is not None and r['hp'] > 1000 and r['turbo'] > 590, r)

    page.evaluate(f"""(() => {{ const d=G.Save.data; d.lastSeen = Date.now() - 3*3600e3; d.lv.storage = 0; d.plate=null; d.depth=10;
       localStorage.setItem('{SAVE_KEY}', JSON.stringify(d)); G.Save.save = () => {{}}; }})()""")
    page.reload()
    page.wait_for_selector('#loader', state='detached', timeout=10000)
    r = page.evaluate("G.Game.rt.lastOffline")
    check('AT6: 3 h away with storage 0 -> exactly 2 h of offline at half power', r and r['sec'] == 7200, r and r['sec'])
    close_modals(page)

    r = page.evaluate("""(() => { const out=[]; for (let d=20000; d<20060; d++) out.push(G.Retention.veinFor(d));
      return out.every((v,i)=> i===0 || v!==out[i-1]); })()""")
    check('Golden vein never repeats two days in a row', r)
    r = page.evaluate("""(() => { const tl=G.Retention.tasksEnsure().list; return new Set(tl.map(t=>t.tpl)).size === 3; })()""")
    check('Daily tasks: 3 distinct templates', r)
    r = page.evaluate("""(() => { const s=G.Save.data; s.geode.startedAt = Date.now() - 8*3600e3 - 1000; const g0=s.gems;
      const o=G.Retention.geodeOpen(); return o && s.gems === g0 + 5 && G.Retention.geodeLeft() > 8*3600 - 5; })()""")
    check('Geode opens after 8 h: +5 gems and restarts', r)
    r = page.evaluate("""(() => { const s=G.Save.data; s.daily.lastDay = Platform.dayIndex() - 1; s.daily.cycleDay = 6; const g0=s.gems;
      G.Retention.claimDaily(1); return {day: s.daily.cycleDay, gems: s.gems - g0}; })()""")
    check('Daily reward: day 7 gives 25 gems', r == {'day': 7, 'gems': 25}, r)
    # language switch through the real settings UI must keep the scene alive
    page.evaluate("G.UI.closeAll()")
    time.sleep(0.2)
    page.locator('#hud .gear').click()
    time.sleep(0.3)
    click_btn(page, 'RU')
    time.sleep(0.5)
    r = page.evaluate("({tabs: document.querySelector('#tabs').innerText, w: G.Render.R.w, h: G.Render.R.h, title: document.querySelector('.ptitle') && document.querySelector('.ptitle').innerText})")
    check('Language switch: UI in Russian, scene still sized', 'Улучшения' in r['tabs'] and r['w'] > 200 and r['h'] > 200 and r['title'] == 'Настройки', r)
    r = page.evaluate("[...document.querySelectorAll('.flag')].map(b => [b.innerText.trim(), b.classList.contains('on')])")
    check('Language switch: the RU button is highlighted', r == [['EN', False], ['RU', True]], r)
    shot(page, 'lang-switch-ru')
    click_btn(page, 'EN')
    time.sleep(0.4)
    r = page.evaluate("({tabs: document.querySelector('#tabs').innerText, w: G.Render.R.w})")
    check('Language switch back to English', 'Upgrades' in r['tabs'] and r['w'] > 200, r)
    page.evaluate("G.UI.closeAll()")

    r = page.evaluate("""(() => { const s=G.Save.data, rt=G.Game.rt; s.plate=null; s.depth=300; rt.over=0; rt.heat=0.95; rt.tapTimes=[];
      const p0=G.Game.power(false,false); G.Game.tap(300,300); return {over: rt.over, mul: G.Game.power(false)/p0}; })()""")
    check('Overdrive: full heat bar -> 8 s of power x3', r['over'] > 7.9 and abs(r['mul'] - 3) < 1e-9, r)
    r = page.evaluate("""(() => { const s=G.Save.data; G.Game.rt.over=0; s.relics=[]; const i0=G.Game.incomeBase();
      G.Render.nodes.length=0; G.Render.spawnNode(); const n=G.Render.nodes[0]; n.type='nugget'; const c0=s.coins; G.Render.collect(n);
      const coinsOk = s.coins > c0 && G.Render.nodes.length === 0;
      G.Render.spawnNode(); const m=G.Render.nodes[0]; m.type='relic'; m.relic=0; G.Render.collect(m);
      return {coinsOk, relics: s.relics, ratio: G.Game.incomeBase()/i0}; })()""")
    check('Treasure: nugget gives coins; relic adds +5% income', r['coinsOk'] and r['relics'] == [0] and abs(r['ratio'] - 1.05) < 1e-9, r)

    # tooltip on hover
    page.evaluate("G.UI.closeAll(); G.UI.setTab('up')")
    time.sleep(0.3)
    page.hover('.urow >> nth=1')
    time.sleep(0.3)
    r = page.evaluate("(() => { const t=document.querySelector('.utip.on'); return t ? t.innerText : ''; })()")
    check('Upgrade tooltip on hover explains the upgrade', 'Engine' in r and 'Next' in r, r[:60])
    page.mouse.move(5, 5)

    # visual tiers
    r = page.evaluate("""(() => { const s=G.Save.data; const a=G.Look.look({drill:150,engine:30,grip:5,sorter:60,storage:10});
      s.lv.drill=24; s.coins=1e12; s.buyMode=1; let seen=null; const f=G.UI.lookUpgraded; G.UI.lookUpgraded=(id,t)=>{seen=[id,t]; f(id,t);};
      G.Game.buy('drill'); G.UI.lookUpgraded=f; return {a, seen}; })()""")
    check('Visual tiers: levels change the drill look, tier-up is announced', r['a'] == {'head': 4, 'engine': 3, 'grip': 1, 'sorter': 4, 'storage': 4} and r['seen'] == ['drill', 1], r)

    # prestige perks
    r = page.evaluate("""(() => { const s=G.Save.data; s.planet=2; s.depth=10000; s.plate=null; const pv=G.Game.prestigePreview();
      G.Game.explode(); return {planet:s.planet, drill:s.lv.drill, perk: pv.perk && pv.perk.id, start: pv.startDrill}; })()""")
    check('Prestige: preview shows the next perk; planet 3 starts with Drill Bit 10', r == {'planet': 3, 'drill': 10, 'perk': 'start10', 'start': 10}, r)

    # enemies
    r = page.evaluate("""(() => { const s=G.Save.data, rt=G.Game.rt; rt.enemy=null; s.depth=300; s.plate=null; s.coins=1e6;
      rt.lastInputAt=-1e9; s.stats.playTime=999; rt.enemyTimer=1; for (let k=0;k<100;k++) G.Game.update(0.05);
      const idle = rt.enemy === null;
      rt.lastInputAt=performance.now(); rt.enemyTimer=0.01; G.Game.update(0.05); const spawned = !!rt.enemy;
      rt.enemy.type='mole'; rt.enemy.hp=rt.enemy.max=5; rt.enemy.t=0; rt.enemy.life=12;
      const c0=s.coins; for (let k=0;k<60;k++) G.Game.update(0.05); const stolen=rt.enemy.stolen; const lost = c0 - s.coins;
      let res=null; for (let k=0;k<5;k++) { rt.tapTimes=[]; res=G.Game.hitEnemy(); }
      return {idle, spawned, stolen: stolen > 0, defeated: res && res.defeated, back: res && res.coins >= stolen, enemies: s.stats.enemies}; })()""")
    check('Enemies: none while AFK; a mole steals coins and returns them when beaten',
          r['idle'] and r['spawned'] and r['stolen'] and r['defeated'] and r['back'] and r['enemies'] >= 1, r)
    r = page.evaluate("""(() => { const rt=G.Game.rt; G.Game.spawnEnemy(); rt.enemy.type='slime'; rt.enemy.hp=rt.enemy.max=7;
      const jam = G.Game.power(false) === 0; for (let k=0;k<7;k++) { rt.tapTimes=[]; G.Game.hitEnemy(); } return {jam, free: G.Game.power(false) > 0}; })()""")
    check('Enemies: magma slime jams the drill until tapped off', r == {'jam': True, 'free': True}, r)

    # micro quests and macro goals
    r = page.evaluate("""(() => { const s=G.Save.data, rt=G.Game.rt; s.quest=null; s.stats.quests=0; rt.enemy=null; s.plate=null; s.depth=300;
      const q=G.Goals.quest(); const n=q.n; const c0=s.coins;
      for (let k=0;k<n;k++) { rt.tapTimes=[]; G.Game.tap(300,300); }
      return {k:q.k, quests:s.stats.quests, paid: s.coins > c0}; })()""")
    check('Micro quest: "tap N times" completes and pays', r == {'k': 'tap', 'quests': 1, 'paid': True}, r)
    r = page.evaluate("""(() => { const s=G.Save.data; s.macro={}; s.stats.nodes=25; const m=G.Goals.MACRO.find(x=>x.id==='treasures');
      const ready=G.Goals.macroState(m).ready; const g0=s.gems; const got=G.Goals.claimMacro('treasures');
      return {ready, got, gems: s.gems-g0, next: G.Goals.macroState(m).target}; })()""")
    check('Macro goal: 25 treasures -> claim 10 gems, next stage 100', r == {'ready': True, 'got': 10, 'gems': 10, 'next': 100}, r)

    # a newer but empty copy must never replace real progress
    r = page.evaluate("""(() => { const keep = G.Save.data, f = Platform.storeGetAll;
      const real = Object.assign(G.Save.defaults(), {planet: 7, depth: 500, savedAt: 1000}); real.stats.playTime = 5000;
      const fresh = Object.assign(G.Save.defaults(), {planet: 1, depth: 3, savedAt: 9e12}); fresh.stats.playTime = 4;
      Platform.storeGetAll = () => [JSON.stringify(fresh), '{broken', JSON.stringify(real)];
      G.Save.load(); const got = G.Save.data.planet; Platform.storeGetAll = f; G.Save.data = keep; return got; })()""")
    check('Save: a newer empty or broken copy never replaces real progress', r == 7, r)

    # gem content
    check('No "?" badges on upgrade icons', page.locator('.qmark').count() == 0)
    r = page.evaluate("""(() => { const s=G.Save.data, rt=G.Game.rt; rt.enemy=null; rt.banner=null; s.depth=300; s.turboLeft=0; rt.over=0;
      const run = bot => { s.pets.bot=bot; rt.botAcc=0; s.plate={hp:1e15, timer:0}; for (let k=0;k<40;k++) { s.plate.timer=0; G.Game.update(0.05); } return 1e15 - s.plate.hp; };
      const a=run(0), b=run(2); s.plate=null; s.pets.bot=0; return {a, b, more: b > a}; })()""")
    check('Drill Bot taps the plate on its own', r['more'], r)
    r = page.evaluate("""(() => { const s=G.Save.data, C=G.Crystal; s.gems=100000; s.lab={crit:0,luck:0,heat:0,plate:0,turbo:0};
      const c0=C.labCost('crit'); C.buyLab('crit'); C.buyLab('crit'); C.buyLab('crit');
      const sh=s.shards, f0=C.forgeCost(); C.forge(); const f1=C.forgeCost();
      const p0=C.petCost('golem'); C.buyPet('golem');
      return {crit: C.critMul(), c0, shards: s.shards-sh, grows: f1>f0, golem: C.petLv('golem'), p0}; })()""")
    check('Crystal Lab, Shard Forge and companions spend gems', r['crit'] == 8 and r['shards'] == 1 and r['grows'] and r['golem'] == 1, r)
    page.evaluate("""(() => { const s=G.Save.data, rt=G.Game.rt; s.pets.golem=10; s.pets.bat=10; rt.enemy=null; s.stats.enemies=0; s.stats.nodes=0;
      G.Game.spawnEnemy(); rt.enemy.type='mole'; rt.enemy.hp=rt.enemy.max=5; rt.enemy.life=60; rt.enemyTimer=9999;
      G.Render.nodes.length=0; G.Render.spawnNode(); G.Render.nodes[0].type='nugget'; G.Render.nodes[0].life=60; })()""")
    page.wait_for_timeout(7000)
    r = page.evaluate("({enemies: G.Save.data.stats.enemies, enemy: !!G.Game.rt.enemy, nodes: G.Save.data.stats.nodes})")
    check('Rock Golem beats pests, Magnet Bat grabs treasures', r['enemies'] >= 1 and not r['enemy'] and r['nodes'] >= 1, r)
    shot(page, 'pets-in-shaft')
    page.evaluate("G.UI.setTab('shop')")
    page.wait_for_timeout(400)
    shot(page, 'shop-gem-content')
    check('acceptance: no console errors', not errors, errors[:5])
    ctx.close()


# ---------------------------------------------------------------- real CrazyGames SDK (local environment)
def sdk_smoke(browser):
    errors, logs = [], []
    ctx, page = new_page(browser, 1280, 720, False, errors, sdk=True)
    page.on('console', lambda m: logs.append(m.text))
    try:
        open_game(page)
    except Exception as e:
        check('SDK: game loads with real SDK', False, e)
        ctx.close()
        return
    info = page.evaluate("Platform.info")
    check('SDK: initialised in local environment', info['sdk'] and info['env'] == 'local', info)
    joined = '\n'.join(logs)
    check('SDK: loadingStart/loadingStop/gameplayStart reported', all(k in joined for k in ['loading start', 'loading stop', 'gameplay start']))
    quiet(page)
    time.sleep(1.1)
    page.evaluate("G.UI.showSettings()")
    time.sleep(0.3)
    check('SDK: menu stops gameplay', 'gameplay stop' in '\n'.join(logs))
    close_modals(page)
    end = time.time() + 5
    while time.time() < end and '\n'.join(logs).count('gameplay start') < 2:
        page.wait_for_timeout(100)
    check('SDK: closing the menu restarts gameplay', '\n'.join(logs).count('gameplay start') >= 2)
    n0 = len(logs)
    page.evaluate("G.UI.showTurbo()")
    time.sleep(0.3)
    t0 = page.evaluate("G.Save.data.turboLeft")
    ad = page.locator('button.adbtn:visible')
    if ad.count():
        ad.first.click()
        saw_off = wait_for(page, "Platform.audioOff || Platform.paused", 6)
        done = wait_for(page, "!document.querySelector('.blocker')", 30)
        t1 = page.evaluate("G.Save.data.turboLeft")
        check('SDK: rewarded ad pauses the game while showing', saw_off)
        check('SDK: rewarded ad (local) grants Turbo +5 min', done and t1 >= t0 + 290, (t0, t1))
    else:
        check('SDK: rewarded button present', False)
    shot(page, 'sdk-local-after-ad')
    close_modals(page)
    page.evaluate("G.Save.data.cartTimer = 9999")

    # progress safety
    page.evaluate("G.UI.closeAll(); G.Save.data.planet = 4; G.Save.data.depth = 777; G.Save.save()")
    page.wait_for_timeout(1500)
    page.reload()
    page.wait_for_selector('#loader', state='detached', timeout=15000)
    r = page.evaluate("[G.Save.data.planet, Math.round(G.Save.data.depth)]")
    check('Save: progress survives a reload with the Data module', r == [4, 777], r)
    page.evaluate("G.Save.data.planet = 5; G.Save.save()")
    page.wait_for_timeout(1500)
    page.evaluate("localStorage.removeItem('SDK_DATA_local')")
    page.reload()
    page.wait_for_selector('#loader', state='detached', timeout=15000)
    r = page.evaluate("G.Save.data.planet")
    check('Save: Data module empty -> restored from the device mirror', r == 5, r)
    page.evaluate("G.Save.data.planet = 6; G.Save.save()")
    page.wait_for_timeout(500)
    page.route('**/crazygames-sdk-v3.js', lambda rr: rr.abort())
    page.reload()
    page.wait_for_selector('#loader', state='detached', timeout=15000)
    r = page.evaluate("[G.Save.data.planet, Platform.info.sdk]")
    check('Save: SDK blocked -> same progress, not a fresh game', r == [6, False], r)
    page.unroute('**/crazygames-sdk-v3.js')
    errors[:] = [e for e in errors if 'ERR_FAILED' not in e]
    check('SDK: no console errors', not errors, errors[:5])
    ctx.close()


def balance():
    out = subprocess.run(['node', os.path.join(ROOT, 'tools', 'balance-sim.js')], capture_output=True, text=True).stdout
    times = [float(x) for x in re.findall(r'planet \d \(shards \d+\): ([\d.]+) h', out)]
    expected = [6.1, 3.2, 3.9, 1.8, 5.6, 3.2, 15.0, 1.1, 0.7, 0.5, 0.4, 0.4, 0.6, 0.6]
    bad = [(i, a, b) for i, (a, b) in enumerate(zip(times, expected)) if abs(a - b) / b > 0.3]
    check('AT10: balance-sim matches README §8 within 30%', len(times) == 14 and not bad, bad or times)


with sync_playwright() as p:
    b = p.chromium.launch(args=GPU_ARGS)
    only = os.environ.get('ONLY', '')
    if not only or only == 'acc':
        acceptance(b)
        balance()
    if not only or only == 'view':
        run_viewport(b, 390, 844, True, 'portrait')
        run_viewport(b, 1280, 720, False, 'landscape')
        run_viewport(b, 821, 462, False, 'cg-small')
        run_viewport(b, 800, 450, True, 'mobile-land')
    if not only or only == 'sdk':
        sdk_smoke(b)
    b.close()

ok = sum(1 for r in results if r[1])
print(f'\n{ok}/{len(results)} passed')
with open(os.path.join(SHOTS, 'autotest-results.json'), 'w', encoding='utf-8') as f:
    json.dump([{'name': n, 'ok': o, 'info': i} for n, o, i in results], f, ensure_ascii=False, indent=1)
