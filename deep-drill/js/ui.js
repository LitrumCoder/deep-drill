(() => {
  const G = window.G;
  const t = (k, p) => G.t(k, p);
  const S = () => G.Save.data;
  const sfx = n => G.Audio.sfx(n);
  const fmt = (n, d) => G.fmt(n, d);

  // ---------- icons ----------
  const svg = (body, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
  const gearPath = [0, 45, 90, 135].map(a => `<rect x="10.2" y="1.6" width="3.6" height="20.8" rx="1.3" transform="rotate(${a} 12 12)"/>`).join('');
  const IC = {
    coin: svg('<circle cx="12" cy="12" r="10" fill="#F5B82E" stroke="#B9770E" stroke-width="1.6"/><circle cx="12" cy="12" r="6.6" fill="#FFD95A" stroke="#D18F12" stroke-width="1.4"/><path d="M12 8.4v7.2" stroke="#C9850F" stroke-width="2.2" stroke-linecap="round"/><path d="M7 7.5a7 7 0 0 1 4-2.4" stroke="#FFF2B0" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),
    gem: svg('<path d="M3 9.2L7 4h10l4 5.2L12 21z" fill="#4FD1F0" stroke="#1D86A8" stroke-width="1.3" stroke-linejoin="round"/><path d="M3 9.2h18M7 4l2.6 5.2L12 21l2.4-11.8L17 4M9.6 9.2L12 4l2.4 5.2" fill="none" stroke="#1D86A8" stroke-width="1" stroke-linejoin="round"/><path d="M7 4l2.6 5.2H3z" fill="#B9F3FF"/>'),
    shard: svg('<path d="M12 1.8l2.3 7.9 7.9 2.3-7.9 2.3L12 22.2l-2.3-7.9L1.8 12l7.9-2.3z" fill="#FFB347" stroke="#C26A0C" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 1.8l2.3 7.9L12 12z" fill="#FFE2A8"/><circle cx="12" cy="12" r="2" fill="#FFF6D8"/>'),
    gear: svg(`<mask id="icgm"><rect width="24" height="24" fill="#fff"/><circle cx="12" cy="12" r="3.2" fill="#000"/></mask><g fill="currentColor" mask="url(#icgm)">${gearPath}<circle cx="12" cy="12" r="7.2"/></g>`),
    gift: svg('<path d="M12 9C10 5 6.5 5 7 7.5S12 9 12 9zM12 9c2-4 5.5-4 5-1.5S12 9 12 9z" fill="none" stroke="#FFD447" stroke-width="1.9"/><rect x="3" y="9" width="18" height="4.2" rx="1" fill="#F0465A"/><rect x="4.5" y="13" width="15" height="8" rx="1.2" fill="#F0465A"/><rect x="10.7" y="9" width="2.6" height="12" fill="#FFD447"/>'),
    tasks: svg('<rect x="4" y="3.5" width="16" height="18" rx="2.5" fill="#E8DCC4"/><rect x="8" y="2" width="8" height="4" rx="1.4" fill="#8E6E52"/><path d="M7 10l1.6 1.6L11.5 8.7M7 15.5l1.6 1.6 2.9-2.9" fill="none" stroke="#3CC66B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 10.5h4M13 16h4" stroke="#8E7A66" stroke-width="1.8" stroke-linecap="round"/>'),
    geode: svg('<path d="M3 13.5C3 8 7 4 12 4s9 4 9 9.5c0 4-3.5 6.5-9 6.5S3 17.5 3 13.5z" fill="#7D6E66" stroke="#4A3F3A" stroke-width="1.4"/><path d="M6 12c1-1.5 2.5-2 3.5-1.6M14.5 8.2c1.6.2 3 1.2 3.6 2.6" stroke="#A8998F" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),
    geodeOpen: svg('<path d="M3 13.5C3 8 7 4 12 4s9 4 9 9.5c0 4-3.5 6.5-9 6.5S3 17.5 3 13.5z" fill="#7D6E66" stroke="#4A3F3A" stroke-width="1.4"/><ellipse cx="12" cy="13" rx="6.6" ry="5.2" fill="#3A1F5A"/><path d="M7.5 15l2-5 1.6 4 1.4-6 1.6 6 1.4-3.6 1.6 4.6z" fill="#C59BFF"/><path d="M10.5 14l1.4-5 1.2 5z" fill="#F0E2FF"/><circle cx="16" cy="9" r="1" fill="#fff"/>'),
    bolt: svg('<path d="M13.5 2L5 13.5h6L9.5 22 19 9.8h-6.2z" fill="#FFD447" stroke="#C98A0E" stroke-width="1.3" stroke-linejoin="round"/>'),
    video: svg('<rect x="1.8" y="4.6" width="20.4" height="14.8" rx="4" fill="currentColor" fill-opacity=".22" stroke="currentColor" stroke-width="1.9"/><path d="M10 8.7v6.6l5.5-3.3z" fill="currentColor"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
    close: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
    up: svg('<path d="M12 4l7 8h-4.2v8H9.2v-8H5z" fill="currentColor"/>'),
    planet: svg('<circle cx="12" cy="12" r="7" fill="#5AA9FF"/><path d="M6 9.5c2 .8 3.4 0 4.6 1.4 1.2 1.4-.4 3 1 4.4M14 5.6c-.4 1.6.6 2.6 2 2.8 1.4.2 2.2 1.2 2.2 2.6" stroke="#3CC66B" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="12" cy="12" rx="11" ry="3.6" fill="none" stroke="#FFD447" stroke-width="1.6" transform="rotate(-20 12 12)"/>'),
    bag: svg('<path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M4.8 8.5h14.4l-1.2 11a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-1.8z" fill="currentColor"/>'),
    sound: svg('<path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="currentColor"/><path d="M15.8 8.5a5 5 0 0 1 0 7M18.4 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    music: svg('<path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8" fill="currentColor"/><circle cx="16.5" cy="16" r="2.8" fill="currentColor"/>'),
    vibro: svg('<rect x="8" y="3" width="8" height="18" rx="2" fill="currentColor"/><path d="M4.6 8v8M2 10v4M19.4 8v8M22 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
    shake: svg('<rect x="7.5" y="5" width="9" height="14" rx="2" fill="currentColor" transform="rotate(-12 12 12)"/><path d="M4 8.5c-1.3 2.3-1.3 4.7 0 7M20 8.5c1.3 2.3 1.3 4.7 0 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
    globe: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" stroke-width="1.6"/>'),
    num: svg('<path d="M4 8h3v9M10 9.5a2.5 2.5 0 0 1 5 0c0 2.5-5 4-5 7.5h5.4M17.5 8h3.3l-2 3a2.6 2.6 0 1 1-1.8 4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
    user: svg('<circle cx="12" cy="8" r="4.2" fill="currentColor"/><path d="M4 20.5a8 8 0 0 1 16 0z" fill="currentColor"/>'),
    trophy: svg('<path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" fill="none" stroke="#FFD447" stroke-width="1.9"/><path d="M7 3h10v5.5a5 5 0 0 1-10 0z" fill="#FFD447"/><rect x="10.6" y="13" width="2.8" height="4" fill="#E2A300"/><rect x="7.5" y="16.6" width="9" height="3.6" rx="1.1" fill="#FFD447"/>'),
    cart: svg('<path d="M3 7h18l-2.4 8.5H5.4z" fill="#8A5A30" stroke="#4A2A14" stroke-width="1.3" stroke-linejoin="round"/><circle cx="8" cy="18.5" r="2" fill="#333"/><circle cx="16" cy="18.5" r="2" fill="#333"/><circle cx="8" cy="5.5" r="2.2" fill="#FFD447"/><circle cx="12.5" cy="4.6" r="2.2" fill="#E8344E"/><circle cx="16.5" cy="5.6" r="2" fill="#4FD1F0"/>'),
    hand: svg('<path d="M9.2 2.8c1 0 1.8.8 1.8 1.8v6.3l.6-.1V8.6c0-1 .8-1.7 1.7-1.7s1.7.8 1.7 1.7v1.9l.5-.1c0-1 .8-1.6 1.7-1.6s1.6.8 1.6 1.7v1.4c.2-.1.5-.1.7-.1.9 0 1.6.7 1.6 1.6v4c0 3.4-2.6 5.8-6 5.8h-1.5c-2 0-3.6-.9-4.7-2.5l-3.6-5.2c-.5-.8-.3-1.8.4-2.3.7-.5 1.7-.4 2.3.3l1.6 1.9V4.6c0-1 .8-1.8 1.8-1.8z" fill="#fff" stroke="#333" stroke-width="1.2" stroke-linejoin="round"/>'),
    drill: svg('<rect x="6" y="2.5" width="12" height="6" rx="2" fill="#F2B632" stroke="#9A6A0E" stroke-width="1.1"/><rect x="7.5" y="8.3" width="9" height="3.6" fill="#E8434F"/><path d="M7 11.8h10L12 22z" fill="#B8C2CF" stroke="#5E6A7A" stroke-width="1.1" stroke-linejoin="round"/><path d="M8.6 14.5l6 2M9.8 17.3l3.8 1.2" stroke="#5E6A7A" stroke-width="1.3"/>'),
    engine: svg('<rect x="3.5" y="8" width="13" height="10" rx="2" fill="#7C8798" stroke="#3E4652" stroke-width="1.2"/><rect x="6" y="4.5" width="8" height="3.6" rx="1" fill="#5A6472"/><path d="M16.5 11h3v4h-3" fill="#5A6472" stroke="#3E4652" stroke-width="1.2"/><path d="M11 9.6l-3 4.2h2.6l-1 3.4 3.6-4.6h-2.6z" fill="#FFD447"/>'),
    sorter: svg('<path d="M3 4h18l-6.5 8v6.5l-5 2V12z" fill="#3A8DFF" stroke="#1F5FB0" stroke-width="1.2" stroke-linejoin="round"/><circle cx="8" cy="7" r="1.6" fill="#FFD447"/><circle cx="12.5" cy="6.4" r="1.6" fill="#E8344E"/><circle cx="16.5" cy="7" r="1.5" fill="#4FD1F0"/>'),
    grip: svg('<path d="M6 10.5V8.2a1.6 1.6 0 0 1 3.2 0V7a1.6 1.6 0 0 1 3.2 0v.5a1.6 1.6 0 0 1 3.2 0v1a1.6 1.6 0 0 1 3.2 0v5.8c0 4-2.6 6.7-6.4 6.7h-.6C8.4 21 6 18.6 6 15.2z" fill="#F2B98A" stroke="#9A6440" stroke-width="1.2"/><path d="M6 12.5c1.8-.8 3.4-.4 4.2 1" stroke="#9A6440" stroke-width="1.2" fill="none"/><rect x="5" y="9.5" width="3.4" height="5" rx="1.4" fill="#F2B98A" stroke="#9A6440" stroke-width="1.2"/>'),
    storage: svg('<rect x="3" y="6" width="18" height="14" rx="1.6" fill="#B07A45" stroke="#6E4520" stroke-width="1.3"/><path d="M3 10.5h18M3 15.5h18" stroke="#6E4520" stroke-width="1.2"/><path d="M5 6l3-3h8l3 3" fill="#C98D55" stroke="#6E4520" stroke-width="1.2" stroke-linejoin="round"/><rect x="10" y="9" width="4" height="3" rx=".6" fill="#FFD447"/>'),
    boom: svg('<path d="M12 2l1.8 5.2L19 4.6l-2.2 5.2 5.2 2.2-5.2 1.8 2.6 5.2-5.2-2.2L12 22l-1.8-5.2L5 19.4l2.2-5.2L2 12l5.2-1.8L4.6 5l5.2 2.2z" fill="#FFB347" stroke="#C26A0C" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="4" fill="#FFF2A8"/>'),
    flagRu: svg('<rect width="30" height="20" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#1C57D8"/><rect y="13.33" width="30" height="6.67" fill="#E3262E"/>', '0 0 30 20'),
    flagEn: svg('<clipPath id="icuk"><rect width="60" height="30"/></clipPath><g clip-path="url(#icuk)"><rect width="60" height="30" fill="#012169"/><path d="M0 0L60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" stroke-width="2.4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g>', '0 0 60 30'),
  };
  for (const k of ['coin', 'gem', 'shard', 'gear', 'gift', 'tasks', 'geode', 'geodeOpen', 'bolt', 'video', 'check', 'close', 'up', 'planet', 'bag',
    'sound', 'music', 'vibro', 'shake', 'globe', 'num', 'user', 'trophy', 'cart', 'hand', 'drill', 'engine', 'sorter', 'grip', 'storage', 'boom', 'fire', 'relic']) IC[k] = G.Pix.icon(k);
  const CUR = { coins: IC.coin, gems: IC.gem };
  const spriteURL = {};
  function spriteImg(key, canvas, cls) {
    if (!spriteURL[key]) spriteURL[key] = canvas.toDataURL();
    return `<img class="${cls || 'spr'}" src="${spriteURL[key]}" alt="">`;
  }

  // ---------- dom helpers ----------
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  function btn(html, cls, onClick) {
    const b = h('button', { class: 'btn interactive ' + (cls || ''), type: 'button' });
    b.innerHTML = html;
    b.addEventListener('pointerdown', () => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
    b.addEventListener('click', e => {
      if (b.disabled) return;
      sfx('button');
      onClick && onClick(e, b);
    });
    return b;
  }
  const lbl = s => `<span class="lbl">${s}</span>`;
  const amt = (n, cur, dec) => `<span class="amt">${CUR[cur] || ''}<b>${typeof n === 'number' ? fmt(n, dec) : n}</b></span>`;
  function setHTML(el, s) { if (el._h !== s) { el._h = s; el.innerHTML = s; } }
  function setText(el, s) { if (el._t !== s) { el._t = s; el.textContent = s; } }
  function toggle(el, cls, on) { if (el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on); }

  function fitText(scope) {
    requestAnimationFrame(() => {
      scope.querySelectorAll('.lbl').forEach(el => {
        el.style.fontSize = '';
        el.style.whiteSpace = 'nowrap';
        const base = parseFloat(getComputedStyle(el).fontSize);
        let s = base;
        while (el.scrollWidth > el.clientWidth + 1 && s > base * 0.7) { s -= 1; el.style.fontSize = s + 'px'; }
        if (el.scrollWidth > el.clientWidth + 1) el.style.whiteSpace = 'normal';
      });
    });
  }

  let root, app, toastWrap;
  const E = {};
  let zoom = 1;
  const Z = v => v / zoom;

  // big screens: scale the whole HTML layer; the game area keeps its aspect within 1:2..2:1
  function applyScale() {
    const W = innerWidth, H = innerHeight;
    const k = W >= H ? Math.min(W / 1180, H / 680) : Math.min(W / 430, H / 900);
    zoom = Math.max(1, Math.min(2, k));
    root.style.zoom = zoom === 1 ? '' : String(zoom);
    if (app) { app.style.maxWidth = Z(2 * H) + 'px'; app.style.maxHeight = Z(2 * W) + 'px'; }
  }
  addEventListener('resize', () => root && applyScale());
  const stack = [];
  let pauseCount = 0;
  let tab = 'up';
  let tipListener = false;
  let adBusy = false;

  // ---------- modals ----------
  function setPauseCount(d) {
    pauseCount = Math.max(0, pauseCount + d);
    Platform.menuPause(pauseCount > 0);
  }

  function modal({ title, cls, body, buttons, closable = false, onClose, pause = true }) {
    const panel = h('div', { class: 'panel ' + (cls || '') });
    const ov = h('div', { class: 'overlay interactive' }, panel);
    const m = { el: ov, panel, closed: false, closable };
    if (closable) panel.append(btn(IC.close, 'icon xbtn gray', () => m.close()));
    if (title) panel.append(h('div', { class: 'ptitle' }, title));
    const sc = h('div', { class: 'pscroll scroll' });
    if (body) sc.append(...[].concat(body).filter(Boolean));
    panel.append(sc);
    if (buttons && buttons.length) panel.append(h('div', { class: 'pbtns' }, buttons.filter(Boolean)));
    root.append(ov);
    stack.push(m);
    if (pause) setPauseCount(1);
    m.close = silent => {
      if (m.closed) return;
      m.closed = true;
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 160);
      const i = stack.indexOf(m);
      if (i >= 0) stack.splice(i, 1);
      if (pause) setPauseCount(-1);
      if (!silent && onClose) onClose();
    };
    m.lock = (on = true) => panel.querySelectorAll('button').forEach(b => { b.disabled = on; });
    fitText(panel);
    return m;
  }
  const top = () => stack[stack.length - 1];
  const anyModal = () => stack.length > 0;

  // at most two toasts on screen; the rest wait their turn instead of piling up
  const toastQ = [];
  function toast(html) {
    if (toastQ.includes(html)) return;
    toastQ.push(html);
    pumpToasts();
  }
  function pumpToasts() {
    while (toastWrap && toastWrap.children.length < 2 && toastQ.length) {
      const el = h('div', { class: 'toast', html: toastQ.shift() });
      toastWrap.append(el);
      setTimeout(() => el.classList.add('out'), 2000);
      setTimeout(() => { el.remove(); pumpToasts(); }, 2300);
    }
  }

  function hudTarget(kind) {
    const el = kind === 'gems' ? E.pGems : E.pCoins;
    if (!el) return null;
    const ic = el.querySelector('.ic') || el;
    const r = ic.getBoundingClientRect();
    return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  }
  function bump(kind) {
    const el = kind === 'gems' ? E.pGems : E.pCoins;
    if (!el) return;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
  function flyFromScene(kind, n) {
    const r = E.scene && E.scene.getBoundingClientRect();
    if (r) G.Render.flyTo(kind, r.left + r.width / 2, r.top + r.height / 2, n);
  }

  async function withAd(type) {
    if (adBusy) return false;
    adBusy = true;
    const bl = h('div', { class: 'blocker interactive' }, h('i'));
    root.append(bl);
    let ok = false;
    try { ok = type === 'rewarded' ? await Platform.showRewarded() : await Platform.showInterstitial(); }
    catch (e) { ok = false; }
    finally { bl.remove(); adBusy = false; }
    if (type === 'rewarded' && !ok) toast(t('ad.fail'));
    return ok;
  }
  function adBtn(text, onReward, getModal) {
    if (!Platform.adsOk) return null;
    const b = btn(IC.video + lbl(text), 'ad adbtn', async () => {
      const m = getModal && getModal();
      m && m.lock(true);
      const ok = await withAd('rewarded');
      m && !m.closed && m.lock(false);
      if (ok) onReward();
    });
    return b;
  }
  function interstitial() { if (!anyModal() && !G.Render.busy()) withAd('midgame'); }

  function gotGems(n) { toast(IC.gem + `<span>${t('got.gems', { n })}</span>`); flyFromScene('gems', Math.min(8, n + 2)); }
  function gotCoins(n) { toast(IC.coin + `<span>${t('got.coins', { n: fmt(n) })}</span>`); flyFromScene('coins', 10); }
  function gotList(list) {
    for (const r of list) {
      if (r.gems) gotGems(r.gems);
      if (r.coins) gotCoins(r.coins);
      if (r.turbo) toast(IC.bolt + `<span>${t('got.turbo', { n: r.turbo })}</span>`);
    }
    sfx('reward');
  }

  function goalBlock() {
    const g = G.Retention.nextGoal();
    if (!g) return null;
    return h('div', { class: 'goal' },
      h('div', { class: 'gl' }, t('goal.label')),
      h('div', { class: 'gt' }, g.text),
      h('div', { class: 'gbar', html: `<i style="width:${Math.round(g.pct * 100)}%"></i>` }));
  }

  // ---------- build ----------
  function build() {
    root = document.getElementById('ui');
    root.innerHTML = '';
    app = h('div', { id: 'app' });
    root.append(app);
    applyScale();

    E.coins = h('b'); E.rate = h('small');
    E.gems = h('b'); E.shards = h('b');
    E.hud = h('div', { id: 'hud' },
      E.pCoins = h('div', { class: 'pill coins', html: IC.coin }, h('div', { class: 'pv' }, E.coins, E.rate)),
      E.pGems = h('div', { class: 'pill gems', html: IC.gem }, E.gems),
      h('div', { class: 'pill shards', html: IC.shard }, E.shards));
    app.append(E.hud);

    E.scene = h('div', { id: 'sceneBox' });
    E.depthB = h('b'); E.layerN = h('span'); E.planetN = h('em');
    E.vein = h('div', { class: 'strip vein' });
    E.wknd = h('div', { class: 'strip wknd' });
    E.left = h('div', { class: 'scleft' });
    E.questT = h('span'); E.questBar = h('i');
    E.quest = h('button', { class: 'strip quest interactive', type: 'button', onclick: () => { sfx('button'); setTab('goals'); } },
      h('span', { class: 'qic', html: IC.trophy }), E.questT, h('span', { class: 'qbar' }, E.questBar));
    E.scene.append(h('div', { class: 'sctop' }, h('div', { class: 'depthlbl' }, E.depthB, E.layerN, E.planetN), E.quest, E.vein, E.wknd, E.left));
    E.bDaily = btn(IC.gift, 'gray', () => showDaily());
    E.bTasks = btn(IC.tasks, 'gray', () => showTasks());
    E.geodeT = h('small');
    E.bGeode = btn(IC.geode, 'gray', () => showGeode());
    E.bGeode.append(E.geodeT);
    E.dDaily = h('span', { class: 'dot' }); E.bDaily.append(E.dDaily);
    E.dTasks = h('span', { class: 'dot' }); E.bTasks.append(E.dTasks);
    E.left.append(E.bDaily, E.bTasks, E.bGeode);

    E.hpI = h('i'); E.hpT = h('span');
    E.ringFg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    E.ringT = h('b');
    const ring = h('div', { class: 'tring', html: '<svg viewBox="0 0 36 36"><circle class="rbg" cx="18" cy="18" r="15"/></svg>' });
    ring.firstChild.append(E.ringFg);
    E.ringFg.setAttribute('class', 'rfg'); E.ringFg.setAttribute('cx', 18); E.ringFg.setAttribute('cy', 18); E.ringFg.setAttribute('r', 15);
    E.ringFg.setAttribute('stroke-dasharray', String(2 * Math.PI * 15));
    ring.append(E.ringT);
    E.pHint = h('div', { class: 'phint' });
    E.plate = h('div', { class: 'platebox' }, h('div', { class: 'prow' }, h('div', { class: 'hpbar' }, E.hpI, E.hpT), ring), E.pHint);
    E.scene.append(E.plate);

    E.core = h('div', { class: 'corebox' },
      btn(IC.boom + lbl(t('core.btn')), 'big orange', () => confirmCore()),
      h('div', { class: 'phint' }, t('core.hint')));
    E.scene.append(E.core);
    E.banner = h('div', { class: 'lbanner' });
    E.scene.append(E.banner);
    app.append(E.scene);

    E.turbo = btn(IC.bolt + lbl(t('turbo')), 'turbob', () => showTurbo());
    E.seg = h('div', { class: 'seg' });
    E.segBtns = [1, 10, 'max'].map(m => {
      const b = btn(m === 'max' ? t('buyMax') : '×' + m, '', () => { S().buyMode = m; G.Save.save(); updateSeg(); refreshUpgrades(true); });
      b._m = m; E.seg.append(b); return b;
    });
    E.ctrl = h('div', { id: 'ctrl' }, E.turbo, E.seg);
    app.append(E.ctrl);

    E.body = h('div', { id: 'body', class: 'scroll interactive' });
    app.append(E.body);

    E.tabs = h('div', { id: 'tabs' });
    E.tabBtns = {
      up: btn(IC.up + lbl(t('tab.up')), '', () => setTab('up')),
      goals: btn(IC.trophy + lbl(t('tab.goals')), '', () => setTab('goals')),
      planet: btn(IC.planet + lbl(t('tab.planet')), '', () => setTab('planet')),
      shop: btn(IC.bag + lbl(t('tab.shop')), '', () => setTab('shop')),
    };
    E.dGoals = h('span', { class: 'dot' }); E.tabBtns.goals.append(E.dGoals);
    E.dShop = h('span', { class: 'dot' }); E.tabBtns.shop.append(E.dShop);
    E.tabs.append(E.tabBtns.up, E.tabBtns.goals, E.tabBtns.planet, E.tabBtns.shop, btn(IC.gear, 'gear', () => showSettings()));
    E.tip = h('div', { class: 'utip' });
    root.append(E.tip);
    if (!tipListener) {
      tipListener = true;
      document.addEventListener('pointerdown', e => {
        if (tipFor && e.pointerType !== 'mouse' && !e.target.closest('.urow') && !e.target.closest('.utip')) hideTip();
      }, true);
    }
    app.append(E.tabs);

    toastWrap = h('div', { class: 'toasts' });
    E.scene.append(toastWrap);

    updateSeg();
    setTab(tab, true);
    fitText(app);
    Platform.onAds(() => {
      document.querySelectorAll('.adbtn').forEach(b => b.remove());
      toast(t('ads.off'));
      if (tab === 'shop') renderShop();
    });
  }

  function updateSeg() { E.segBtns.forEach(b => toggle(b, 'on', b._m === S().buyMode)); }

  function setTab(name, force) {
    if (tab === name && !force) return;
    tab = name;
    for (const k in E.tabBtns) toggle(E.tabBtns[k], 'on', k === name);
    E.body.innerHTML = '';
    E.body.scrollTop = 0;
    E.pane = h('div', { class: 'tabpane' });
    E.body.append(E.pane);
    sig = '';
    hideTip();
    if (name === 'up') buildUpgrades();
    else if (name === 'goals') renderGoals();
    else if (name === 'planet') renderPlanet();
    else renderShop();
    fitText(E.pane);
  }

  // ---------- upgrade tooltips (hover on desktop, tap on the icon on touch) ----------
  let tipFor = null;
  function tipHtml(id) {
    const s = S(), L = s.lv[id];
    const n = id === 'storage' ? 1 : Math.max(1, G.Game.buyCount(id));
    const val = lv => {
      if (id === 'drill') return t('eff.drill', { v: fmt(G.basePower(lv) * (1 + 0.25 * s.lv.engine) * G.shardMul(s.shards), true) });
      if (id === 'engine') return t('eff.engine', { v: (1 + 0.25 * lv).toFixed(2) });
      if (id === 'sorter') return t('eff.sorter', { v: (1 + 0.2 * lv).toFixed(1) });
      if (id === 'grip') return t('eff.grip', { v: (1 + 0.1 * lv).toFixed(1) });
      return t('eff.storage', { v: 2 + lv });
    };
    const nxt = id === 'storage' && L >= 10 ? null : L + n;
    const tiers = G.Pix.TIERS[id];
    const cur = G.Pix.tierOf(id, L);
    const look = cur + 1 < tiers.length ? t('tip.look', { lv: tiers[cur + 1], name: t('look.' + id + '.' + (cur + 1)) }) : t('tip.lookMax');
    return `<b>${t('up.' + id)}</b><p>${t('tip.' + id)}</p>` +
      `<div class="trow"><span>${t('tip.now')}</span><em>${val(L)}</em></div>` +
      (nxt != null ? `<div class="trow"><span>${t('tip.next')}</span><em class="up">${val(nxt)}</em></div>` : '') +
      `<div class="tlook">${IC.drill}<span>${look}</span></div>`;
  }
  function showTip(id, anchor) {
    tipFor = id;
    E.tip.innerHTML = tipHtml(id);
    E.tip.classList.add('on');
    const r = anchor.getBoundingClientRect();
    const tw = E.tip.offsetWidth * zoom, th = E.tip.offsetHeight * zoom;
    let x = r.left + r.width / 2 - tw / 2, y = r.top - th - 8;
    if (y < 8) y = r.bottom + 8;
    x = Math.max(8, Math.min(innerWidth - tw - 8, x));
    E.tip.style.left = Z(x) + 'px'; E.tip.style.top = Z(y) + 'px';
  }
  function hideTip() { tipFor = null; E.tip && E.tip.classList.remove('on'); }

  // ---------- upgrades ----------
  const UPS = ['drill', 'engine', 'sorter', 'grip', 'storage'];
  const rows = {};
  function buildUpgrades() {
    for (const id of UPS) {
      const r = {};
      r.lv = h('em'); r.name = h('span', null, t('up.' + id));
      r.eff = h('div', { class: 'ueff' });
      r.price = h('span', { class: 'lbl' }); r.sub = h('small');
      r.btn = btn('', 'ubtn' + (id === 'storage' ? ' gemb' : ''), () => {
        if (G.Game.buy(id)) { refreshUpgrades(); onBought(id); if (tipFor === id) E.tip.innerHTML = tipHtml(id); }
      });
      r.btn.append(r.price, r.sub);
      const info = h('div', { class: 'uinfo' }, h('div', { class: 'uname' }, r.name, r.lv), r.eff);
      if (id === 'drill') { r.barI = h('i'); r.bar = h('div', { class: 'ubar' }, r.barI); info.append(r.bar); }
      const icon = h('div', { class: 'uic', html: IC[id] });
      r.el = h('div', { class: 'urow interactive' }, icon, info, r.btn);
      r.el.addEventListener('click', e => {
        if (e.target.closest('.ubtn') || e.pointerType === 'mouse') return;
        if (tipFor === id) hideTip(); else showTip(id, r.el);
      });
      r.el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showTip(id, r.el); });
      r.el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideTip(); });
      rows[id] = r;
      E.pane.append(r.el);
    }
    refreshUpgrades(true);
  }

  function refreshUpgrades() {
    if (tab !== 'up') return;
    const s = S();
    const inc = G.Game.income();
    for (const id of UPS) {
      const r = rows[id]; if (!r) continue;
      const L = s.lv[id];
      setText(r.lv, t('lv', { n: L }));
      let eff;
      if (id === 'drill') eff = t('eff.drill', { v: fmt(G.Game.rawPower(false, false), true) });
      else if (id === 'engine') eff = t('eff.engine', { v: (1 + 0.25 * L).toFixed(2) });
      else if (id === 'sorter') eff = t('eff.sorter', { v: (1 + 0.2 * L).toFixed(1) });
      else if (id === 'grip') eff = t('eff.grip', { v: (1 + 0.1 * L).toFixed(1) });
      else eff = t('eff.storage', { v: 2 + L });
      setText(r.eff, eff);
      if (r.barI) {
        const left = 25 - (L % 25);
        r.barI.style.width = ((L % 25) / 25 * 100) + '%';
        setText(r.eff, eff + ' · ' + t('toX3', { n: left }));
      }
      const maxed = id === 'storage' && L >= 10;
      if (maxed) {
        setHTML(r.price, t('maxed')); setText(r.sub, '');
        r.btn.disabled = true; toggle(r.btn, 'no', true); toggle(r.btn, 'can', false);
        continue;
      }
      r.btn.disabled = false;
      const n = G.Game.buyCount(id), cost = G.Game.buyCost(id);
      const can = G.Game.canBuy(id);
      const cur = id === 'storage' ? 'gems' : 'coins';
      setHTML(r.price, amt(cost, cur));
      let sub = '';
      if (n > 1) sub = '×' + n;
      if (!can && cur === 'coins') {
        const sec = inc > 0 ? (cost - s.coins) / inc : Infinity;
        sub = sec > 99 * 3600 ? '—' : t('eta', { t: G.dur(sec) });
      }
      setText(r.sub, sub);
      toggle(r.btn, 'no', !can);
      toggle(r.btn, 'can', can);
    }
  }

  // ---------- planet tab ----------
  let sig = '';
  function renderPlanet() {
    const s = S();
    const cur = G.layerAt(s.depth);
    const key = [s.planet, cur, G.Game.atCore(), s.relics.length, s.shards, Math.floor(G.Game.totalDepth() / 100), G.lang, G.Retention.vein()].join('|');
    if (key === sig) return;
    sig = key;
    const st = E.body.scrollTop;
    const pl = G.planet(s.planet);
    E.pane.innerHTML = '';
    const pname = planetName(s.planet);
    E.pane.append(h('div', { class: 'plhead' },
      h('div', { class: 'uic', style: { width: '48px', height: '48px' }, html: IC.planet }),
      h('div', null, h('div', { class: 'pname' }, `${pname} · #${s.planet}`),
        h('div', { class: 'pmeta', html: `${IC.shard.replace('class="ic"', 'class="ic" style="display:inline;width:14px;height:14px;vertical-align:-2px"')} ${t('pl.shards', { n: `<b>${s.shards}</b>` })} · ${t('pl.bonus', { n: s.shards * 10 })}<br>${t('pl.record', { n: G.int(G.Game.totalDepth()) })}` }))));
    const vein = G.Retention.vein();
    const list = h('div', { class: 'layers' });
    for (let i = 0; i < 10; i++) {
      const col = pl.layers[i];
      const light = G.hexToRgb(col).reduce((a, v) => a + v, 0) > 520;
      const r = h('div', { class: 'lrow' + (i > cur ? ' future' : '') + (i === vein ? ' vein' : ''), style: { background: col, color: light ? '#1A1420' : '#fff' } },
        h('span', { class: 'ln' }, t('layer.' + G.LAYER_KEYS[i]) + (i === vein ? ' · ' + t('pl.vein') + ' ×3' : '')),
        i === cur ? h('span', { class: 'here' }, t('pl.here')) : null,
        h('span', { class: 'ld' }, `${G.int(G.DEPTHS[i])}–${G.int(G.DEPTHS[i + 1])} ${t('m')}`));
      if (light) r.querySelectorAll('.ln,.ld').forEach(x => { x.style.textShadow = 'none'; });
      list.append(r);
    }
    E.pane.append(h('div', { class: 'sechead' }, t('pl.layers')), list);
    const cb = btn(IC.boom + lbl(t('core.btn')), 'orange', () => confirmCore());
    cb.disabled = !G.Game.atCore();
    E.pane.append(cb);
    if (!G.Game.atCore()) E.pane.append(h('div', { class: 'note' }, t('core.need', { d: fmt(G.CORE) })));
    E.pane.append(h('div', { class: 'sechead' }, t('relic.title')));
    const nr = s.relics.length;
    E.pane.append(h('div', { class: 'note' }, t('relic.bonus', { a: nr, b: G.Pix.RELIC_COUNT, n: nr * 5 }) + ' — ' + t('relic.hint')));
    const rg = h('div', { class: 'relics' });
    for (let i = 0; i < G.Pix.RELIC_COUNT; i++) {
      const found = s.relics.includes(i);
      rg.append(h('div', { class: 'relicc' + (found ? ' on' : ''), html: spriteImg('relic' + i, G.Pix.relic(i)) +
        `<span>${found ? t('relic.' + i) : '???<br><em>' + t('relic.locked', { p: G.Pix.RELIC_REQ[i] }) + '</em>'}</span>` }));
    }
    E.pane.append(rg);
    E.pane.append(h('div', { class: 'sechead' }, t('perk.title')));
    for (const pk of G.Game.PERKS) {
      const on = s.planet >= pk.p;
      E.pane.append(h('div', { class: 'ach perk' + (on ? ' done' : ''), html: (on ? `<span class="chk">${IC.check}</span>` : IC.shard) +
        `<span class="an">${t('perk.' + pk.id)}</span><em>${t('perk.unlock', { p: pk.p })}</em>` }));
    }
    fitText(E.pane);
    E.body.scrollTop = st;
  }

  // ---------- goals tab ----------
  function questText(q) {
    return t('q.' + q.k, { n: q.k === 'earn' ? fmt(q.n) : G.int(q.n) });
  }
  function renderGoals() {
    const s = S();
    const q = G.Goals.quest();
    const dtk = G.Retention.tasksEnsure();
    const key = ['goals', q.q, q.done, Math.floor(q.p / Math.max(1, q.n) * 50), JSON.stringify(dtk.list.map(x => [x.progress, x.claimed])), dtk.chestClaimed,
      JSON.stringify(s.macro), G.Goals.MACRO.map(m => G.Goals.macroState(m).ready ? 1 : 0).join(''), Object.keys(s.ach).length, G.lang,
      Math.floor(s.stats.nodes / 5), s.stats.enemies, s.stats.cores, s.relics.length].join('|');
    if (key === sig) return;
    sig = key;
    const st = E.body.scrollTop;
    E.pane.innerHTML = '';
    // micro quest
    E.pane.append(h('div', { class: 'sechead' }, t('goals.micro')));
    const rw = G.Goals.questReward(q);
    E.pane.append(h('div', { class: 'card qcard' + (q.done ? ' done' : '') },
      h('div', { class: 'uic', html: q.done ? IC.check : IC.trophy }),
      h('div', { class: 'cinfo' },
        h('div', { class: 'cname' }, t('q.title', { n: q.q + 1 }) + ': ' + questText(q)),
        h('div', { class: 'gbar', html: `<i style="width:${Math.min(100, q.p / q.n * 100)}%"></i>` }),
        h('div', { class: 'cdesc', html: `${q.k === 'earn' ? fmt(q.p) + ' / ' + fmt(q.n) : G.int(q.p) + ' / ' + G.int(q.n)} · ${t('goals.reward')}: ${amt(rw.coins, 'coins')}${rw.gems ? ' ' + amt(rw.gems, 'gems') : ''}` }))));
    // daily tasks
    E.pane.append(h('div', { class: 'sechead' }, t('goals.daily')));
    const tl = h('div', { class: 'tlist' });
    E.pane.append(tl);
    taskRows(tl, () => { sig = ''; renderGoals(); });
    // macro goals
    E.pane.append(h('div', { class: 'sechead' }, t('goals.macro')));
    for (const m of G.Goals.MACRO) {
      const ms = G.Goals.macroState(m);
      const name = t('m.' + m.id, { n: G.int(ms.target) });
      const right = ms.maxed ? h('span', { class: 'chk', html: IC.check })
        : ms.ready ? btn(lbl(amt(ms.gems, 'gems')), 'green', () => { const g = G.Goals.claimMacro(m.id); if (g) { gotGems(g); sfx('reward'); G.Render.shake(4); sig = ''; renderGoals(); } })
          : h('span', { class: 'mrw', html: amt(ms.gems, 'gems') });
      E.pane.append(h('div', { class: 'task macro' + (ms.maxed ? ' claimed' : '') },
        h('div', { class: 'tinfo' },
          h('div', { class: 'tn' }, ms.maxed ? t('m.done') : name),
          h('div', { class: 'tb', html: `<i style="width:${ms.maxed ? 100 : Math.min(100, ms.val / ms.target * 100)}%"></i>` }),
          h('div', { class: 'tp' }, `${t('m.stage', { a: Math.min(ms.claimed + 1, m.stages.length), b: m.stages.length })} · ${G.int(Math.min(ms.val, ms.target))} / ${G.int(ms.target)}`)),
        right));
    }
    // achievements
    E.pane.append(h('div', { class: 'sechead' }, t('ach.title')));
    for (const a of G.ACH) {
      const done = !!s.ach[a.id];
      E.pane.append(h('div', { class: 'ach' + (done ? ' done' : ''), html: (done ? `<span class="chk">${IC.check}</span>` : IC.trophy) + `<span class="an">${t('ach.' + a.id)}</span>` + amt(a.gems, 'gems') }));
    }
    fitText(E.pane);
    E.body.scrollTop = st;
  }

  function planetName(p) {
    return p <= 5 ? t('planet.' + G.planet(p).key) : t('planet.n', { n: p });
  }

  // ---------- shop tab ----------
  function renderShop() {
    const s = S();
    const key = ['shop', s.gems, s.skins.active, s.skins.owned.join(','), Math.floor(s.turboLeft / 60), Platform.adsOk, G.lang, G.fmt(G.Game.incomeBase()),
      JSON.stringify(G.Pix.look(s.lv)), JSON.stringify(s.pets), JSON.stringify(s.lab), s.forge].join('|');
    if (key === sig) return;
    sig = key;
    const st = E.body.scrollTop;
    E.pane.innerHTML = '';
    crystalSections(s);
    E.pane.append(h('div', { class: 'sechead' }, t('shop.turbo')));
    E.pane.append(turboCard());
    const inst = G.Game.incomeBase() * 7200;
    const ib = btn(lbl(amt(30, 'gems')), 'gemc', () => {
      if (S().gems < 30) { toast(t('no.gems')); return; }
      S().gems -= 30; S().coins += G.Game.incomeBase() * 7200;
      G.Save.save(); gotCoins(inst); sig = ''; renderShop();
    });
    ib.disabled = s.gems < 30;
    E.pane.append(h('div', { class: 'card' }, h('div', { class: 'uic', html: IC.coin }),
      h('div', { class: 'cinfo' }, h('div', { class: 'cname' }, t('shop.instant')), h('div', { class: 'cdesc' }, t('shop.instantDesc', { n: fmt(inst) }))),
      h('div', { class: 'cbtns' }, ib)));
    E.pane.append(h('div', { class: 'sechead' }, t('shop.skins')));
    const grid = h('div', { class: 'skins' });
    for (const k of G.SKINS) {
      const owned = s.skins.owned.includes(k.id), active = s.skins.active === k.id;
      const c = h('canvas');
      G.Render.drillPreview(c, k.id, s.lv);
      let b;
      if (active) { b = btn(lbl(t('shop.equipped')), 'green'); b.disabled = true; }
      else if (owned) b = btn(lbl(t('shop.equip')), 'blue', () => { S().skins.active = k.id; G.Save.save(); sig = ''; renderShop(); });
      else {
        b = btn(lbl(amt(k.price, 'gems')), 'gemc', () => {
          const d = S();
          if (d.gems < k.price) { toast(t('no.gems')); return; }
          d.gems -= k.price; d.skins.owned.push(k.id); d.skins.active = k.id;
          G.Save.save(); sfx('reward'); toast(IC.check + `<span>${t('skin.' + k.id)}</span>`); sig = ''; renderShop();
        });
        b.disabled = s.gems < k.price;
      }
      grid.append(h('div', { class: 'skin' + (active ? ' sel' : '') }, c, h('div', { class: 'sn' }, t('skin.' + k.id)), b));
    }
    E.pane.append(grid);
    E.pane.append(h('div', { class: 'note' }, t('shop.gems')));
    if (!Platform.adsOk) E.pane.append(h('div', { class: 'note' }, t('ads.off')));
    fitText(E.pane);
    E.body.scrollTop = st;
  }

  // ---------- gem content: companions, lab, forge ----------
  function gemCard(iconHtml, name, desc, sub, cost, maxed, onBuy, label) {
    let b;
    if (maxed) { b = btn(lbl(t('maxed')), 'gray'); b.disabled = true; }
    else {
      b = btn(lbl((label ? label + ' ' : '') + amt(cost, 'gems')), 'gemc', () => {
        if (S().gems < cost) { toast(t('no.gems')); return; }
        if (onBuy()) { sfx('reward'); G.Render.flashDrill(); sig = ''; renderShop(); }
      });
      b.disabled = S().gems < cost;
    }
    return h('div', { class: 'card gemcard' }, h('div', { class: 'uic', html: iconHtml }),
      h('div', { class: 'cinfo' }, h('div', { class: 'cname' }, name), h('div', { class: 'cdesc' }, desc), sub ? h('div', { class: 'chave' }, sub) : null),
      h('div', { class: 'cbtns' }, b));
  }
  function crystalSections(s) {
    const C = G.Crystal;
    E.pane.append(h('div', { class: 'gemhead', html: IC.gem + `<b>${G.int(s.gems)}</b>` }));
    E.pane.append(h('div', { class: 'sechead' }, t('pet.title')));
    E.pane.append(h('div', { class: 'note' }, t('pet.hint')));
    const petDesc = (id, lv) => id === 'bot' ? t('pet.bot.d', { n: C.botRate(lv) }) : id === 'bat' ? t('pet.bat.d', { n: C.batEvery(lv) }) : t('pet.golem.d', { n: C.golemEvery(lv).toFixed(1) });
    for (const id of ['bot', 'bat', 'golem']) {
      const lv = C.petLv(id), max = C.PETS[id].max;
      const desc = petDesc(id, Math.max(1, lv));
      const sub = lv ? t('pet.lv', { n: lv, m: max }) + (lv < max ? ' · ' + t('pet.next', { v: petDesc(id, lv + 1) }) : '') : null;
      E.pane.append(gemCard(spriteImg('pet-' + id, G.Pix.enemy(id), 'spr ic'), t('pet.' + id), desc, sub, C.petCost(id), lv >= max,
        () => { const ok = C.buyPet(id); if (ok) toast(spriteImg('pet-' + id, G.Pix.enemy(id), 'spr ic') + `<span>${t(lv ? 'lab.got' : 'pet.got', { name: t('pet.' + id) })}</span>`); return ok; },
        lv ? '' : t('pet.hire')));
    }
    E.pane.append(h('div', { class: 'sechead' }, t('lab.title')));
    E.pane.append(h('div', { class: 'note' }, t('lab.hint')));
    const LABIC = { crit: IC.boom, luck: IC.coin, heat: IC.fire, plate: IC.drill, turbo: IC.bolt };
    const labVals = {
      crit: lv => ['' + C.critMul(lv), '' + C.critMul(lv + 1)],
      luck: lv => [Math.round((C.luckMul(lv) - 1) * 100), Math.round((C.luckMul(lv + 1) - 1) * 100)],
      heat: lv => [G.Game.OVERDRIVE, G.Game.OVERDRIVE + 1],
      plate: lv => [Math.round((C.plateMul(lv) - 1) * 100), Math.round((C.plateMul(lv + 1) - 1) * 100)],
      turbo: lv => [C.turboMul(lv).toFixed(1), C.turboMul(lv + 1).toFixed(1)],
    };
    for (const id of Object.keys(C.LAB)) {
      const lv = C.labLv(id), max = C.LAB[id].max;
      const [a, b] = labVals[id](lv);
      E.pane.append(gemCard(LABIC[id], t('lab.' + id), lv >= max ? t('lab.' + id + '.d', { a, b: a }).replace(/ → .*$/, '') : t('lab.' + id + '.d', { a, b }),
        t('pet.lv', { n: lv, m: max }), C.labCost(id), lv >= max,
        () => { const ok = C.buyLab(id); if (ok) toast(LABIC[id] + `<span>${t('lab.got', { name: t('lab.' + id) })}</span>`); return ok; }));
    }
    E.pane.append(h('div', { class: 'sechead' }, t('forge.title')));
    E.pane.append(gemCard(IC.shard, t('forge.title'), t('forge.d'), t('forge.count', { n: s.forge || 0, b: s.shards * 10 }), C.forgeCost(), false,
      () => { const ok = C.forge(); if (ok) { toast(IC.shard + `<span>${t('forge.got')}</span>`); G.Render.shake(5); } return ok; }, t('forge.buy')));
  }

  function turboCard(getModal) {
    const s = S();
    const info = h('div', { class: 'cinfo' }, h('div', { class: 'cname' }, s.turboLeft > 0 ? t('turbo.left', { t: G.clock(s.turboLeft) }) : t('turbo')), h('div', { class: 'cdesc' }, t('turbo.desc')));
    const full = s.turboLeft + 300 > 3600;
    const ab = full ? null : adBtn(t('turbo.ad'), () => { G.Game.addTurbo(300); G.Save.save(); toast(IC.bolt + `<span>${t('got.turbo', { n: 5 })}</span>`); sfx('reward'); sig = ''; if (tab === 'shop') renderShop(); refreshTurboModal(); }, getModal);
    const gb = btn(lbl(t('turbo.gems') + ' ' + amt(20, 'gems')), 'gemc', () => {
      const d = S();
      if (d.gems < 20) { toast(t('no.gems')); return; }
      if (d.turboLeft + 1800 > 3600) { toast(t('turbo.full')); return; }
      d.gems -= 20; G.Game.addTurbo(1800); G.Save.save();
      toast(IC.bolt + `<span>${t('got.turbo', { n: 30 })}</span>`); sfx('reward'); sig = ''; if (tab === 'shop') renderShop(); refreshTurboModal();
    });
    gb.disabled = s.gems < 20 || s.turboLeft + 1800 > 3600;
    const card = h('div', { class: 'card' }, h('div', { class: 'uic', html: IC.bolt }), info, h('div', { class: 'cbtns' }, ab, gb));
    if (s.turboLeft + 1800 > 3600) info.append(h('div', { class: 'cdesc' }, t('turbo.full')));
    return card;
  }

  // ---------- windows ----------
  let turboModal = null;
  function showTurbo() {
    if (anyModal()) return;
    const holder = h('div');
    turboModal = modal({ title: t('turbo'), body: holder, closable: true, onClose: () => { turboModal = null; } });
    turboModal.holder = holder;
    refreshTurboModal();
  }
  function refreshTurboModal() {
    if (!turboModal || turboModal.closed) return;
    turboModal.holder.innerHTML = '';
    turboModal.holder.append(turboCard(() => turboModal));
    fitText(turboModal.panel);
  }

  function showOffline(res, done) {
    const sec = res.sec;
    const body = [h('div', { class: 'bigval', html: IC.coin + `<span>+${fmt(res.coins)}</span>` })];
    const lines = [];
    if (res.meters > 0.5) lines.push(`+${fmt(res.meters)} ${t('m')}`);
    for (const li of res.layers) lines.push(t('off.layer', { name: t('layer.' + G.LAYER_KEYS[li]) }));
    if (res.core) lines.push(t('off.core'));
    if (lines.length) body.push(h('div', { class: 'gline' }, lines.join(' · ')));
    const gb = goalBlock(); if (gb) body.push(gb);
    let m;
    const collect = mul => {
      S().coins += res.coins * mul;
      G.Save.save();
      gotCoins(res.coins * mul); sfx('reward');
      m.close();
    };
    m = modal({
      title: t('off.title', { t: G.dur(sec) }), body,
      buttons: [adBtn(t('off.ad'), () => collect(2), () => m), btn(lbl(t('off.collect')), 'green', () => collect(1))],
      onClose: done,
    });
  }

  function showCart() {
    const inc = G.Game.incomeBase();
    let m;
    const take = ad => { const c = G.Game.cartReward(ad); gotCoins(c); sfx('reward'); m.close(); };
    m = modal({
      title: t('cart.title'),
      body: [h('div', { class: 'bigicon', html: IC.cart }), h('div', { class: 'ptext' }, t('cart.text'))],
      buttons: [adBtn(t('cart.ad') + ' ' + amt(inc * 300, 'coins'), () => take(true), () => m), btn(lbl(t('cart.free') + ' ' + amt(inc * 30, 'coins')), 'green', () => take(false))],
    });
  }

  function rewardHtml(r) {
    if (r.gems) return `<span class="ri">${IC.gem}${r.gems}</span>`;
    if (r.incomeMin) return `<span class="ri">${IC.coin}${t('rw.income', { n: r.incomeMin })}</span>`;
    return `<span class="ri">${IC.bolt}${t('rw.turbo', { n: r.turboMin })}</span>`;
  }

  function showDaily(done) {
    if (anyModal()) { done && done(); return; }
    const R = G.Retention;
    const avail = R.dailyAvailable();
    const cur = R.dailyNextDay();
    const grid = h('div', { class: 'dgrid' });
    G.DAILY.forEach((r, i) => {
      const d = i + 1;
      const cls = 'dcard' + (d === 7 ? ' d7' : '') + (avail && d === cur ? ' cur' : '') + ((avail ? d < cur : d <= cur) ? ' done' : '');
      grid.append(h('div', { class: cls, html: `<div class="dday">${t('daily.day', { n: d })}</div>${rewardHtml(r)}` }));
    });
    const body = [grid];
    let m;
    const claim = mul => { const out = R.claimDaily(mul); if (out) gotList(out); m.close(); };
    const buttons = avail
      ? [adBtn(t('daily.ad'), () => claim(2), () => m), btn(lbl(t('daily.claim')), 'green', () => claim(1))]
      : [];
    if (!avail) body.push(h('div', { class: 'ptext' }, t('daily.next', { t: G.dur(R.secToNextDay()) })));
    m = modal({ title: t('daily.title'), cls: 'wide', body, buttons, closable: true, onClose: done });
  }

  let geodeModal = null;
  function showGeode() {
    if (anyModal()) return;
    const R = G.Retention;
    const ready = R.geodeReady();
    const body = [h('div', { class: 'bigicon' + (ready ? ' shake' : ''), html: ready ? IC.geodeOpen : IC.geode })];
    const g = S().geode;
    let m;
    if (ready) body.push(h('div', { class: 'ptext' }, t('geode.ready')));
    else {
      body.push(h('div', { class: 'timer' }, G.clock(R.geodeLeft())));
      body.push(h('div', { class: 'ptext' }, t('geode.desc')));
      body.push(h('div', { class: 'ptext' }, t('geode.skips', { n: 3 - g.adSkips })));
    }
    const skip = () => { if (R.geodeSkip()) { sfx('reward'); m.close(); showGeode(); } };
    const buttons = [];
    if (ready) buttons.push(btn(lbl(t('geode.open')), 'green', () => {
      const out = R.geodeOpen(); if (out) { gotList([{ coins: out.coins }, { gems: out.gems }]); G.Render.shake(6); sfx('break'); }
      m.close(); G.Game.checkAch();
    }));
    else if (g.adSkips < 3) {
      buttons.push(adBtn(t('geode.ad'), skip, () => m));
      const gb = btn(lbl(t('geode.gems') + ' ' + amt(5, 'gems')), 'gemc', () => {
        if (S().gems < 5) { toast(t('no.gems')); return; }
        S().gems -= 5; skip();
      });
      gb.disabled = S().gems < 5;
      buttons.push(gb);
    }
    m = modal({ title: t('geode.title'), body, buttons, closable: true, onClose: () => { geodeModal = null; } });
    m.timer = body.find(b => b.className === 'timer');
    geodeModal = m;
  }

  let tasksModal = null;
  function showTasks() {
    if (anyModal()) return;
    tasksModal = modal({ title: t('tasks.title'), body: h('div', { class: 'tlist' }), closable: true, onClose: () => { tasksModal = null; } });
    renderTasks();
  }
  function taskRows(list, rerender) {
    const R = G.Retention;
    const dt = R.tasksEnsure();
    list.innerHTML = '';
    dt.list.forEach((tk, i) => {
      const name = t('task.' + tk.tpl, { n: tk.n });
      const b = tk.claimed ? h('span', { class: 'chk', html: IC.check, style: { color: '#3CC66B', width: '32px' } })
        : btn(lbl(amt(3, 'gems')), tk.done ? 'green' : 'gray', () => { if (R.claimTask(i)) { gotGems(3); sfx('reward'); rerender(); } });
      if (b.tagName === 'BUTTON') b.disabled = !tk.done;
      list.append(h('div', { class: 'task' + (tk.claimed ? ' claimed' : '') },
        h('div', { class: 'tinfo' }, h('div', { class: 'tn' }, name), h('div', { class: 'tb', html: `<i style="width:${tk.progress / tk.n * 100}%"></i>` }), h('div', { class: 'tp' }, `${fmt(tk.progress)} / ${fmt(tk.n)}`)), b));
    });
    const chestDone = dt.chestClaimed;
    const cb = chestDone ? h('span', { class: 'chk', html: IC.check, style: { color: '#3CC66B', width: '32px' } })
      : btn(lbl(amt(10, 'gems')), R.chestReady() ? 'green' : 'gray', () => { if (R.claimChest()) { gotGems(10); sfx('reward'); G.Render.shake(4); rerender(); } });
    if (cb.tagName === 'BUTTON') cb.disabled = !R.chestReady();
    list.append(h('div', { class: 'task' + (chestDone ? ' claimed' : '') }, h('div', { class: 'uic', html: IC.gift, style: { width: '36px', height: '36px' } }),
      h('div', { class: 'tinfo' }, h('div', { class: 'tn' }, t('tasks.chest'))), cb));
    list.append(h('div', { class: 'note' }, t('tasks.reset', { t: G.dur(R.secToNextDay()) })));
  }
  function renderTasks() {
    if (!tasksModal || tasksModal.closed) return;
    taskRows(tasksModal.panel.querySelector('.tlist'), renderTasks);
    fitText(tasksModal.panel);
  }

  function confirmCore() {
    if (anyModal() || !G.Game.atCore() || G.Render.busy()) return;
    const pv = G.Game.prestigePreview();
    const s = S();
    const row = (label, a, b) => h('div', { class: 'cmp' }, h('span', null, label), h('em', null, a), h('i', { html: '&#9654;' }), h('b', null, b));
    const body = [
      h('div', { class: 'bigval', html: IC.shard + `<span>+${pv.add}</span>` }),
      h('div', { class: 'cmps' },
        row(t('pre.shards'), G.int(pv.shardsNow), G.int(pv.shardsAfter)),
        row(t('pre.mul'), '×' + pv.mulNow.toFixed(1), '×' + pv.mulAfter.toFixed(1)),
        row(t('pre.planet'), '#' + s.planet, '#' + pv.planet),
        pv.startDrill > 1 ? row(t('pre.start'), t('lv', { n: 1 }), t('lv', { n: pv.startDrill })) : null),
    ];
    if (pv.perk) body.push(h('div', { class: 'newperk', html: IC.shard + `<span>${t('perk.new', { name: t('perk.' + pv.perk.id) })}</span>` }));
    if (s.planetStart) body.push(h('div', { class: 'ptext small' }, t('pre.run', { t: G.dur((Platform.now() - s.planetStart) / 1000) })));
    body.push(h('div', { class: 'ptext small' }, t('pre.lose')));
    let m;
    m = modal({
      title: t('core.title'), body,
      buttons: [btn(lbl(t('core.go')), 'orange', () => { m.close(); explode(); }), btn(lbl(t('later')), 'gray', () => m.close())],
      closable: true,
    });
  }

  function explode() {
    if (!G.Game.explode()) return;
    sfx('boom');
    G.Render.shake(14);
    Platform.happytime();
    try { if (S().settings.vibro && navigator.vibrate) navigator.vibrate([60, 40, 120]); } catch (e) {}
    E.core.classList.remove('on');
    G.Render.boom(async () => {
      await withAd('midgame');
      showArrive();
    });
  }

  function showArrive() {
    const s = S();
    const pk = G.Game.perkAt(s.planet);
    const body = [h('div', { class: 'bigval', html: IC.planet + `<span>#${s.planet}</span>` }), h('div', { class: 'ptext' }, t('arrive.text', { s: s.shards, b: s.shards * 10 }))];
    if (pk) body.push(h('div', { class: 'newperk', html: IC.shard + `<span>${t('arrive.perk', { name: t('perk.' + pk.id) })}</span>` }));
    if (s.lastRun && s.lastRun.sec) body.push(h('div', { class: 'ptext small' }, t('arrive.run', { p: s.lastRun.p, t: G.dur(s.lastRun.sec) })));
    body.push(goalBlock());
    let m;
    m = modal({
      title: t('arrive.title', { name: planetName(s.planet) }),
      body,
      buttons: [btn(lbl(t('arrive.go')), 'green', () => m.close())],
    });
    sfx('layer');
  }

  function showSettings(title) {
    if (anyModal()) { if (top().settings) top().close(); return; }
    const s = S().settings;
    const tog = (key, ic, onChange) => {
      const b = btn('<i></i>', 'tog' + (s[key] ? ' on' : ''), () => { s[key] = !s[key]; toggle(b, 'on', s[key]); G.Save.save(); onChange && onChange(); });
      return h('div', { class: 'srow' }, h('span', { class: 'sic', html: IC[ic] }), h('span', { class: 'sname' }, t(key)), b);
    };
    const langs = h('div', { class: 'opts' },
      ...[['en', IC.flagEn, 'EN'], ['ru', IC.flagRu, 'RU']].map(([l, f, n]) => btn(f + n, 'flag' + (G.lang === l ? ' on' : ''), () => {
        s.lang = l; G.Save.save(); G.setLang(l); m.close(true); rebuild(); showSettings(title);
      })));
    const nota = h('div', { class: 'opts' },
      ...[['letters', '1.2K'], ['sci', '1.2e3']].map(([v, n]) => btn(n, s.notation === v ? 'on' : '', () => { s.notation = v; G.Save.save(); m.close(true); showSettings(title); })));
    const rowsEl = h('div', { class: 'srows' },
      tog('sound', 'sound', () => G.Audio.apply()), tog('music', 'music', () => G.Audio.apply()),
      tog('vibro', 'vibro'), tog('shake', 'shake'),
      h('div', { class: 'srow' }, h('span', { class: 'sic', html: IC.globe }), h('span', { class: 'sname' }, t('lang')), langs),
      h('div', { class: 'srow' }, h('span', { class: 'sic', html: IC.num }), h('span', { class: 'sname' }, t('notation')), nota));
    const body = [rowsEl];
    if (Platform.info.accounts) {
      const acct = h('div', { class: 'acct' });
      body.push(acct);
      Platform.getUser().then(u => {
        if (u) acct.append(h('div', { class: 'gline', html: IC.user + `<span>${t('login.as', { name: escapeHtml(u.username || '') })}</span>` }));
        else {
          acct.append(h('div', { class: 'ptext' }, t('login.desc')));
          acct.append(btn(IC.user + lbl(t('login.btn')), 'blue', async () => { await Platform.askAuth(); }));
        }
        fitText(acct);
      });
    }
    body.push(h('div', { class: 'keys' }, t('pause.keys')));
    let m;
    m = modal({ title: title || t('settings'), body, buttons: [btn(lbl(t('resume')), 'green', () => m.close())], closable: true });
    m.settings = true;
  }
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function rebuild() {
    document.title = t('title');
    Tut.clear();
    build();
    G.Render.setScene(E.scene);
  }

  // ---------- events from game ----------
  let bannerT = 0;
  function layerBanner(ni, gems) {
    E.banner.innerHTML = '';
    E.banner.classList.remove('warn');
    E.banner.append(h('div', null, t('newLayer', { name: t('layer.' + G.LAYER_KEYS[ni]) })));
    if (gems) E.banner.append(h('small', { html: `+${gems} ${IC.gem}` }));
    E.banner.classList.remove('on'); void E.banner.offsetWidth; E.banner.classList.add('on');
    bannerT = 1.5;
  }
  function coreReached() { G.Render.shake(6); }
  function milestone() { toast(IC.drill + `<span>${t('up.drill')} ×3!</span>`); G.Render.shake(4); }
  function achievement(a) {
    toast(IC.trophy + `<span>${t('ach.toast', { name: t('ach.' + a.id) })}</span>` + amt(a.gems, 'gems'));
    sfx('reward');
    sig = '';
  }
  function taskDone(tk) {
    toast(IC.tasks + `<span>${t('task.' + tk.tpl, { n: tk.n })}</span>` + IC.check);
    sfx('coin');
  }
  function questDone(q, r) {
    toast(IC.trophy + `<span>${t('q.done')}</span>` + amt(r.coins, 'coins') + (r.gems ? amt(r.gems, 'gems') : ''));
    sfx('reward');
    E.quest.classList.remove('pulse'); void E.quest.offsetWidth; E.quest.classList.add('pulse');
    sig = '';
  }
  function questNew() { sig = ''; }
  function enemyAppeared(type) {
    E.banner.innerHTML = '';
    E.banner.append(h('div', null, t('en.' + type)));
    E.banner.classList.add('warn');
    E.banner.classList.remove('on'); void E.banner.offsetWidth; E.banner.classList.add('on');
    bannerT = 2.6;
    G.Render.shake(4);
  }
  function enemyGone(e) {
    if (e.type === 'mole' && e.stolen > 0) toast(G.Pix.icon('coin') + `<span>${t('en.gone.mole', { n: fmt(e.stolen) })}</span>`);
    else if (e.type !== 'mole') toast(`<span>${t('en.gone.other')}</span>`);
  }
  function lookUpgraded(id, tier) {
    toast(IC.drill + `<span>${t('look.up', { name: t('look.' + id + '.' + tier) })}</span>`);
    sig = '';
  }
  function overdrive(on) { if (on) toast(IC.fire + `<span>${t('od.on')}</span>`); }
  function relicFound(i) {
    toast(spriteImg('relic' + i, G.Pix.relic(i), 'spr ic') + `<span>${t('relic.toast', { name: t('relic.' + i) })}</span>`);
    sfx('reward');
    sig = '';
  }
  function cartAppeared() { Tut.cart(); }
  function plateAppeared() { Tut.plate(); }
  function tapped() { Tut.tapped(); }
  function onBought(id) { Tut.bought(id); }

  // ---------- tutorial ----------
  const Tut = (() => {
    let el = null, hand = null, cur = null, until = 0, taps = 0;
    const seen = k => !!S().seenTips[k];
    const mark = k => { S().seenTips[k] = true; G.Save.save(); };
    function clear() { el && el.remove(); hand && hand.remove(); el = hand = null; cur = null; }
    function show(key, text, x, y, opts = {}) {
      clear();
      cur = key;
      until = opts.dur ? performance.now() + opts.dur : 0;
      el = h('div', { class: 'tip', style: { left: Z(x) + 'px', top: Z(y) + 'px' } }, h('div', { class: 'tt' }, text));
      if (opts.skip) el.append(btn(lbl(t('tut.skip')), 'gray', () => { mark(key); clear(); }));
      root.append(el);
      if (opts.hand) {
        hand = h('div', { class: 'hand', html: IC.hand, style: { left: Z(opts.hand[0]) + 'px', top: Z(opts.hand[1]) + 'px' } });
        root.append(hand);
      }
    }
    function sceneRect() { return E.scene.getBoundingClientRect(); }
    const r0 = sceneRect;
    function tick() {
      if (until && performance.now() > until) { mark(cur); clear(); }
      if (anyModal() || G.Render.busy()) { if (el) el.style.visibility = 'hidden'; if (hand) hand.style.visibility = 'hidden'; return; }
      if (el) el.style.visibility = ''; if (hand) hand.style.visibility = '';
      const s = S();
      if (!cur && !seen('tap')) {
        const r = sceneRect(), L = G.Render.L;
        show('tap', t('tut.tap'), L.cx, Math.min(r.bottom - 110 * zoom, L.tipY + 62 * zoom), { skip: true, hand: [L.cx - 16 * zoom, L.tipY - 4 * zoom] });
      } else if (!cur && seen('tap') && !seen('upgrade') && s.coins >= G.cost('drill', s.lv.drill) && tab === 'up' && rows.drill) {
        const b = rows.drill.btn.getBoundingClientRect();
        rows.drill.el.classList.add('hl');
        show('upgrade', t('tut.upgrade'), b.left + b.width / 2 - 60, Math.max(8, b.top - 64), { hand: [b.left + b.width / 2 - 10, b.top + b.height / 2] });
      } else if (!cur && seen('upgrade') && !seen('engine') && G.Game.canBuy('engine') && tab === 'up' && rows.engine) {
        const b = rows.engine.el.getBoundingClientRect();
        rows.engine.el.classList.add('hl');
        show('engine', t('tut.engine'), b.left + b.width / 2, Math.max(8, b.top - 52), { dur: 4500 });
      }
      if (!cur && seen('tap') && !seen('node') && G.Render.nodes.length) {
        const n = G.Render.nodes[G.Render.nodes.length - 1];
        const P = G.Render.PX, R = G.Render.R;
        const nx = R.x + (n.x + 5) * P, ny = R.y + (G.Render.L.tipY - R.y) + (n.wy - G.Game.rt.camB) * P;
        show('node', t('tut.node'), Math.max(r0().left + 130, Math.min(r0().right - 130, nx)), Math.max(r0().top + 40, ny - 90 * zoom), { dur: 4500, hand: [nx - 14 * zoom, ny + 6 * zoom] });
      } else if (!cur && seen('tap') && !seen('heat') && G.Game.rt.heat > 0.2) {
        show('heat', t('tut.heat'), G.Render.L.cx, r0().bottom - 96 * zoom, { dur: 4500 });
      }
      if (cur === 'engine' && !until) { mark('engine'); }
      if (cur !== 'upgrade' && rows.drill) rows.drill.el.classList.remove('hl');
      if (cur !== 'engine' && rows.engine) rows.engine.el.classList.remove('hl');
      if (cur === 'upgrade' && tab !== 'up') clear();
    }
    function tapped() {
      if (cur === 'tap' && ++taps >= 3) { mark('tap'); clear(); }
    }
    function bought(id) {
      if (cur === 'upgrade' && id === 'drill') { mark('upgrade'); clear(); }
      if (cur === 'engine' && id === 'engine') { mark('engine'); clear(); }
    }
    function plate() {
      if (seen('plate') || (cur && cur !== 'engine')) return;
      const r = sceneRect();
      show('plate', t('tut.plate'), r.left + r.width / 2, Math.max(r.top + 50, G.Render.L.cy - G.Render.L.s * 1.6), { dur: 5000 });
    }
    function cart() {
      if (seen('cart') || cur) return;
      const r = sceneRect();
      show('cart', t('tut.cart'), r.left + r.width / 2, r.top + r.height * 0.62, { dur: 5000 });
    }
    return { tick, tapped, bought, plate, cart, clear };
  })();

  // ---------- per-frame update ----------
  let slowT = 0, lastTab = '';
  function update(dt) {
    const s = S(), Gm = G.Game;
    setText(E.coins, fmt(s.coins));
    const inc = Gm.income();
    setText(E.rate, '+' + fmt(inc, true) + t('perSec'));
    toggle(E.rate, 'turbo', s.turboLeft > 0);
    setText(E.gems, fmt(s.gems));
    setText(E.shards, fmt(s.shards));

    const li = Gm.layer();
    setText(E.depthB, G.int(s.depth) + ' ' + t('m'));
    setText(E.layerN, t('layer.' + G.LAYER_KEYS[li]));
    setText(E.planetN, planetName(s.planet));

    const busy = G.Render.busy();
    toggle(E.scene, 'busy', busy);
    if (s.plate && !busy) {
      toggle(E.plate, 'on', true);
      const max = Gm.plateMax();
      const hp = Math.max(0, s.plate.hp);
      E.hpI.style.width = (hp / max * 100) + '%';
      setText(E.hpT, fmt(hp) + ' / ' + fmt(max));
      const left = Math.max(0, 30 - s.plate.timer);
      setText(E.ringT, String(Math.ceil(left)));
      E.ringFg.setAttribute('stroke-dashoffset', String(2 * Math.PI * 15 * (1 - left / 30)));
      const P = Gm.power();
      setText(E.pHint, P * left >= hp ? t('plate.auto', { n: Math.ceil(hp / P) }) : t('plate.need', { x: fmt(max / 30, true) }));
      E.plate.style.top = Z(G.Render.plateBottom - G.Render.R.y + 6) + 'px';
    } else toggle(E.plate, 'on', false);
    toggle(E.core, 'on', Gm.atCore() && !busy);

    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) E.banner.classList.remove('on'); }

    setHTML(E.turbo, IC.bolt + lbl(s.turboLeft > 0 ? t('turbo') + ' ' + G.clock(s.turboLeft) : t('turbo')));
    toggle(E.turbo, 'on', s.turboLeft > 0);

    slowT -= dt;
    if (slowT <= 0) {
      slowT = 0.25;
      const R = G.Retention;
      E.dDaily.style.display = R.dailyAvailable() ? '' : 'none';
      E.dTasks.style.display = R.tasksAttention() ? '' : 'none';
      const gr = R.geodeReady(), gl = R.geodeLeft();
      toggle(E.bGeode, 'ready', gr);
      setText(E.geodeT, gr ? '!' : gl >= 3600 ? G.clock(gl).slice(0, -3) : G.clock(gl));
      setText(E.vein, t('vein.banner', { name: t('layer.' + G.LAYER_KEYS[R.vein()]) }));
      E.vein.style.display = G.Game.layer() === R.vein() ? '' : 'none';
      const wk = R.isWeekend(), soon = R.weekendSoon();
      E.wknd.style.display = wk || soon ? '' : 'none';
      if (wk || soon) setText(E.wknd, wk ? t('weekend.banner') : t('weekend.soon'));
      if (tab === 'up') refreshUpgrades();
      else if (tab === 'goals') renderGoals();
      else if (tab === 'planet') renderPlanet();
      else renderShop();
      E.dGoals.style.display = G.Goals.macroReady() || R.tasksAttention() ? '' : 'none';
      const C = G.Crystal;
      const cheapest = Math.min(...Object.keys(C.PETS).filter(k => C.petLv(k) < C.PETS[k].max).map(C.petCost),
        ...Object.keys(C.LAB).filter(k => C.labLv(k) < C.LAB[k].max).map(C.labCost));
      E.dShop.style.display = s.gems >= cheapest && tab !== 'shop' ? '' : 'none';
      const q = G.Goals.quest();
      setText(E.questT, q.done ? t('q.done') : questText(q));
      E.questBar.style.width = Math.min(100, q.p / q.n * 100) + '%';
      toggle(E.quest, 'done', q.done);
      if (geodeModal && !geodeModal.closed && geodeModal.timer) {
        const left = R.geodeLeft();
        setText(geodeModal.timer, G.clock(left));
        if (left <= 0) { geodeModal.close(); showGeode(); }
      }
      if (tasksModal && !tasksModal.closed) {
        const key = JSON.stringify(R.tasksEnsure());
        if (tasksModal.key !== key) { tasksModal.key = key; renderTasks(); }
      }
      if (turboModal && !turboModal.closed) {
        const key = Math.floor(s.turboLeft) + '|' + s.gems;
        if (turboModal.key !== key) { turboModal.key = key; refreshTurboModal(); }
      }
    }
    Tut.tick();
  }

  function onKey(code) {
    if (code === 'KeyP') {
      if (anyModal()) { const m = top(); if (m.settings) m.close(); }
      else showSettings(t('paused'));
      return true;
    }
    if (code === 'Escape') {
      const m = top();
      if (m && m.closable) { m.close(); return true; }
    }
    return false;
  }

  function loginGift() {
    const s = S();
    if (s.login.gift) return;
    s.login.gift = true; s.gems += 5; G.Save.save();
    toast(IC.gem + `<span>${t('login.gift')}</span>`); sfx('reward');
  }

  G.UI = {
    build, rebuild, update, toast, modal, anyModal, closeAll: () => { while (stack.length) stack[stack.length - 1].close(true); },
    showOffline, showDaily, showCart, showGeode, showTasks, showTurbo, showSettings, confirmCore,
    layerBanner, coreReached, milestone, achievement, overdrive, relicFound, questDone, questNew, enemyAppeared, enemyGone, lookUpgraded, taskDone, cartAppeared, plateAppeared, tapped, interstitial,
    onKey, loginGift, setTab, IC, hudTarget, bump, get scene() { return E.scene; }, get tab() { return tab; },
  };
})();
