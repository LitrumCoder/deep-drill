(() => {
  const G = window.G;
  const S = () => G.Save.data;
  const GEODE_MS = 8 * 3600e3;

  function rng(seed) {
    let a = (seed * 2654435761) >>> 0 || 1;
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const veinRaw = d => Math.floor(rng(d * 7 + 13)() * 10);
  const veinCache = {};
  function veinFor(d) {
    if (veinCache[d] != null) return veinCache[d];
    let v = veinRaw(d - 30);
    for (let k = d - 29; k <= d; k++) {
      const r = veinRaw(k);
      v = r === v ? (r + 3) % 10 : r;
    }
    return (veinCache[d] = v);
  }
  const vein = () => veinFor(Platform.dayIndex());

  function isWeekend(t) { const w = Platform.weekday(t); return w === 0 || w === 6; }
  function weekendSoon(t = Platform.now()) { return Platform.weekday(t) === 5 && new Date(t).getUTCHours() >= 18; }
  const cartInterval = () => isWeekend() ? 120 : 180;
  const secToNextDay = () => (Platform.dayIndex() + 1) * 86400 - Platform.now() / 1000;

  // ---------- daily reward ----------
  function dailyAvailable() { return S().daily.lastDay !== Platform.dayIndex(); }
  function dailyNextDay() {
    const d = S().daily, today = Platform.dayIndex();
    if (d.lastDay === today) return d.cycleDay;
    return d.lastDay === today - 1 && d.cycleDay < 7 ? d.cycleDay + 1 : 1;
  }
  function grant(r, mul = 1) {
    const s = S();
    const out = [];
    if (r.gems) { s.gems += r.gems * mul; out.push({ gems: r.gems * mul }); }
    if (r.incomeMin) { const c = G.Game.incomeBase() * 60 * r.incomeMin * mul; s.coins += c; out.push({ coins: c }); }
    if (r.turboMin) { G.Game.addTurbo(r.turboMin * 60 * mul); out.push({ turbo: r.turboMin * mul }); }
    return out;
  }
  function claimDaily(mul = 1) {
    if (!dailyAvailable()) return null;
    const day = dailyNextDay();
    const d = S().daily;
    d.cycleDay = day;
    d.lastDay = Platform.dayIndex();
    const out = grant(G.DAILY[day - 1], mul);
    G.Save.save();
    return out;
  }

  // ---------- geode ----------
  function geodeEnsure() { const g = S().geode; if (!g.startedAt) { g.startedAt = Platform.now(); g.adSkips = 0; } }
  function geodeLeft() { geodeEnsure(); return Math.max(0, S().geode.startedAt + GEODE_MS - Platform.now()) / 1000; }
  function geodeReady() { return geodeLeft() <= 0; }
  function geodeSkip() {
    const g = S().geode;
    if (g.adSkips >= 3 || geodeReady()) return false;
    g.startedAt -= 3600e3; g.adSkips++;
    G.Save.save();
    return true;
  }
  function geodeOpen() {
    if (!geodeReady()) return null;
    const s = S();
    const coins = G.Game.incomeBase() * 1800;
    s.coins += coins; s.gems += 5;
    s.geode.startedAt = Platform.now(); s.geode.adSkips = 0;
    G.Save.save();
    return { coins, gems: 5 };
  }

  // ---------- daily tasks ----------
  function tasksEnsure() {
    const dt = S().dailyTasks, today = Platform.dayIndex();
    if (dt.day === today && dt.list.length === 3) return dt;
    const r = rng(today * 31 + 5);
    const pool = G.TASKS.slice();
    const list = [];
    while (list.length < 3) {
      const tp = pool.splice(Math.floor(r() * pool.length), 1)[0];
      const steps = Math.round((tp.max - tp.min) / tp.step);
      const n = tp.min + tp.step * Math.floor(r() * (steps + 1));
      list.push({ tpl: tp.tpl, n, progress: 0, done: false, claimed: false });
    }
    dt.day = today; dt.list = list; dt.chestClaimed = false;
    return dt;
  }
  function progress(tpl, add = 1) {
    const dt = tasksEnsure();
    for (const tk of dt.list) {
      if (tk.tpl !== tpl || tk.done) continue;
      tk.progress = Math.min(tk.n, tk.progress + add);
      if (tk.progress >= tk.n) { tk.done = true; G.UI?.taskDone(tk); }
    }
  }
  function completeTask(tpl) {
    const dt = tasksEnsure();
    for (const tk of dt.list) if (tk.tpl === tpl && !tk.done) { tk.progress = tk.n; tk.done = true; G.UI?.taskDone(tk); }
  }
  function claimTask(i) {
    const tk = tasksEnsure().list[i];
    if (!tk || !tk.done || tk.claimed) return false;
    tk.claimed = true; S().gems += 3;
    G.Save.save();
    return true;
  }
  function chestReady() { const dt = tasksEnsure(); return !dt.chestClaimed && dt.list.every(t => t.claimed); }
  function claimChest() {
    if (!chestReady()) return false;
    tasksEnsure().chestClaimed = true; S().gems += 10;
    G.Save.save();
    return true;
  }
  function tasksAttention() {
    const dt = tasksEnsure();
    return dt.list.some(t => t.done && !t.claimed) || chestReady();
  }

  // ---------- next goal (STANDARD 15.2) ----------
  function nextGoal() {
    const s = S(), F = G;
    const c = [];
    if (s.depth < F.CORE) {
      const i = F.layerAt(s.depth), a = F.DEPTHS[i], b = F.DEPTHS[i + 1];
      const next = i + 1 <= 9 ? G.t('layer.' + G.LAYER_KEYS[i + 1]) : null;
      if (i === 9) c.push({ pct: s.depth / F.CORE, text: G.t('goal.core', { a: G.fmt(s.depth), b: G.fmt(F.CORE) }) });
      else c.push({ pct: (s.depth - a) / (b - a), text: G.t('goal.layer', { name: next, a: G.fmt(s.depth), b: G.fmt(b) }) });
    }
    for (const id of ['drill', 'engine', 'sorter', 'grip']) {
      const cost = F.cost(id, s.lv[id]);
      if (s.coins < cost) c.push({ pct: s.coins / cost, text: G.t('goal.upgrade', { name: G.t('up.' + id), a: G.fmt(s.coins), b: G.fmt(cost) }), icon: 'coin' });
    }
    const skin = G.SKINS.filter(k => !s.skins.owned.includes(k.id)).sort((x, y) => x.price - y.price)[0];
    if (skin && s.gems < skin.price) c.push({ pct: s.gems / skin.price, text: G.t('goal.skin', { name: G.t('skin.' + skin.id), a: s.gems, b: skin.price }), icon: 'gem' });
    const left = geodeLeft();
    if (left > 0) c.push({ pct: 1 - left / (GEODE_MS / 1000), text: G.t('goal.geode', { t: G.dur(left) }) });
    const tl = tasksEnsure().list, done = tl.filter(t => t.done).length;
    if (done < 3) c.push({ pct: done / 3, text: G.t('goal.tasks', { a: done, b: 3 }) });
    const best = c.filter(g => g.pct < 1).sort((x, y) => y.pct - x.pct)[0];
    return best || null;
  }

  G.Retention = {
    vein, veinFor, isWeekend, weekendSoon, cartInterval, secToNextDay,
    dailyAvailable, dailyNextDay, claimDaily, grant,
    geodeEnsure, geodeLeft, geodeReady, geodeSkip, geodeOpen, GEODE_MS,
    tasksEnsure, progress, completeTask, claimTask, chestReady, claimChest, tasksAttention,
    nextGoal, rng,
  };
})();
