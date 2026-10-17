(() => {
  const G = window.G;
  const S = () => G.Save.data;
  const PPM = 4;           // scene pixels per meter
  const TILE = 8;
  const PH = 9;            // plate thickness

  let cv, ctx, W = 0, H = 0, dpr = 1;
  let buf, bx;             // low-res scene buffer
  let BW = 1, BH = 1, PX = 3;
  const R = { x: 0, y: 0, w: 1, h: 1 };
  const L = { cx: 0, cy: 0, tipY: 0, s: 60, k: 1, cart: null };
  let sceneEl = null;
  let time = 0, shakeT = 0, shakeAmp = 0, tipFlash = 0, whiteFlash = 0;
  let anim = null, bgPattern = null;
  let bcx = 0, drillX = 0, drillTop = 0, tipB = 0;
  let headPhase = 0;
  const tmpDrill = document.createElement('canvas');

  // ---------- helpers ----------
  function hash(n) {
    n = (n | 0) ^ 0x9e3779b9;
    n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
    n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
    return (n ^ (n >>> 16)) >>> 0;
  }
  const frac = n => (hash(n) % 10000) / 10000;
  function shade(hex, amt) {
    const [r, g, b] = G.hexToRgb(hex);
    const f = v => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function rect(x, y, w, h, col) { bx.fillStyle = col; bx.fillRect(Math.round(x), Math.round(y), w, h); }
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function pixCircle(x0, y0, r, col) {
    bx.fillStyle = col;
    const rr = r * r;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, rr - dy * dy)));
      bx.fillRect(Math.round(x0 - w), Math.round(y0 + dy), w * 2 + 1, 1);
    }
  }

  // ---------- setup ----------
  function init(canvas, scene) {
    cv = canvas; ctx = cv.getContext('2d');
    buf = document.createElement('canvas');
    bx = buf.getContext('2d');
    setScene(scene);
    resize();
    addEventListener('resize', resize);
    addEventListener('orientationchange', () => setTimeout(resize, 120));
  }
  let ro = null;
  function setScene(el) {
    sceneEl = el;
    if (window.ResizeObserver) {
      if (ro) ro.disconnect();
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    measure();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    measure();
  }

  function measure() {
    if (!sceneEl || !ctx) return;
    const r = sceneEl.getBoundingClientRect();
    R.x = Math.round(r.left); R.y = Math.round(r.top); R.w = Math.max(1, Math.round(r.width)); R.h = Math.max(1, Math.round(r.height));
    PX = Math.max(2, Math.round(R.h / 150));
    if (R.w / PX < 96) PX = Math.max(2, Math.floor(R.w / 96));
    BW = Math.ceil(R.w / PX); BH = Math.ceil(R.h / PX);
    buf.width = BW; buf.height = BH;
    bcx = Math.floor(BW / 2);
    drillX = bcx - 10;
    drillTop = Math.round(BH * 0.4 - G.Pix.DRILL.H / 2);
    tipB = drillTop + G.Pix.DRILL.H - 1;
    L.k = Math.max(1, Math.min(1.8, R.w / 620, R.h / 540));
    L.cx = R.x + (bcx) * PX;
    L.tipY = R.y + tipB * PX;
    L.cy = R.y + (drillTop + G.Pix.DRILL.H / 2) * PX;
    L.s = G.Pix.DRILL.W * PX;
    makeBg();
  }

  function makeBg() {
    const n = 24, t = document.createElement('canvas');
    t.width = t.height = n * PX;
    const c = t.getContext('2d');
    c.fillStyle = '#1B1620'; c.fillRect(0, 0, t.width, t.height);
    const r = rng(77);
    for (let k = 0; k < 70; k++) {
      c.fillStyle = r() < 0.5 ? '#231C29' : '#150F19';
      const x = Math.floor(r() * n), y = Math.floor(r() * n), w = 1 + Math.floor(r() * 3);
      c.fillRect(x * PX, y * PX, w * PX, PX);
    }
    bgPattern = ctx.createPattern(t, 'repeat');
  }

  // ---------- tiles ----------
  const tileCache = new Map();
  function tile(p, i, v) {
    const pl = G.planet(p);
    const key = pl.base + '|' + pl.shift + '|' + i + '|' + v;
    let t = tileCache.get(key);
    if (t) return t;
    t = document.createElement('canvas');
    t.width = t.height = TILE;
    const c = t.getContext('2d');
    const base = pl.layers[i], ore = pl.ores[i];
    const r = rng(hash(i * 131 + v * 7 + pl.base * 1009 + pl.shift));
    c.fillStyle = base; c.fillRect(0, 0, TILE, TILE);
    const lt = shade(base, 0.12), lt2 = shade(base, 0.24), dk = shade(base, -0.16), dk2 = shade(base, -0.3);
    const P = (x, y, col) => { c.fillStyle = col; c.fillRect(x & 7, y & 7, 1, 1); };
    // base grain: clumps instead of single-pixel noise
    for (let k = 0; k < 7; k++) {
      const x = Math.floor(r() * 8), y = Math.floor(r() * 8), q = r();
      const col = q < 0.35 ? lt : q < 0.8 ? dk : dk2;
      P(x, y, col);
      if (r() < 0.5) P(x + 1, y, col);
      if (r() < 0.3) P(x, y + 1, col);
    }
    // layer character
    switch (i) {
      case 0: // soil: crumbs and tiny roots
        for (let k = 0; k < 3; k++) P(Math.floor(r() * 8), Math.floor(r() * 8), r() < 0.5 ? '#3A2414' : lt2);
        if (v % 4 === 0) { const y = Math.floor(r() * 6); for (let x = 0; x < 4; x++) P(x + 2, y + (x >> 1), '#5A3A1E'); }
        break;
      case 1: // clay: horizontal streaks
        for (let k = 0; k < 2; k++) { const y = Math.floor(r() * 8), x0 = Math.floor(r() * 4), len = 3 + Math.floor(r() * 4); for (let x = 0; x < len; x++) P(x0 + x, y, k ? lt2 : lt); }
        break;
      case 2: // stone: cracks and block seams
        if (v % 3 === 0) { let x = Math.floor(r() * 3), y = 0; for (let q = 0; q < 6; q++) { P(x, y, dk2); x += r() < 0.6 ? 1 : 0; y++; } }
        if (v % 4 === 1) { for (let x = 0; x < 8; x++) P(x, 7, dk); }
        break;
      case 3: // granite: black, pink and white speckles
        for (let k = 0; k < 6; k++) P(Math.floor(r() * 8), Math.floor(r() * 8), ['#1E1C22', '#D9A3A8', '#F2EEF4'][k % 3]);
        break;
      case 4: // basalt: columns
        if (v < 6) { P(0, 0, dk2); for (let y = 0; y < 8; y++) { P(0, y, dk2); P(1, y, y % 3 ? base : lt); } }
        if (v % 2) for (let y = 0; y < 8; y++) if (y % 4 === 2) P(4, y, dk);
        break;
      case 5: // quartz: diagonal shine facets
        if (v % 2 === 0) for (let k = 0; k < 5; k++) P(k + 2, 6 - k, k === 2 ? '#FFFFFF' : lt2);
        break;
      case 6: // gems: sparkles
        for (let k = 0; k < 2; k++) P(Math.floor(r() * 8), Math.floor(r() * 8), ore[Math.floor(r() * 3)]);
        break;
      case 7: // mantle: glowing magma veins
        if (v % 2 === 0) { let y = Math.floor(r() * 6); for (let x = 0; x < 8; x++) { P(x, y, '#FF7A1A'); if (x % 3 === 1) P(x, y + 1, '#FFD447'); y += r() < 0.3 ? 1 : r() < 0.3 ? -1 : 0; y = Math.max(0, Math.min(6, y)); } }
        break;
      case 8: // outer core: liquid swirls
        for (let k = 0; k < 4; k++) P(k * 2 + (v % 2), 3 + Math.round(Math.sin(k + v) * 2), lt2);
        break;
      case 9: // core: bright crystals
        if (v % 3 === 0) { const x = 2 + Math.floor(r() * 4), y = 2 + Math.floor(r() * 3); P(x, y, '#FFFFFF'); P(x, y + 1, '#FFF2A8'); P(x, y + 2, '#FFF2A8'); P(x - 1, y + 2, lt2); }
        break;
    }
    if (v === 9) {
      const x = 1 + Math.floor(r() * 4), y = 1 + Math.floor(r() * 4);
      c.fillStyle = dk2; c.fillRect(x, y, 3, 2); c.fillRect(x + 1, y + 2, 2, 1);
      c.fillStyle = lt; c.fillRect(x, y, 1, 1);
    } else if (v >= 6) {
      const n = v === 8 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const x = 1 + Math.floor(r() * 5), y = 1 + Math.floor(r() * 5);
        c.fillStyle = ore[2]; c.fillRect(x, y, 2, 2); c.fillRect(x + 1, y + 1, 2, 1);
        c.fillStyle = ore[0]; c.fillRect(x, y, 2, 1); c.fillRect(x, y, 1, 2);
        c.fillStyle = ore[1]; c.fillRect(x, y, 1, 1);
      }
    }
    tileCache.set(key, t);
    return t;
  }

  // ---------- decor: bigger details placed over the tiles ----------
  const DECOR = [
    ['pebble', 'pebble', 'root', 'root', 'boulder', 'bone'],
    ['pebble', 'vein', 'vein', 'boulder', 'pebble'],
    ['boulder', 'vein', 'pebble', 'fossil', 'vein'],
    ['vein', 'boulder', 'crystal', 'pebble'],
    ['boulder', 'vein', 'crystal', 'boulder'],
    ['crystal', 'vein', 'crystal', 'pebble'],
    ['crystal', 'crystal', 'vein', 'crystal'],
    ['lava', 'vein', 'lava', 'boulder'],
    ['lava', 'blob', 'blob', 'vein'],
    ['crystal', 'crystal', 'lava', 'crystal'],
  ];
  const decorCache = new Map();
  function decor(type, p, i, v) {
    const pl = G.planet(p);
    const key = type + '|' + pl.base + '|' + pl.shift + '|' + i + '|' + (v % 3);
    let t = decorCache.get(key);
    if (t) return t;
    t = document.createElement('canvas');
    const c = t.getContext('2d');
    const base = pl.layers[i], ore = pl.ores[i];
    const P = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const stone = G.mixColor(base, '#9A96A6', 0.45);
    const ol = shade(base, -0.5);
    const r = rng(hash(i * 977 + v * 13 + 5));
    switch (type) {
      case 'pebble': {
        t.width = 6; t.height = 5;
        P(1, 0, ol, 4, 1); P(0, 1, ol, 1, 3); P(5, 1, ol, 1, 3); P(1, 4, ol, 4, 1);
        P(1, 1, stone, 4, 3); P(1, 1, shade(stone, 0.35), 2, 1); P(1, 2, shade(stone, 0.2), 1, 1); P(3, 3, shade(stone, -0.25), 2, 1);
        break;
      }
      case 'boulder': {
        t.width = 10; t.height = 8;
        P(2, 0, ol, 6, 1); P(1, 1, ol, 1, 1); P(8, 1, ol, 1, 1); P(0, 2, ol, 1, 4); P(9, 2, ol, 1, 4); P(1, 6, ol, 1, 1); P(8, 6, ol, 1, 1); P(2, 7, ol, 6, 1);
        P(2, 1, stone, 6, 6); P(1, 2, stone, 8, 4);
        P(2, 1, shade(stone, 0.35), 3, 1); P(1, 2, shade(stone, 0.25), 1, 2);
        P(5, 5, shade(stone, -0.3), 4, 1); P(7, 3, shade(stone, -0.3), 1, 2);
        P(4, 2, shade(stone, -0.4), 1, 1); P(5, 3, shade(stone, -0.4), 1, 1);
        break;
      }
      case 'root': {
        t.width = 14; t.height = 6;
        let y = 2 + Math.floor(r() * 2);
        for (let x = 0; x < 14; x++) {
          P(x, y, x > 11 ? '#7A5230' : '#3E2614');
          if (r() < 0.3) y = Math.max(0, Math.min(5, y + (r() < 0.5 ? -1 : 1)));
          if (x === 6) { P(x + 1, y + 1, '#3E2614'); P(x + 2, Math.min(5, y + 2), '#3E2614'); }
        }
        break;
      }
      case 'bone': {
        t.width = 8; t.height = 4;
        P(0, 0, '#E8DCC4', 2, 2); P(0, 2, '#E8DCC4', 2, 2); P(6, 0, '#E8DCC4', 2, 2); P(6, 2, '#E8DCC4', 2, 2);
        P(1, 1, '#F6EEDD', 6, 2); P(1, 2, '#BFAE8E', 6, 1);
        break;
      }
      case 'fossil': {
        t.width = 7; t.height = 7;
        const sh = ['..ooo..', '.otttO.', 'otTTTto', 'otToTto', 'otTTOto', '.otttO.', '..ooo..'];
        const pal = { o: shade(base, -0.45), t: '#D8C8A8', T: '#A08868', O: '#8A7050' };
        sh.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) P(x, y, pal[ch]); }));
        break;
      }
      case 'vein': {
        t.width = 12; t.height = 7;
        let y = 1 + Math.floor(r() * 3);
        for (let x = 0; x < 12; x++) {
          P(x, y + 1, ore[2]); P(x, y, ore[0]);
          if (x % 3 === 0) { P(x, y - 1 < 0 ? 0 : y - 1, ore[0]); P(x, y, ore[1]); }
          if (r() < 0.35) y = Math.max(1, Math.min(4, y + (r() < 0.5 ? -1 : 1)));
        }
        break;
      }
      case 'crystal': {
        t.width = 8; t.height = 9;
        const spikes = [[1, 4, 0], [3, 0, 1], [5, 3, 2]];
        for (const [x, top, k] of spikes) {
          const col = ore[k % 3];
          P(x, top + 1, shade(col, -0.45), 1, 9 - top - 1); P(x + 2, top + 1, shade(col, -0.45), 1, 9 - top - 1);
          P(x + 1, top, shade(col, -0.45), 1, 1);
          P(x + 1, top + 1, col, 1, 8 - top); P(x + 1, top + 1, '#FFFFFF', 1, 1);
        }
        P(0, 8, ol, 8, 1);
        break;
      }
      case 'lava': {
        t.width = 8; t.height = 6;
        P(1, 0, '#3A1008', 6, 1); P(0, 1, '#3A1008', 8, 4); P(1, 5, '#3A1008', 6, 1);
        P(1, 1, '#E8461A', 6, 4); P(2, 2, '#FF9A2A', 4, 2); P(3, 2, '#FFE27A', 2, 1);
        break;
      }
      case 'blob': {
        t.width = 8; t.height = 6;
        P(1, 0, shade(base, -0.4), 6, 1); P(0, 1, shade(base, -0.4), 8, 4); P(1, 5, shade(base, -0.4), 6, 1);
        P(1, 1, '#D8D8E0', 6, 4); P(1, 1, '#FFFFFF', 3, 1); P(4, 3, '#9A9AA6', 3, 1);
        break;
      }
    }
    decorCache.set(key, t);
    return t;
  }

  // ---------- particles / popups ----------
  const NP = 220;
  const parts = Array.from({ length: NP }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, color: '#fff', g: 0, kind: 0 }));
  let pi = 0;
  function spawn(x, y, vx, vy, life, size, color, g, kind = 0) {
    const p = parts[pi]; pi = (pi + 1) % NP;
    p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size; p.color = color; p.g = g; p.kind = kind;
  }
  const pops = Array.from({ length: 30 }, () => ({ on: false, x: 0, y: 0, text: '', color: '#fff', life: 0, scale: 2, icon: null }));
  let popi = 0;
  function pop(x, y, text, color, big, icon) {
    // nudge the number away from popups that are still near the start of their flight
    x += (Math.random() - 0.5) * 30;
    for (let tries = 0; tries < 6; tries++) {
      const hit = pops.some(q => q.on && q.life > 0.55 && Math.abs(q.x - x) < 70 && Math.abs(q.y - y) < 18);
      if (!hit) break;
      y -= 20;
    }
    const p = pops[popi]; popi = (popi + 1) % pops.length;
    p.on = true; p.x = x; p.y = y; p.text = text; p.color = color; p.life = 1; p.icon = icon || null;
    p.scale = Math.max(2, Math.round(PX * 0.8 * (big ? 1.5 : 1)));
  }
  function popB(bxp, byp, text, color, big, icon) { pop(R.x + bxp * PX, R.y + byp * PX, text, color, big, icon); }
  function shake(amp) { if (!S().settings.shake) return; shakeAmp = Math.max(shakeAmp, amp); shakeT = 0.3; }
  function skinId() { return S().skins.active; }
  function layerColor(i) { return G.planet(S().planet).layers[i]; }

  function tapFx(x, y, coins, dmg, crit) {
    tipFlash = 1;
    const sc = G.Pix.sparkColor(skinId());
    for (let k = 0; k < (crit ? 16 : 7); k++) {
      const a = Math.PI + Math.random() * Math.PI;
      const sp = 50 + Math.random() * 70;
      spawn(bcx, tipB, Math.cos(a) * sp, Math.sin(a) * sp, 0.3 + Math.random() * 0.25, 1, crit ? '#FF5A1E' : sc, 150);
    }
    const tx = Math.max(R.x + 30, Math.min(R.x + R.w - 50, x == null ? L.cx : x));
    const ty = Math.max(R.y + 30, Math.min(R.y + R.h - 20, (y == null ? L.tipY : y) - 16));
    if (crit) pop(tx, ty - 14 * Math.max(2, Math.round(PX * 0.8 * 1.5)) / 2 - 8, 'CRIT!', '#FF6A2A', true);
    pop(tx, ty, '+' + G.fmt(coins, true), crit ? '#FFB347' : '#FFD447', crit);
    flyTo('coins', tx, ty, crit ? 4 : 1);
    hideSplash();
    if (dmg > 0) popB(bcx + (Math.random() - 0.5) * 16, tipB - 4, '-' + G.fmt(dmg, true), '#FFFFFF', false);
    shake(crit ? 3 : 1);
  }

  function plateBroken(ni, gems) {
    const col = layerColor(ni);
    for (let k = 0; k < 50; k++) {
      spawn(Math.random() * BW, tipB + Math.random() * PH, (Math.random() - 0.5) * 140, -40 - Math.random() * 120, 0.8 + Math.random() * 0.6, 1 + (k % 3 === 0 ? 1 : 0), k % 3 ? col : '#8A8A96', 260, 1);
    }
    if (gems) { popB(bcx, tipB - 18, '+' + gems, '#8FE8FF', true, 'gem'); flyTo('gems', L.cx, L.tipY, Math.min(6, gems + 1)); }
    shake(5);
  }

  function boom(onDone) { anim = { type: 'boom', t: 0, from: S().planet - 1, onDone }; whiteFlash = 0; nodes.length = 0; }
  const busy = () => !!anim;

  // ---------- treasure nodes ----------
  const nodes = [];
  let nodeTimer = 4;
  function spawnNode() {
    const rt = G.Game.rt;
    const roll = G.Game.rollNode();
    const left = Math.random() < 0.5;
    const minX = 6, maxX = BW - 18;
    const x = left ? minX + Math.random() * Math.max(4, bcx - 22 - minX) : bcx + 14 + Math.random() * Math.max(4, maxX - bcx - 14);
    let y = tipB + 14 + Math.random() * Math.max(6, BH - tipB - 34);
    if (!rt.moving) y = 20 + Math.random() * (BH - 40);
    if (S().plate && y > tipB - 12 && y < tipB + PH + 2) y = tipB + PH + 6;
    nodes.push({ type: roll.type, relic: roll.relic, x: Math.round(x), wy: rt.camB + (y - tipB), life: 11, t: 0 });
    if (nodes.length > 4) nodes.shift();
  }
  function nodeScreenY(n) { return tipB + (n.wy - G.Game.rt.camB); }
  function hitNode(x, y) {
    for (let k = nodes.length - 1; k >= 0; k--) {
      const n = nodes[k];
      const cx = R.x + (n.x + 5) * PX, cy = R.y + (nodeScreenY(n) + 5) * PX;
      const rad = Math.max(26, 8 * PX);
      if (Math.abs(x - cx) <= rad && Math.abs(y - cy) <= rad) return n;
    }
    return null;
  }
  const NODE_COL = { nugget: ['#FFD447', '#FFF2A8'], gem: ['#4FD1F0', '#B9F3FF'], chest: ['#B07A45', '#FFD447'], tnt: ['#FF6A1E', '#FFD447'], heat: ['#FF5A1E', '#FFE27A'], relic: ['#C59BFF', '#FFFFFF'] };
  function collect(n) {
    const i = nodes.indexOf(n);
    if (i < 0) return false;
    nodes.splice(i, 1);
    const out = G.Game.collectNode(n);
    const x = n.x + 5, y = nodeScreenY(n) + 5;
    const [c1, c2] = NODE_COL[n.type];
    for (let k = 0; k < (out.boom ? 40 : 18); k++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * (out.boom ? 140 : 70);
      spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, 0.5 + Math.random() * 0.4, k % 4 ? 1 : 2, k % 2 ? c1 : c2, 120, 1);
    }
    if (out.boom) { shake(7); popB(x, y - 8, 'BOOM!', '#FF6A1E', true); G.Audio.sfx('boomSmall'); }
    else G.Audio.sfx(out.relic != null ? 'reward' : 'node');
    if (out.coins) { popB(x, y, '+' + G.fmt(out.coins, true), '#FFD447', false); flyTo('coins', R.x + x * PX, R.y + y * PX, 6); }
    if (out.gems) { popB(x, y - 10, '+' + out.gems, '#8FE8FF', true, 'gem'); flyTo('gems', R.x + x * PX, R.y + y * PX, out.gems + 2); }
    if (out.heat) popB(x, y - 8, 'HEAT!', '#FF8A3A', true);
    if (out.relic != null) { popB(x, y - 8, 'RELIC!', '#E0C8FF', true); G.UI?.relicFound(out.relic); }
    return true;
  }

  // ---------- sky ----------
  function drawSky(p, y1) {
    const pl = G.planet(p);
    const top = 0, h = y1 - top;
    if (h <= 0) return;
    const gtop = y1 - Math.max(h, BH * 0.6);
    const bands = [['#4FA8F0', '#CFEFFF'], ['#C9776A', '#F6CDB0'], ['#03040C', '#1A2244'], ['#2A0606', '#B5341C'], ['#070A24', '#2A1650']][pl.base];
    const N = 7;
    const bh = (y1 - gtop) / N;
    for (let k = 0; k < N; k++) {
      const col = G.mixColor(bands[0], bands[1], k / (N - 1));
      const ya = Math.floor(gtop + k * bh), yb = Math.floor(gtop + (k + 1) * bh);
      rect(0, ya, BW, yb - ya + 1, col);
      if (k < N - 1) {
        const nxt = G.mixColor(bands[0], bands[1], (k + 1) / (N - 1));
        bx.fillStyle = nxt;
        for (let x = (yb & 1); x < BW; x += 2) bx.fillRect(x, yb - 1, 1, 1);
      }
    }
    if (gtop > 0) rect(0, 0, BW, Math.ceil(gtop) + 1, bands[0]);
    const T = time;
    if (pl.base === 0) {
      pixCircle(BW * 0.8, gtop + BH * 0.12, 7, '#FFF2B0');
      pixCircle(BW * 0.8, gtop + BH * 0.12, 5, '#FFFFFF');
      for (let q = 0; q < 4; q++) cloud(((q * 0.31 + T * 0.006 * (1 + q * 0.3)) % 1.3 - 0.15) * BW, gtop + BH * (0.08 + 0.08 * q), 0.8 + (q % 2) * 0.4);
      hills(y1, '#5CA35A', '#4A8A48', 9, 6, 0.05);
    } else if (pl.base === 1) {
      pixCircle(BW * 0.22, gtop + BH * 0.13, 5, '#FFF0DC');
      hills(y1, '#B9604A', '#9A4A38', 10, 8, 0.03);
      bx.fillStyle = 'rgba(255,220,190,0.25)';
      for (let q = 0; q < 3; q++) bx.fillRect(0, Math.round(y1 - 16 - q * 9 + Math.sin(T * 0.5 + q) * 2), BW, 2);
    } else if (pl.base === 2) {
      for (let q = 0; q < 50; q++) {
        if (Math.sin(T * 2 + q) < -0.6) continue;
        rect(frac(q * 5 + 1) * BW, gtop + frac(q * 5 + 2) * (y1 - gtop), 1, 1, q % 5 ? '#FFFFFF' : '#9AD8FF');
      }
      const gx = BW * 0.74, gy = gtop + BH * 0.18, gr = Math.round(Math.min(BW, BH) * 0.14);
      const cols = ['#E8B27A', '#D88A5A', '#F2D3A0', '#C97A4A', '#EBC28E', '#B86A44'];
      for (let dy = -gr; dy <= gr; dy++) {
        const w = Math.floor(Math.sqrt(gr * gr - dy * dy));
        bx.fillStyle = cols[Math.floor((dy + gr) / (gr * 2 + 1) * cols.length)];
        bx.fillRect(Math.round(gx - w), Math.round(gy + dy), w * 2 + 1, 1);
        bx.fillStyle = 'rgba(0,0,30,0.35)';
        bx.fillRect(Math.round(gx + w * 0.3), Math.round(gy + dy), Math.ceil(w * 0.7) + 1, 1);
      }
      bx.fillStyle = '#F0D2AA';
      for (let a = 0; a < 80; a++) {
        const t = a / 80 * Math.PI * 2;
        const x = gx + Math.cos(t) * gr * 1.7, y = gy + Math.sin(t) * gr * 0.35 - Math.cos(t) * gr * 0.3;
        if (Math.sin(t) < 0 && Math.hypot(x - gx, y - gy) < gr) continue;
        bx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      hills(y1, '#DDEFFF', '#B8D8F0', 5, 4, 0.08);
    } else if (pl.base === 3) {
      const vx = BW * 0.28, vy = y1 - 2;
      bx.fillStyle = '#1A1012';
      for (let k = 0; k < BH * 0.22; k++) {
        const w = Math.round(6 + k * 1.4);
        bx.fillRect(Math.round(vx - w), Math.round(vy - BH * 0.22 + k), w * 2, 1);
      }
      for (let q = 0; q < 12; q++) {
        const ph = (T * 0.6 + frac(q)) % 1;
        rect(vx + (frac(q * 3) - 0.5) * 40 * ph, vy - BH * 0.22 - Math.sin(ph * Math.PI) * BH * 0.16, 2, 2, ph < 0.5 ? '#FFD447' : '#FF6A1E');
      }
      rect(vx - 4, vy - BH * 0.22 - 1, 8, 2, '#FF6A1E');
    } else {
      for (let q = 0; q < 36; q++) rect(frac(q * 9 + 4) * BW, gtop + frac(q * 9 + 5) * (y1 - gtop) * 0.8, 1, 1, '#FFFFFF');
      const colsA = ['#5AFFB4', '#AA6EFF', '#5AC8FF'];
      for (let b = 0; b < 3; b++) {
        bx.fillStyle = colsA[b];
        bx.globalAlpha = 0.35;
        for (let x = 0; x < BW; x++) {
          const y = gtop + BH * (0.1 + b * 0.06) + Math.round(Math.sin(x * 0.05 + T * (0.6 + b * 0.2) + b) * 4);
          bx.fillRect(x, Math.round(y), 1, 4 - b);
        }
        bx.globalAlpha = 1;
      }
      for (let q = 0; q < 9; q++) {
        const x = Math.round(frac(q * 4 + 2) * BW), hh = 5 + Math.round(frac(q * 4 + 3) * 10);
        for (let k = 0; k < hh; k++) {
          const w = Math.max(1, Math.round((k / hh) * 3));
          rect(x - w, y1 - hh + k, w * 2 + 1, 1, q % 2 ? '#7FFFE0' : '#C59BFF');
        }
        rect(x, y1 - hh, 1, hh, '#FFFFFF');
      }
    }
  }
  function cloud(x, y, s) {
    const parts2 = [[0, 2, 14, 4], [3, 0, 7, 3], [8, -1, 6, 4], [-2, 4, 18, 2]];
    for (const [dx, dy, w, h] of parts2) rect(x + dx * s, y + dy * s, Math.round(w * s), Math.round(h * s), '#FFFFFF');
    rect(x - 2 * s, y + 5 * s, Math.round(18 * s), 1, '#D8ECF8');
  }
  function hills(y1, c1, c2, amp1, amp2, f) {
    for (let x = 0; x < BW; x++) {
      const h1 = Math.round(amp1 + amp1 * 0.7 * Math.sin(x * f + 1) + 2 * Math.sin(x * 0.21));
      rect(x, y1 - h1, 1, h1, c1);
      const h2 = Math.round(amp2 * 0.6 + amp2 * 0.5 * Math.sin(x * f * 1.7 + 3));
      rect(x, y1 - h2, 1, h2, c2);
    }
  }

  // ---------- world ----------
  function drawWorld(dt) {
    const s = S();
    const look = G.Pix.look(s.lv);
    drillTop = tipB - G.Pix.DRILL.BODY_H - G.Pix.headLen(look);
    const d = s.depth, p = s.planet;
    const pl = G.planet(p);
    const rt = G.Game.rt;
    const cam = d < 40 ? d * PPM : rt.camB;
    const surfY = tipB - d * PPM;

    // terrain tiles
    const r0 = Math.floor((cam - tipB) / TILE) - 1, r1 = Math.floor((cam + BH - tipB) / TILE) + 1;
    const cols = Math.ceil(BW / TILE) + 1;
    for (let r = r0; r <= r1; r++) {
      const y = tipB + r * TILE - cam;
      if (y + TILE < surfY) continue;
      for (let c = 0; c < cols; c++) {
        const jitter = ((hash(c * 31 + r) % 3) - 1) * 0.6;
        const dd = d + (y + TILE / 2 - tipB) / PPM + jitter;
        if (dd < 0) continue;
        const li = G.layerAt(dd);
        const v = hash(r * 977 + c * 131) % 10;
        bx.drawImage(tile(p, li, v), c * TILE, y);
        const ddUp = dd - TILE / PPM;
        if (ddUp >= 0 && G.layerAt(ddUp) !== li) {
          rect(c * TILE, y, TILE, 1, shade(pl.layers[li], -0.45));
          rect(c * TILE, y + 1, TILE, 1, shade(pl.layers[li], 0.2));
        }
      }
    }

    // decor over the tiles
    const CELL = 24;
    const q0 = Math.floor((cam - tipB) / CELL) - 1, q1 = Math.floor((cam + BH - tipB) / CELL) + 1;
    for (let q = q0; q <= q1; q++) {
      for (let c = 0; c <= Math.ceil(BW / CELL); c++) {
        const h = hash(q * 7349 + c * 31 + 17);
        if (h % 100 >= 55) continue;
        const x = c * CELL + ((h >>> 8) % 14), y = tipB + q * CELL - cam + ((h >>> 12) % 14);
        const dd = d + (y + 4 - tipB) / PPM;
        if (dd < 1) continue;
        const dli = G.layerAt(dd);
        const list = DECOR[dli];
        const spr = decor(list[(h >>> 16) % list.length], p, dli, h >>> 20);
        if (G.layerAt(d + (y + spr.height - tipB) / PPM) !== dli) continue;
        bx.drawImage(spr, x, Math.round(y));
      }
    }
    // soft darkening toward the scene edges
    for (let k = 0; k < 4; k++) {
      bx.globalAlpha = 0.1;
      rect(0, 0, 4 - k, BH, '#000'); rect(BW - 4 + k, 0, 4 - k, BH, '#000');
    }
    bx.globalAlpha = 1;

    // ambience
    const li = G.layerAt(Math.min(G.CORE, d + 0.5));
    if (Math.random() < dt * 6) {
      if (li >= 7 && li <= 8) spawn(Math.random() * BW, -2, 0, 20, 2.5, 1, li === 7 ? '#FF7A1A' : '#FFB347', 60, 1);
      else if (li === 9) spawn(Math.random() * BW, BH + 2, (Math.random() - 0.5) * 6, -25, 3, 1, '#FFF2A8', -2, 1);
      else if (li >= 3) spawn(Math.random() * BW, tipB + Math.random() * (BH - tipB), 0, 0, 0.6, 1, '#FFFFFF', 0, 2);
      else spawn(bcx + (Math.random() - 0.5) * 18, drillTop - Math.random() * 40, 0, 8, 1.6, 1, '#B89A7A', 10, 1);
    }

    // golden vein glints
    const vein = G.Retention.vein();
    {
      const ya = Math.max(0, tipB + (G.DEPTHS[vein] - d) * PPM), yb = Math.min(BH, tipB + (G.DEPTHS[vein + 1] - d) * PPM);
      if (yb > ya) for (let q = 0; q < 10; q++) {
        const tw = Math.sin(time * 3 + q * 1.7);
        if (tw < 0.3) continue;
        const gx = Math.round(frac(q * 17 + Math.floor(time / 2.1)) * BW), gy = Math.round(ya + frac(q * 13 + Math.floor(time / 2.1)) * (yb - ya));
        rect(gx, gy - 1, 1, 3, '#FFE27A'); rect(gx - 1, gy, 3, 1, '#FFE27A');
        if (tw > 0.8) rect(gx, gy, 1, 1, '#FFFFFF');
      }
    }

    // core glow
    if (d > 8000) {
      const cy = tipB + (G.CORE - d) * PPM;
      const pul = Math.sin(time * 4);
      const rings = [['#FFC93C', 0.18, 1.0], ['#FFE070', 0.22, 0.72], ['#FFF6C8', 0.3, 0.46], ['#FFFFFF', 0.55, 0.24]];
      for (const [col, a, f] of rings) {
        bx.globalAlpha = a;
        pixCircle(bcx, cy, Math.round(Math.max(BW, BH) * 0.55 * f + pul * 2), col);
      }
      bx.globalAlpha = 1;
    }

    // sky (painted over the area above the surface)
    if (surfY > 0) {
      drawSky(p, Math.round(surfY));
      const gcol = ['#4CAF50', '#C0603E', '#F2FAFF', '#2A2026', '#9E7FE0'][pl.base];
      rect(0, surfY, BW, 2, gcol);
      if (pl.base === 0) for (let x = 0; x < BW; x += 2) if (hash(x) % 3) rect(x, surfY - 1 - (hash(x * 3) % 2), 1, 2, '#3E9443');
      if (pl.base === 3) for (let x = 0; x < BW; x += 9) rect(x + (hash(x) % 5), surfY + 1, 3, 1, '#FF5A1E');
    }

    // shaft above the drill
    const sw = 22, sx0 = bcx - 11;
    const sy0 = Math.max(0, Math.ceil(surfY + 2)), sy1 = drillTop + 6;
    light.surfY = surfY;
    light.lamps.length = 0;
    if (sy1 > sy0) {
      rect(sx0, sy0, sw, sy1 - sy0, '#140C12');
      rect(sx0 - 1, sy0, 1, sy1 - sy0, '#0A060A');
      rect(sx0 + sw, sy0, 1, sy1 - sy0, '#0A060A');
      rect(sx0 + 1, sy0, 1, sy1 - sy0, '#22161E');
      const step = 26;
      const base0 = ((tipB - cam) % step + step) % step;
      for (let y = base0 - step; y < sy1; y += step) {
        if (y < sy0 - 2) continue;
        rect(sx0, y, sw, 2, '#6E4520');
        rect(sx0, y, sw, 1, '#8E5E30');
        rect(sx0 + 1, y + 2, 2, 5, '#5A3818');
        rect(sx0 + sw - 3, y + 2, 2, 5, '#5A3818');
        if ((Math.floor((y - base0) / step) & 1) === 0 && y + 6 < sy1) {
          rect(sx0 + 4, y + 2, 1, 2, '#3A3A3A');
          rect(sx0 + 3, y + 4, 3, 2, '#FFD447');
          bx.globalAlpha = 0.18 + 0.05 * Math.sin(time * 8 + y);
          pixCircle(sx0 + 4, y + 5, 5, '#FFD447');
          bx.globalAlpha = 1;
          light.lamps.push(y + 5);
        }
      }
    }
    if (surfY > 0) drawStation(Math.round(surfY));

    // nodes
    for (let k = nodes.length - 1; k >= 0; k--) {
      const n = nodes[k];
      n.life -= dt; n.t += dt;
      const y = nodeScreenY(n);
      if (n.life <= 0 || y < -14) { nodes.splice(k, 1); continue; }
      if (n.life < 2 && Math.floor(n.life * 8) % 2 === 0) continue;
      const bob = Math.round(Math.sin(n.t * 4) * 1);
      const nl = G.layerAt(Math.max(0, d + (y + 5 - tipB) / PPM));
      const pocket = shade(pl.layers[nl], -0.55);
      rect(n.x - 1, y, 12, 10, pocket); rect(n.x, y - 1, 10, 12, pocket);
      rect(n.x - 1, y + 10, 12, 1, shade(pl.layers[nl], 0.25));
      if (Math.floor(n.t * 4) % 2) {
        const gc = NODE_COL[n.type][1];
        rect(n.x - 2, y + 1, 1, 8, gc); rect(n.x + 11, y + 1, 1, 8, gc); rect(n.x + 1, y - 2, 8, 1, gc);
      }
      bx.drawImage(G.Pix.node(n.type), n.x, y + bob);
    }

    // plate
    if (s.plate) drawPlate();

    // drill
    const sk = skinId();
    const jammed = rt.enemy && G.Game.ENEMIES[rt.enemy.type].mul === 0;
    const working = (rt.moving || !!s.plate) && !jammed;
    const spin = working ? (rt.over > 0 ? 34 : s.turboLeft > 0 ? 24 : rt.enemy ? 5 : 14) : 0.5;
    headPhase += dt * spin;
    const jit = working ? (Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -1 : 1)) : jammed ? (Math.floor(time * 20) % 2) : 0;
    if (rt.over > 0) {
      for (let q = 0; q < 3; q++) {
        const lx = Math.random() < 0.5 ? bcx - 14 - Math.random() * 30 : bcx + 14 + Math.random() * 30;
        spawn(lx, drillTop + 40 + Math.random() * 30, 0, -220, 0.18, 1, ['#FF5A1E', '#FFD447', '#FFFFFF'][q], 0, 3);
      }
    }
    G.Pix.drawDrill(bx, drillX + jit, drillTop, sk, headPhase, rt.over > 0 ? 0.35 + 0.2 * Math.sin(time * 20) : 0, look);
    if (drillFlash > 0) {
      drillFlash = Math.max(0, drillFlash - dt);
      if (Math.floor(drillFlash * 12) % 2) { bx.globalAlpha = 0.55; rect(drillX - 6, drillTop - 5, 32, G.Pix.DRILL.BODY_H + 26, '#FFFFFF'); bx.globalAlpha = 1; }
    }
    if (jammed && Math.random() < dt * 10) spawn(bcx + (Math.random() - 0.5) * 14, drillTop + 20, (Math.random() - 0.5) * 10, -20, 1, 2, '#6A6474', -6, 1);
    if (tipFlash > 0) {
      bx.globalAlpha = tipFlash * 0.8;
      pixCircle(bcx, tipB, 4, '#FFF6C8');
      bx.globalAlpha = 1;
    }
    // exhaust smoke
    if (working && Math.random() < dt * 8) {
      for (const ex of [4, 14]) spawn(drillX + ex + 1, drillTop - 1, (Math.random() - 0.5) * 6, -14, 0.9, 2, rt.over > 0 ? '#FF8A3A' : '#8A8494', -4, 1);
    }

    // sparks and debris at the tip
    if (working || G.Game.atCore()) {
      emitAcc += dt * (G.Game.atCore() ? 18 : rt.over > 0 ? 110 : 55);
      const spc = G.Pix.sparkColor(sk);
      const rainbow = ['#FF5A5A', '#FFD447', '#5AFF8A', '#5AC8FF', '#C59BFF'];
      while (emitAcc >= 1) {
        emitAcc--;
        const side = Math.random() < 0.5 ? -1 : 1;
        if (Math.random() < 0.55) {
          const a = -Math.PI / 2 + side * (0.5 + Math.random() * 0.9);
          const sp = 40 + Math.random() * 60;
          spawn(bcx + side * 2, tipB - 1, Math.cos(a) * sp, Math.sin(a) * sp, 0.25 + Math.random() * 0.3, 1, rt.over > 0 ? rainbow[Math.floor(Math.random() * 5)] : spc, 160, 0);
        } else {
          spawn(bcx + side * (2 + Math.random() * 4), tipB - 2, side * (10 + Math.random() * 40), -30 - Math.random() * 50, 0.5 + Math.random() * 0.4, Math.random() < 0.3 ? 2 : 1, shade(pl.layers[li], Math.random() * 0.2 - 0.1), 260, 1);
        }
      }
    }

    // heat meter
    drawHeat();

    // enemy
    L.enemy = null;
    if (rt.enemy) drawEnemy(rt.enemy, dt);

    // companions
    drawPets(dt);

    // cart
    L.cart = null;
    if (rt.cart) drawCart(rt.cart.t);
  }
  let emitAcc = 0;

  let drillFlash = 0;
  function flashDrill() {
    drillFlash = 0.6;
    for (let k = 0; k < 24; k++) spawn(bcx + (Math.random() - 0.5) * 34, drillTop + Math.random() * 40, (Math.random() - 0.5) * 30, -20 - Math.random() * 30, 0.9, 1, '#FFF2A8', 0, 2);
    shake(3);
  }

  // ---------- enemies ----------
  function hpBar(x, y, e) {
    rect(x - 1, y - 1, 16, 4, '#120A10');
    rect(x, y, 14, 2, '#3A2E44');
    rect(x, y, Math.round(14 * e.hp / e.max), 2, '#FF4A4A');
  }
  function drawEnemy(e, dt) {
    let x, y, spr, flip = false;
    const bob = Math.floor(time * 6) % 2;
    if (e.type === 'mole') {
      spr = G.Pix.enemy('mole');
      const target = e.side < 0 ? drillX - 32 : drillX + 30;
      const from = e.side < 0 ? -16 : BW + 2;
      const k = Math.min(1, e.t / 1.2);
      x = Math.round(from + (target - from) * k);
      y = drillTop + 8 + (k < 1 ? bob : 0);
      flip = e.side > 0;
      // the hole it dug
      rect(e.side < 0 ? 0 : x, y - 1, e.side < 0 ? x + 6 : BW - x, 14, 'rgba(10,6,10,0.55)');
      if (e.stolen > 0) {
        bx.drawImage(G.Pix.enemy('sack'), x + (flip ? 10 : -2), y - 5 + bob);
        e.popT = (e.popT || 0) - dt;
        if (e.popT <= 0) { e.popT = 1; popB(x + 7, y - 8, '-' + G.fmt(e.stolen, true), '#FF6A6A', false); }
      }
    } else if (e.type === 'spider') {
      spr = G.Pix.enemy('spider');
      const k = Math.min(1, e.t / 1.5);
      x = drillX + 3;
      y = Math.round(-10 + (drillTop + 2 + 10) * k);
      rect(x + 7, 0, 1, Math.max(0, y), '#E8E8F0');
      if (k >= 1) {
        bx.globalAlpha = 0.75;
        for (let q = 0; q < 5; q++) rect(drillX - 2, drillTop + 6 + q * 7, 24, 1, '#E8E8F0');
        for (let q = 0; q < 4; q++) rect(drillX + 2 + q * 6, drillTop + 4, 1, 34, '#E8E8F0');
        bx.globalAlpha = 1;
      }
    } else if (e.type === 'slime') {
      spr = G.Pix.enemy('slime');
      const k = Math.min(1, e.t / 0.8);
      x = bcx - 6;
      y = Math.round(-12 + (tipB - 12 + 12) * k);
      if (k >= 1 && Math.random() < dt * 6) spawn(x + 2 + Math.random() * 8, y + 10, 0, 20, 0.8, 1, '#FF8A2A', 60, 1);
    } else {
      spr = G.Pix.enemy('boulder');
      const k = Math.min(1, e.t / 0.6);
      const pile = [[-2, 0], [6, -3], [13, 1]];
      for (const [dx, dy] of pile) bx.drawImage(spr, drillX + dx, Math.round(-10 + (drillTop - 6 + dy + 10) * k));
      if (k >= 1 && Math.random() < dt * 8) spawn(drillX + Math.random() * 20, drillTop - 4, (Math.random() - 0.5) * 10, -6, 1.2, 2, '#9A96A6', 4, 1);
      x = drillX + 3; y = drillTop - 9;
      hpBar(x, y - 6, e);
      L.enemy = { x: R.x + (drillX - 4) * PX, y: R.y + (drillTop - 12) * PX, w: 30 * PX, h: 40 * PX };
      if (Math.floor(time * 3) % 2) popWarn(bcx, drillTop - 20, 'JAMMED!');
      return;
    }
    if (flip) {
      bx.save(); bx.translate(x + spr.width, y); bx.scale(-1, 1); bx.drawImage(spr, 0, 0); bx.restore();
    } else bx.drawImage(spr, x, y);
    hpBar(x, y - 6, e);
    if (e.type === 'slime' && Math.floor(time * 3) % 2) popWarn(bcx, drillTop - 12, 'JAMMED!');
    const pad = 6;
    L.enemy = { x: R.x + (x - pad) * PX, y: R.y + (y - pad - 6) * PX, w: (spr.width + pad * 2) * PX, h: (spr.height + pad * 2 + 6) * PX };
    if (e.type === 'slime') L.enemy = { x: R.x + (drillX - 4) * PX, y: R.y + (drillTop) * PX, w: 28 * PX, h: (tipB - drillTop + 8) * PX };
  }
  // ---------- companions ----------
  const pet = { botHit: 0, botCoins: 0, botPopT: 0, bat: { x: null, y: 0, state: 'idle', target: null, cd: 2 }, golem: { x: null, y: 0, state: 'home', cd: 0, tx: 0, ty: 0 } };
  function moveTo(o, tx, ty, sp, dt) {
    const dx = tx - o.x, dy = ty - o.y, dd = Math.hypot(dx, dy);
    if (dd <= sp * dt || dd < 0.5) { o.x = tx; o.y = ty; return true; }
    o.x += dx / dd * sp * dt; o.y += dy / dd * sp * dt;
    return false;
  }
  function botFx(coins) {
    pet.botHit = 0.15;
    pet.botCoins += coins;
    spawn(bcx + 3, tipB - 2, 30 + Math.random() * 30, -40 - Math.random() * 30, 0.3, 1, '#5AF0FF', 160, 0);
  }
  function drawPets(dt) {
    const C = G.Crystal;
    if (C.petLv('bot')) {
      pet.botHit -= dt;
      const lean = pet.botHit > 0 ? -2 : 0;
      const x = bcx + 13 + lean, y = tipB - 17 + (Math.floor(time * 4) % 2);
      rect(x + 1, y - 2, 8, 1, Math.floor(time * 20) % 2 ? '#C9D2DE' : '#5A6472');
      rect(x + 4, y - 1, 2, 1, '#1A1020');
      rect(bcx + 4, y + 4, x - bcx - 4, 1, '#5A6472');
      bx.drawImage(G.Pix.enemy('bot'), x, y);
      pet.botPopT -= dt;
      if (pet.botPopT <= 0 && pet.botCoins > 0) { pet.botPopT = 1.2; popB(x + 5, y - 6, '+' + G.fmt(pet.botCoins, true), '#5AF0FF', false); pet.botCoins = 0; }
    }
    if (C.petLv('bat')) {
      const b = pet.bat;
      if (b.x == null) { b.x = bcx - 30; b.y = drillTop + 10; }
      b.cd -= dt;
      if (b.state === 'idle') {
        moveTo(b, bcx + Math.cos(time * 1.4) * 44, drillTop - 4 + Math.sin(time * 2.8) * 6, 60, dt);
        if (b.cd <= 0 && nodes.length) { b.target = nodes[0]; b.state = 'go'; }
      } else if (!nodes.includes(b.target)) b.state = 'idle';
      else if (moveTo(b, b.target.x + 5, nodeScreenY(b.target) + 5, 170, dt)) {
        collect(b.target);
        b.state = 'idle'; b.cd = C.batEvery();
      }
      const flap = Math.floor(time * 10) % 2;
      bx.drawImage(G.Pix.enemy('bat'), Math.round(b.x - 6), Math.round(b.y - 3 - flap));
      rect(Math.round(b.x - 1), Math.round(b.y + 3 - flap), 2, 2, '#E8434F');
    }
    if (C.petLv('golem')) {
      const g = pet.golem;
      const hx = drillX - 36, hy = tipB - 2;
      if (g.x == null) { g.x = hx; g.y = hy; }
      g.cd -= dt;
      const e = G.Game.rt.enemy;
      if (g.state === 'home') {
        moveTo(g, hx, hy, 80, dt);
        if (e && e.t > 1.3 && L.enemy && g.cd <= 0) {
          g.tx = (L.enemy.x - R.x) / PX + L.enemy.w / PX / 2 - 6; g.ty = (L.enemy.y - R.y) / PX + L.enemy.h / PX / 2 - 4;
          g.state = 'go';
        }
      } else if (g.state === 'go') {
        if (!e) g.state = 'home';
        else if (moveTo(g, g.tx, g.ty, 200, dt)) {
          const cx = R.x + (g.tx + 6) * PX, cy = R.y + (g.ty + 4) * PX;
          enemyFx(G.Game.hitEnemy(true), cx, cy);
          g.cd = C.golemEvery();
          g.state = 'home';
        }
      }
      bx.drawImage(G.Pix.enemy('golem'), Math.round(g.x), Math.round(g.y + (Math.floor(time * 3) % 2)));
    }
  }

  let warnT = 0;
  function popWarn(x, y, text) {
    if (time - warnT < 1.4) return;
    warnT = time;
    popB(x, y, text, '#FF6A6A', false);
  }
  function hitEnemy(x, y) {
    const e = L.enemy;
    if (!e || !G.Game.rt.enemy) return false;
    const minS = 44;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    const hw = Math.max(minS / 2, e.w / 2), hh = Math.max(minS / 2, e.h / 2);
    return Math.abs(x - cx) <= hw && Math.abs(y - cy) <= hh;
  }
  function enemyFx(res, x, y) {
    if (!res || res.limited) return;
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * Math.PI * 2;
      spawn((x - R.x) / PX, (y - R.y) / PX, Math.cos(a) * 60, Math.sin(a) * 60 - 20, 0.4, 1, k % 2 ? '#FFFFFF' : '#FF6A6A', 120, 1);
    }
    shake(2);
    pop(x, y - 10, res.defeated ? 'WIN!' : 'POW!', res.defeated ? '#9BE58A' : '#FFFFFF', res.defeated);
    if (res.defeated) {
      for (let k = 0; k < 30; k++) {
        const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 90;
        spawn((x - R.x) / PX, (y - R.y) / PX, Math.cos(a) * sp, Math.sin(a) * sp - 30, 0.8, k % 3 ? 1 : 2, ['#FFD447', '#FFF2A8', '#9BE58A'][k % 3], 140, 1);
      }
      pop(x, y + 16, '+' + G.fmt(res.coins, true), '#FFD447', false);
      flyTo('coins', x, y, 8);
      if (res.gems) { pop(x, y + 34, '+' + res.gems, '#8FE8FF', true, 'gem'); flyTo('gems', x, y, 3); }
    }
  }

  let heatShow = 0;
  function drawHeat() {
    const rt = G.Game.rt;
    heatShow = rt.heat > 0 || rt.over > 0 ? 1 : Math.max(0, heatShow - 0.03);
    if (heatShow <= 0) return;
    bx.globalAlpha = heatShow;
    drawHeatBar(rt);
    bx.globalAlpha = 1;
  }
  function drawHeatBar(rt) {
    const x = drillX - 14, y0 = drillTop + 12, h = 26;
    rect(x - 1, y0 - 1, 6, h + 2, '#120A10');
    rect(x, y0, 4, h, '#3A2E44');
    for (let k = 3; k < h; k += 4) rect(x, y0 + k, 4, 1, '#2A2030');
    const f = rt.over > 0 ? rt.over / G.Game.OVERDRIVE : rt.heat;
    const fh = Math.round(h * f);
    for (let k = 0; k < fh; k++) {
      const u = k / h;
      const col = rt.over > 0 ? ['#FF5A5A', '#FFD447', '#5AFF8A', '#5AC8FF', '#C59BFF'][(Math.floor(time * 12) + k) % 5]
        : u < 0.4 ? '#FFD447' : u < 0.75 ? '#FF9F2E' : '#FF4A2A';
      rect(x, y0 + h - 1 - k, 4, 1, col);
    }
    rect(x, y0 + h - fh, 1, fh, 'rgba(255,255,255,0.35)');
    const hot = rt.over > 0 || rt.heat > 0.85;
    const keep = bx.globalAlpha;
    if (!hot) bx.globalAlpha = keep * (0.35 + rt.heat * 0.6);
    bx.drawImage(G.Pix.node('heat'), x - 3, y0 - 11 + (hot ? Math.round(Math.sin(time * 10)) : 0));
    bx.globalAlpha = keep;
  }

  function drawPlate() {
    const s = S();
    const i = G.Game.layer();
    const pl = G.planet(s.planet);
    const y = tipB - 1;
    const base = G.mixColor(G.mixColor(pl.layers[i], pl.layers[Math.min(9, i + 1)], 0.5), '#6E6E78', 0.6);
    const lt = shade(base, 0.25), dk = shade(base, -0.35), mortar = shade(base, -0.5);
    rect(0, y, BW, PH, base);
    rect(0, y, BW, 1, lt);
    rect(0, y + PH - 1, BW, 1, dk);
    rect(0, y + 4, BW, 1, mortar);
    for (let x = 0; x < BW; x += 12) {
      rect(x, y + 1, 1, 3, mortar);
      rect(x + 6, y + 5, 1, 3, mortar);
      rect(x + 2, y + 2, 1, 1, lt); rect(x + 8, y + 6, 1, 1, lt);
    }
    const rt = G.Game.rt;
    const dmg = Math.max(0, Math.min(1, 1 - s.plate.hp / G.Game.plateMax()));
    const shown = rt.regenT > 0 ? 1 : dmg;
    if (shown > 0.02) {
      bx.globalAlpha = rt.regenT > 0 ? rt.regenT / 0.3 : 1;
      const N = 10;
      for (let c = 0; c < N; c++) {
        const f = Math.max(0, Math.min(1, shown * N - c));
        if (f <= 0) break;
        const r = rng(c * 31 + i * 7 + 1);
        let cx = bcx + Math.round((r() - 0.5) * 12), cy = y + 1 + Math.floor(r() * 3);
        const dir = r() < 0.5 ? -1 : 1;
        const steps = Math.round((10 + r() * 30) * f);
        for (let q = 0; q < steps; q++) {
          rect(cx, cy, 1, 1, '#140A0A');
          rect(cx, cy + 1, 1, 1, lt);
          cx += dir;
          const rr = r();
          if (rr < 0.3 && cy < y + PH - 3) cy++; else if (rr > 0.8 && cy > y + 1) cy--;
        }
      }
      bx.globalAlpha = 1;
    }
    if (rt.regenT > 0) { bx.globalAlpha = rt.regenT / 0.3 * 0.5; rect(0, y, BW, PH, '#BFF0FF'); bx.globalAlpha = 1; }
  }

  function drawCart(t) {
    const spr = G.Pix.cart();
    const railY = BH - 5;
    for (let x = 0; x < BW; x += 6) rect(x, railY, 3, 2, '#6E4520');
    rect(0, railY - 1, BW, 1, '#B9C2D0');
    const x = Math.round(-spr.width + (BW + spr.width * 2) * (t / 15));
    const y = railY - spr.height;
    const pulse = Math.floor(time * 6) % 2;
    if (pulse) { bx.globalAlpha = 0.5; rect(x - 1, y - 1, spr.width + 2, spr.height + 2, '#FFE27A'); bx.globalAlpha = 1; }
    bx.drawImage(spr, x, y);
    if (Math.floor(time * 3) % 2) { rect(x + 15, y - 4, 1, 3, '#FFFFFF'); rect(x + 14, y - 3, 3, 1, '#FFFFFF'); }
    L.cart = { x: R.x + (x - 4) * PX, y: R.y + (y - 8) * PX, w: (spr.width + 8) * PX, h: (spr.height + 12) * PX };
  }

  function drawRuler() {
    const s = S();
    const x = BW - 5, y0 = 4, y1 = BH - 4, h = y1 - y0;
    const pl = G.planet(s.planet);
    rect(x - 1, y0 - 1, 5, h + 2, '#120A10');
    const vein = G.Retention.vein();
    for (let i = 0; i < 10; i++) {
      const a = Math.round(y0 + h * G.DEPTHS[i] / G.CORE), b = Math.round(y0 + h * G.DEPTHS[i + 1] / G.CORE);
      rect(x, a, 3, b - a, s.depth >= G.DEPTHS[i] ? pl.layers[i] : shade(pl.layers[i], -0.6));
      if (i === vein && Math.floor(time * 2) % 2) { rect(x - 1, a, 1, b - a, '#FFD447'); rect(x + 3, a, 1, b - a, '#FFD447'); }
    }
    const my = Math.round(y0 + h * Math.min(1, s.depth / G.CORE));
    rect(x - 3, my - 1, 2, 3, '#FFFFFF'); rect(x - 4, my, 1, 1, '#FFFFFF');
  }

  // ---------- core explosion / flight ----------
  function planetDisc(p, x, y, r, crack) {
    const pl = G.planet(p);
    for (let i = 0; i < 10; i++) pixCircle(x, y, Math.max(1, Math.round(r * (1 - i * 0.09))), pl.layers[i]);
    if (crack) {
      for (let q = 0; q < 7; q++) {
        const a = q * 0.9;
        for (let k = 0; k < r; k += 1) rect(x + Math.cos(a + k * 0.02) * k, y + Math.sin(a + k * 0.02) * k, 1, 1, '#FFF2A8');
      }
    }
  }
  function drawFlight(t) {
    rect(0, 0, BW, BH, '#070A1C');
    for (let q = 0; q < 70; q++) {
      const len = 1 + Math.round(t * 4 * frac(q));
      const sx = (((frac(q * 3) * BW - t * 90 * (0.5 + frac(q))) % BW) + BW) % BW;
      rect(sx, frac(q * 3 + 1) * BH, len, 1, q % 4 ? '#FFFFFF' : '#9AD8FF');
    }
    const u = t / 2;
    const pr = Math.round(Math.min(BW, BH) * 0.3);
    const from = anim.from, to = from + 1;
    if (u < 0.45) {
      const k = u / 0.45;
      planetDisc(from, BW * (0.2 - 0.3 * k), BH * 0.55, Math.max(2, Math.round(pr * (1 - 0.5 * k))), 1 - k);
      for (let q = 0; q < 18; q++) {
        const a = q / 18 * Math.PI * 2;
        rect(BW * 0.2 + Math.cos(a) * pr * (1 + k * 2), BH * 0.55 + Math.sin(a) * pr * (1 + k * 2), 3, 3, G.planet(from).layers[q % 10]);
      }
    }
    const nk = Math.max(0, (u - 0.35) / 0.65);
    if (nk > 0) planetDisc(to, BW * (1.15 - 0.4 * nk), BH * 0.55, Math.max(2, Math.round(pr * (0.4 + 0.6 * nk))), 0);
    const rx = Math.round(BW * (0.12 + 0.55 * u)), ry = Math.round(BH * (0.5 - 0.12 * Math.sin(u * Math.PI)));
    tmpDrill.width = G.Pix.DRILL.W; tmpDrill.height = G.Pix.DRILL.H;
    const tc = tmpDrill.getContext('2d');
    tc.clearRect(0, 0, tmpDrill.width, tmpDrill.height);
    tmpDrill.width = 36; tmpDrill.height = 56;
    G.Pix.drawDrill(tc, 8, 6, skinId(), time * 30, 0, G.Pix.look(S().lv));
    bx.save();
    bx.translate(rx, ry);
    bx.rotate(-Math.PI / 2);
    bx.drawImage(tmpDrill, -18, -28);
    bx.restore();
    for (let q = 0; q < 3; q++) spawn(rx - 22, ry - 1 + (Math.random() - 0.5) * 8, -80 - Math.random() * 80, (Math.random() - 0.5) * 20, 0.4, 2, q ? '#FFB347' : '#FFF2A8', 0, 1);
  }

  // ---------- frame ----------
  function frame(dt) {
    time += dt;
    if (tipFlash > 0) tipFlash = Math.max(0, tipFlash - dt * 6);
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeAmp = 0; }
    if (!anim) {
      nodeTimer -= dt;
      if (nodeTimer <= 0) { nodeTimer = G.Game.nodeInterval(); spawnNode(); }
    }

    bx.imageSmoothingEnabled = false;
    if (anim && anim.type === 'fly') drawFlight(anim.t);
    else { drawWorld(dt); drawLighting(); }

    for (const p of parts) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 2) {
        if (Math.sin(p.life * 20) > 0) rect(p.x, p.y, 1, 1, p.color);
        continue;
      }
      bx.globalAlpha = Math.min(1, p.life / p.max * 2);
      rect(p.x, p.y, p.size, p.size, p.color);
      if (p.kind === 0) rect(p.x - p.vx * 0.02, p.y - p.vy * 0.02, 1, 1, p.color);
      if (p.kind === 3) rect(p.x, p.y + 2, 1, 4, p.color);
    }
    bx.globalAlpha = 1;
    if (G.Game.rt.over > 0 && !anim) { bx.globalAlpha = 0.07 + 0.04 * Math.sin(time * 10); rect(0, 0, BW, BH, '#FF7A1A'); bx.globalAlpha = 1; }

    if (anim) {
      anim.t += dt;
      if (anim.type === 'boom') {
        whiteFlash = Math.min(1, anim.t / 0.25);
        if (anim.t >= 0.5) { anim = { type: 'fly', t: 0, from: anim.from, onDone: anim.onDone }; G.Audio.sfx('whoosh'); }
      } else if (anim.type === 'fly') {
        whiteFlash = Math.max(0, 1 - anim.t / 0.35);
        if (anim.t >= 2) { const cb = anim.onDone; anim = null; whiteFlash = 0; cb && cb(); }
      }
    }
    if (whiteFlash > 0) { bx.globalAlpha = whiteFlash; rect(0, 0, BW, BH, '#FFFFFF'); bx.globalAlpha = 1; }
    if (!anim) drawRuler();

    // compose
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bgPattern || '#1B1620';
    ctx.fillRect(0, 0, W, H);
    const sx = shakeAmp ? Math.round((Math.random() - 0.5) * 2 * shakeAmp * (shakeT / 0.3)) * PX : 0;
    const sy = shakeAmp ? Math.round((Math.random() - 0.5) * 2 * shakeAmp * (shakeT / 0.3)) * PX : 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.drawImage(buf, 0, 0, BW, BH, R.x + sx, R.y + sy, BW * PX, BH * PX);
    ctx.restore();

    // pixel frame
    const f = PX;
    ctx.fillStyle = '#0C080E';
    ctx.fillRect(R.x - f, R.y - f, R.w + 2 * f, f); ctx.fillRect(R.x - f, R.y + R.h, R.w + 2 * f, f);
    ctx.fillRect(R.x - f, R.y, f, R.h); ctx.fillRect(R.x + R.w, R.y, f, R.h);
    ctx.fillStyle = '#3A2E44';
    ctx.fillRect(R.x - 2 * f, R.y - 2 * f, R.w + 4 * f, f); ctx.fillRect(R.x - 2 * f, R.y + R.h + f, R.w + 4 * f, f);
    ctx.fillRect(R.x - 2 * f, R.y - f, f, R.h + 2 * f); ctx.fillRect(R.x + R.w + f, R.y - f, f, R.h + 2 * f);

    // popups (bitmap font)
    for (const p of pops) {
      if (!p.on) continue;
      p.life -= dt / 0.9;
      if (p.life <= 0) { p.on = false; continue; }
      const spr = G.Pix.textSprite(p.text, p.color);
      const sc = p.scale;
      const yy = Math.round(p.y - (1 - p.life) * 40);
      const w = spr.width * sc, h = spr.height * sc;
      ctx.globalAlpha = Math.min(1, p.life * 3);
      let x0 = Math.round(p.x - w / 2);
      ctx.drawImage(spr, x0, yy - h / 2, w, h);
      if (p.icon === 'gem') ctx.drawImage(G.Pix.node('gem'), x0 + w + 2, yy - 5 * sc, 10 * sc, 10 * sc);
      ctx.globalAlpha = 1;
    }

    // title splash over the scene at the start of a session
    if (splashT > 0 && !anim && R.w >= 560) {
      splashT -= dt;
      const a = Math.min(1, splashT / 0.6, (4.2 - splashT) / 0.4);
      const sc = Math.max(3, Math.round(PX * 1.6));
      const t1 = G.Pix.textSprite('DEEPER!', '#FFD447'), t2 = G.Pix.textSprite(G.lang === 'ru' ? 'БУР ДО ЯДРА' : 'IDLE DRILL', '#FFFFFF');
      const y0 = R.y + R.h * 0.13 + (1 - a) * -10;
      ctx.globalAlpha = Math.max(0, a);
      ctx.drawImage(t1, Math.round(L.cx - t1.width * sc / 2), Math.round(y0), t1.width * sc, t1.height * sc);
      const sc2 = Math.max(2, Math.round(sc / 2));
      ctx.drawImage(t2, Math.round(L.cx - t2.width * sc2 / 2), Math.round(y0 + t1.height * sc + 4), t2.width * sc2, t2.height * sc2);
      ctx.globalAlpha = 1;
    }

    // coins and gems flying into the counters
    for (let k = flyers.length - 1; k >= 0; k--) {
      const f2 = flyers[k];
      f2.t += dt;
      if (f2.t < 0) continue;
      const u = Math.min(1, f2.t / f2.dur), v = 1 - u;
      const x = v * v * f2.x0 + 2 * v * u * f2.cx + u * u * f2.x1;
      const y = v * v * f2.y0 + 2 * v * u * f2.cy + u * u * f2.y1;
      const spr = G.Pix.iconSprite(f2.kind === 'gems' ? 'gem' : 'coin');
      const size = Math.round(Math.max(14, 6 * PX) * (1 - 0.35 * u));
      ctx.drawImage(spr, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
      if (u >= 1) { flyers.splice(k, 1); G.UI?.bump(f2.kind); if (f2.kind === 'coins' && Math.random() < 0.5) G.Audio.sfx('coin'); }
    }
  }

  // ---------- light ----------
  const DARK = [0.28, 0.34, 0.42, 0.48, 0.52, 0.44, 0.54, 0.42, 0.3, 0.12];
  const shadeC = document.createElement('canvas');
  const light = { surfY: 0, lamps: [] };
  function circleOn(c, x0, y0, r) {
    const rr = r * r;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, rr - dy * dy)));
      c.fillRect(Math.round(x0 - w), Math.round(y0 + dy), w * 2 + 1, 1);
    }
  }
  function drawLighting() {
    const s = S(), d = s.depth;
    const li = G.layerAt(Math.min(G.CORE, d));
    const a = DARK[li] * Math.min(1, d / 12);
    if (a <= 0.02) return;
    if (shadeC.width !== BW || shadeC.height !== BH) { shadeC.width = BW; shadeC.height = BH; }
    const c = shadeC.getContext('2d');
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, BW, BH);
    const y0 = Math.max(0, Math.ceil(light.surfY + 2));
    c.fillStyle = `rgba(6,3,12,${a})`;
    c.fillRect(0, y0, BW, BH - y0);
    c.globalAlpha = Math.min(0.5, a * 0.6);
    c.fillRect(0, Math.max(y0, BH - 30), BW, BH);
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    const hole = (x, y, r) => {
      for (const [f, al] of [[1, 0.3], [0.78, 0.55], [0.55, 1]]) { c.globalAlpha = al; circleOn(c, x, y, Math.max(2, Math.round(r * f))); }
    };
    const flick = Math.sin(time * 9) > 0.92 ? -2 : 0;
    hole(bcx, drillTop + 22, 40 + flick);
    for (let k = 0; k < 44; k++) {
      const w = Math.round(5 + k * 0.85);
      c.globalAlpha = 0.85 * (1 - k / 44);
      c.fillRect(bcx - w, tipB + k, w * 2, 1);
    }
    for (const ly of light.lamps) hole(bcx - 7, ly, 15);
    for (const n of nodes) hole(n.x + 5, nodeScreenY(n) + 5, 11);
    if (L.enemy) hole((L.enemy.x - R.x) / PX + L.enemy.w / PX / 2, (L.enemy.y - R.y) / PX + L.enemy.h / PX / 2, 16);
    if (L.cart) hole((L.cart.x - R.x) / PX + L.cart.w / PX / 2, (L.cart.y - R.y) / PX + L.cart.h / PX / 2, 20);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    bx.drawImage(shadeC, 0, 0);
  }

  // ---------- fx toward the HUD ----------
  const flyers = [];
  let splashT = 4.2;
  function flyTo(kind, x, y, n) {
    const T = G.UI?.hudTarget(kind);
    if (!T) return;
    for (let k = 0; k < n && flyers.length < 48; k++) {
      flyers.push({
        kind, t: -k * 0.05, dur: 0.55 + Math.random() * 0.2,
        x0: x + (Math.random() - 0.5) * 24, y0: y + (Math.random() - 0.5) * 24,
        cx: x + (Math.random() - 0.5) * 160, cy: Math.min(y, T.y) - 60 - Math.random() * 80,
        x1: T.x, y1: T.y,
      });
    }
  }
  function hideSplash() { if (splashT > 0.6) splashT = 0.6; }

  // ---------- surface station ----------
  function drawStation(sy) {
    const m = '#4A3A30', mk = '#2A2018', lt = '#7A6A5A';
    const top = sy - 46;
    for (let k = 0; k <= 44; k++) {
      const u = k / 44;
      const xl = Math.round(bcx - 16 + 10 * u), xr = Math.round(bcx + 15 - 10 * u);
      rect(xl, sy - k, 2, 1, m); rect(xr, sy - k, 2, 1, m);
      if (k % 11 === 0 && k) { rect(xl, sy - k, xr - xl + 2, 1, mk); }
    }
    for (let k = 0; k < 4; k++) {
      const ya = sy - k * 11, yb = sy - (k + 1) * 11;
      const xa = bcx - 16 + 10 * (k * 11 / 44), xb = bcx + 15 - 10 * ((k + 1) * 11 / 44);
      for (let q = 0; q <= 10; q++) rect(Math.round(xa + (xb - xa) * q / 10), Math.round(ya + (yb - ya) * q / 10), 1, 1, lt);
    }
    rect(bcx - 9, top - 3, 19, 4, mk); rect(bcx - 8, top - 3, 17, 1, lt);
    const wob = Math.floor(time * 6) % 2;
    rect(bcx - 3, top - 8, 7, 5, '#1A1020'); rect(bcx - 2, top - 7, 5, 3, wob ? '#8C96A6' : '#C9D2DE');
    rect(bcx, Math.round(top - 3), 1, Math.max(0, drillTop - top + 3), '#B9C2D0');
    // cabin
    const cx = bcx - 52;
    rect(cx, sy - 13, 22, 13, '#1A1020'); rect(cx + 1, sy - 12, 20, 12, '#B07A45'); rect(cx + 1, sy - 9, 20, 1, '#8A5A30'); rect(cx + 1, sy - 5, 20, 1, '#8A5A30');
    for (let k = 0; k < 7; k++) rect(cx - 1 + k, sy - 14 - k, 24 - k * 2, 1, k % 2 ? '#C0503A' : '#A83A2A');
    rect(cx + 4, sy - 10, 5, 4, '#1A1020'); rect(cx + 5, sy - 9, 3, 2, Math.sin(time * 3) > -0.8 ? '#FFE27A' : '#FFB347');
    rect(cx + 13, sy - 9, 5, 9, '#5A3818');
    // flag
    const fx = bcx + 34;
    rect(fx, sy - 26, 1, 26, '#C9D2DE');
    for (let k = 0; k < 6; k++) rect(fx + 1, sy - 26 + k + ((k + Math.floor(time * 5)) % 3 === 0 ? 1 : 0), 9 - (k % 2), 1, k < 3 ? '#FFD447' : '#E8434F');
    // ore crates
    rect(bcx + 22, sy - 6, 7, 6, '#1A1020'); rect(bcx + 23, sy - 5, 5, 5, '#8A5A30'); rect(bcx + 23, sy - 6, 5, 2, '#FFD447');
  }

  function hitCart(x, y) {
    const c = L.cart;
    return !!c && x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
  }
  const inScene = (x, y) => x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h;

  function drillPreview(canvas, id, lv) {
    canvas.width = 36; canvas.height = 54;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    G.Pix.drawDrill(c, 8, 6, id, 1, 0, lv ? G.Pix.look(lv) : null);
  }

  G.Render = {
    init, setScene, resize, measure, frame, tapFx, plateBroken, boom, busy, hitCart, hitNode, collect, hitEnemy, enemyFx, flashDrill, botFx, flyTo, hideSplash, inScene, drillPreview, shake, R, L,
    get plateBottom() { return R.y + (tipB - 1 + PH) * PX; }, get PX() { return PX; }, nodes, spawnNode,
  };
})();
