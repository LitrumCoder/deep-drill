(() => {
  const G = window.G;
  const S = () => G.Save.data;
  const R = () => G.Retention;
  const ev = (k, n = 1) => G.Goals?.event(k, n);

  const rt = {
    banner: null,          // { layer, t }
    layerAdPending: false,
    cart: null,            // { t }
    tapTimes: [],
    regenT: 0,
    achT: 0, saveT: 0,
    moving: false,
    lastTapAt: 0,
    lastInputAt: 0,
    heat: 0,               // 0..1, fills with taps
    over: 0,               // overdrive seconds left
    camB: 0,               // visual scroll in scene pixels
    enemy: null,           // { type, hp, max, t, life, stolen }
    enemyTimer: 90,
  };
  const OVER_MUL = 3, HEAT_PER_TAP = 0.07;

  // ---------- prestige perks: unlocked by reaching a planet, kept forever ----------
  const PERKS = [
    { id: 'cart', p: 2 }, { id: 'start10', p: 3 }, { id: 'heat', p: 4 }, { id: 'crit', p: 5 }, { id: 'engine5', p: 6 },
    { id: 'nodes', p: 7 }, { id: 'over', p: 8 }, { id: 'plate', p: 9 }, { id: 'offline', p: 10 }, { id: 'start25', p: 11 },
  ];
  const perk = id => S().planet >= PERKS.find(q => q.id === id).p;
  const perkAt = p => PERKS.find(q => q.p === p) || null;
  const overdriveLen = () => (perk('over') ? 12 : 8) + G.Crystal.heatBonus();
  const critChance = () => perk('crit') ? 0.2 : 0.12;
  const heatPerTap = () => HEAT_PER_TAP * (perk('heat') ? 1.3 : 1);
  const cartInterval = () => R().cartInterval() * (perk('cart') ? 0.75 : 1);

  // ---------- underground enemies ----------
  const ENEMIES = {
    mole: { hp: 5, life: 12, mul: 1 },
    spider: { hp: 6, life: 15, mul: 0.3 },
    slime: { hp: 7, life: 15, mul: 0 },
    cavein: { hp: 6, life: 12, mul: 0 },
  };
  const enemyMul = () => rt.enemy ? ENEMIES[rt.enemy.type].mul : 1;

  const layer = () => G.layerAt(S().depth);
  const atCore = () => S().depth >= G.CORE;
  const gold = i => R().vein() === i;
  const relicMul = () => 1 + 0.05 * S().relics.length;

  function rawPower(turbo, od) {
    const s = S();
    return G.power(s.lv, s.shards, false, false) * (turbo ? G.Crystal.turboMul() : 1) * (od ? OVER_MUL : 1);
  }
  function power(turbo = S().turboLeft > 0, od = rt.over > 0) { return rawPower(turbo, od) * enemyMul(); }
  function coinPerMeter(i = layer()) { const s = S(); return G.coinPerMeter(i, s.planet, s.lv, s.shards, gold(i)) * relicMul(); }
  function speed(P = power(), i = layer()) { return G.speed(P, i, S().planet); }
  function income(P = power(), i = layer()) { return speed(P, i) * coinPerMeter(i); }
  function incomeBase() { return income(rawPower(false, false)); }
  function plateMax() { return G.plateHP(layer(), S().planet); }
  const totalDepth = () => 10000 * (S().planet - 1) + S().depth;

  function earn(c) { const s = S(); s.coins += c; s.stats.earned += c; if (c > 0) ev('earn', c); }

  function addTurbo(sec) {
    const s = S();
    s.turboLeft = Math.min(3600, s.turboLeft + sec);
    R().progress('turbo', 1);
  }

  function advance(dist) {
    const s = S();
    if (atCore() || s.plate) return;
    const i = layer(), b = G.DEPTHS[i + 1];
    const nd = s.depth + dist;
    if (nd < b) { s.depth = nd; return; }
    if (b === G.CORE) { s.depth = G.CORE; reachCore(); }
    else { s.depth = b - 0.01; s.plate = { hp: G.plateHP(i, s.planet), timer: 0 }; G.UI?.plateAppeared(); }
  }

  function reachCore(offline) {
    const s = S();
    s.stats.layers++;
    R().progress('layers', 1);
    ev('layer');
    if (!offline) { G.Audio.sfx('layer'); G.UI?.coreReached(); }
    G.Save.save();
  }

  function breakPlate(offline) {
    const s = S();
    const i = layer(), ni = i + 1;
    s.depth = G.DEPTHS[ni];
    s.plate = null;
    s.stats.plates++; s.stats.layers++;
    R().progress('plates', 1);
    R().progress('layers', 1);
    ev('plate'); ev('layer');
    const key = `p${s.planet}_l${ni}`;
    let gems = 0;
    if (!s.firstBreaks[key]) {
      s.firstBreaks[key] = true;
      gems = (1 + Math.floor(ni / 3)) * (R().isWeekend() ? 2 : 1);
      s.gems += gems;
    }
    if (!offline) {
      rt.banner = { layer: ni, t: 1.5 };
      rt.layerAdPending = true;
      G.Audio.sfx('break');
      setTimeout(() => G.Audio.sfx('layer'), 250);
      G.Render.plateBroken(ni, gems);
      G.UI?.layerBanner(ni, gems);
    }
    G.Save.save();
    return ni;
  }

  function spawnEnemy() {
    const li = layer();
    const r = Math.random();
    let type;
    if (li <= 4) type = r < 0.7 ? 'mole' : 'cavein';
    else if (li <= 6) type = r < 0.55 ? 'spider' : r < 0.8 ? 'mole' : 'cavein';
    else type = r < 0.6 ? 'slime' : r < 0.85 ? 'cavein' : 'mole';
    const e = ENEMIES[type];
    rt.enemy = { type, hp: e.hp, max: e.hp, t: 0, life: e.life, stolen: 0, side: Math.random() < 0.5 ? -1 : 1 };
    G.Audio.sfx('alarm');
    G.UI?.enemyAppeared(type);
  }

  function updateEnemy(dt) {
    const s = S();
    const e = rt.enemy;
    if (!e) {
      const active = performance.now() - rt.lastInputAt < 45000;
      if (active && s.stats.playTime >= 180 && !rt.banner) {
        rt.enemyTimer -= dt;
        if (rt.enemyTimer <= 0) { rt.enemyTimer = 70 + Math.random() * 60; spawnEnemy(); }
      }
      return;
    }
    e.t += dt;
    if (e.type === 'mole' && e.t > 1.2) {
      const cap = incomeBase() * 60;
      const take = Math.min(s.coins, incomeBase() * 3 * dt, Math.max(0, cap - e.stolen));
      s.coins -= take; e.stolen += take;
    }
    if (e.t >= e.life) {
      rt.enemy = null;
      G.UI?.enemyGone(e);
    }
  }

  function hitEnemy(auto) {
    const e = rt.enemy;
    if (!e) return null;
    if (!auto) {
      const now = performance.now();
      rt.tapTimes = rt.tapTimes.filter(t => now - t < 1000);
      if (rt.tapTimes.length >= 10) return { limited: true };
      rt.tapTimes.push(now);
      rt.lastInputAt = rt.lastTapAt = now;
      S().stats.taps++;
      R().progress('taps', 1);
      ev('tap');
    }
    e.hp--;
    G.Audio.sfx('hit');
    if (e.hp > 0) return { hit: true };
    const s = S();
    const base = Math.max(1, incomeBase());
    const out = { defeated: true, type: e.type, coins: e.stolen + base * (e.type === 'mole' ? 20 : 30), gems: Math.random() < 0.25 ? 1 : 0 };
    earn(out.coins); s.gems += out.gems;
    s.stats.enemies++;
    ev('enemy');
    rt.enemy = null;
    G.Audio.sfx('reward');
    G.Save.save();
    return out;
  }

  function update(dt) {
    const s = S();
    if (G.Render.busy()) { rt.moving = false; return; }
    s.stats.playTime += dt;
    const turbo = s.turboLeft > 0;
    if (turbo) s.turboLeft = Math.max(0, s.turboLeft - dt);
    if (rt.over > 0) {
      rt.over = Math.max(0, rt.over - dt);
      if (!rt.over) G.UI?.overdrive(false);
    } else if (rt.heat > 0 && performance.now() - rt.lastTapAt > 900) rt.heat = Math.max(0, rt.heat - 0.22 * dt);
    updateEnemy(dt);
    const P = power(turbo);
    const i = layer();
    earn(income(P, i) * dt);
    rt.moving = false;

    if (rt.banner) {
      rt.banner.t -= dt;
      if (rt.banner.t <= 0) {
        rt.banner = null;
        if (rt.layerAdPending) {
          rt.layerAdPending = false;
          if (Platform.canInterstitial()) G.UI.interstitial();
        }
      }
    } else if (s.plate) {
      s.plate.timer += dt;
      s.plate.hp -= P * dt * G.Crystal.plateMul();
      if (s.plate.hp <= 0) breakPlate();
      else if (s.plate.timer >= 30) {
        s.plate.hp = plateMax(); s.plate.timer = 0;
        rt.regenT = 0.3;
        G.Audio.sfx('regen');
      }
    } else if (!atCore() && P > 0) {
      const v = speed(P, i);
      advance(v * dt);
      rt.moving = true;
      rt.camB += Math.min(v * 4, 300) * dt;
    }
    if (rt.regenT > 0) rt.regenT = Math.max(0, rt.regenT - dt);

    if (rt.cart) {
      rt.cart.t += dt;
      if (rt.cart.t >= 15) { rt.cart = null; s.cartTimer = cartInterval(); }
    } else {
      s.cartTimer -= dt;
      if (s.cartTimer <= 0) {
        rt.cart = { t: 0 };
        G.Audio.sfx('cart');
        G.UI?.cartAppeared();
      }
    }

    rt.botAcc = (rt.botAcc || 0) + dt * G.Crystal.botRate();
    while (rt.botAcc >= 1) { rt.botAcc -= 1; autoTap(); }

    G.Goals?.tick(dt);
    rt.achT += dt;
    if (rt.achT >= 0.5) { rt.achT = 0; checkAch(); }
    rt.saveT += dt;
    if (rt.saveT >= 5) { rt.saveT = 0; s.lastSeen = Platform.now(); G.Save.save(); }
  }

  function tap(x, y) {
    const now = performance.now();
    rt.tapTimes = rt.tapTimes.filter(t => now - t < 1000);
    if (rt.tapTimes.length >= 10) return false;
    rt.tapTimes.push(now);
    const s = S();
    if (G.Render.busy()) return false;
    s.stats.taps++;
    R().progress('taps', 1);
    ev('tap');
    rt.lastTapAt = rt.lastInputAt = now;
    const crit = Math.random() < critChance();
    const mul = crit ? G.Crystal.critMul() : 1;
    const k = G.tapK(s.lv.grip) * mul;
    const P = power();
    const coins = k * income(P);
    earn(coins);
    let dmg = 0;
    if (rt.banner) { /* drill is resting */ }
    else if (s.plate) {
      dmg = k * P * (perk('plate') ? 1.5 : 1) * G.Crystal.plateMul();
      s.plate.hp -= dmg;
      G.Audio.sfx('plate_hit');
      if (s.plate.hp <= 0) breakPlate();
    } else if (!atCore()) advance(k * speed(P));
    if (!rt.over) {
      rt.heat = Math.min(1, rt.heat + heatPerTap());
      if (rt.heat >= 1) startOverdrive();
    }
    G.Audio.sfx(crit ? 'crit' : 'tap');
    if (s.settings.vibro && navigator.vibrate) try { navigator.vibrate(crit ? 20 : 8); } catch (e) {}
    G.Render.tapFx(x, y, coins, dmg, crit);
    G.UI?.tapped();
    return true;
  }

  // the Drill Bot companion taps on its own: no heat, no tap stats, not limited
  function autoTap() {
    const s = S();
    if (G.Render.busy() || rt.banner) return;
    const k = G.tapK(s.lv.grip);
    const P = power();
    earn(k * income(P));
    if (s.plate) {
      s.plate.hp -= k * P * (perk('plate') ? 1.5 : 1) * G.Crystal.plateMul();
      if (s.plate.hp <= 0) breakPlate();
    } else if (!atCore()) advance(k * speed(P));
    G.Render.botFx(k * income(P));
  }

  function startOverdrive() {
    rt.heat = 0;
    rt.over = overdriveLen();
    S().stats.overdrives++;
    ev('overdrive');
    G.Audio.sfx('overdrive');
    G.Render.shake(6);
    G.UI?.overdrive(true);
  }

  // treasure nodes that appear in the shaft walls
  const NODE_W = { nugget: 45, gem: 14, chest: 10, tnt: 14, heat: 12, relic: 5 };
  function nextRelic() {
    const s = S();
    const free = [];
    for (let i = 0; i < G.Pix.RELIC_COUNT; i++) if (!s.relics.includes(i) && s.planet >= G.Pix.RELIC_REQ[i]) free.push(i);
    return free.length ? free[Math.floor(Math.random() * free.length)] : -1;
  }
  function rollNode() {
    const relic = nextRelic();
    const w = Object.assign({}, NODE_W);
    if (relic < 0) delete w.relic;
    let sum = 0; for (const k in w) sum += w[k];
    let r = Math.random() * sum;
    for (const k in w) { r -= w[k]; if (r <= 0) return { type: k, relic: k === 'relic' ? relic : -1 }; }
    return { type: 'nugget', relic: -1 };
  }
  const nodeInterval = () => (5 + Math.random() * 4) * (perk('nodes') ? 0.7 : 1);
  function collectNode(n) {
    const s = S();
    const base = Math.max(1, incomeBase());
    const out = { coins: 0, gems: 0 };
    rt.lastInputAt = performance.now();
    s.stats.nodes++;
    ev('node');
    const luck = G.Crystal.luckMul();
    if (n.type === 'nugget') out.coins = base * 20 * luck;
    else if (n.type === 'gem') out.gems = 1;
    else if (n.type === 'chest') { out.coins = base * 60 * luck; out.gems = Math.random() < 0.35 ? 2 : 1; }
    else if (n.type === 'tnt') {
      out.coins = base * 10 * luck;
      if (s.plate) { s.plate.hp -= plateMax() * 0.3; if (s.plate.hp <= 0) breakPlate(); }
      else if (!atCore()) advance(speed(rawPower(false, false)) * 6);
      out.boom = true;
      if (rt.enemy && rt.enemy.type === 'cavein') { rt.enemy.hp = 1; }
    } else if (n.type === 'heat') {
      if (!rt.over) { rt.heat = Math.min(1, rt.heat + 0.5); if (rt.heat >= 1) startOverdrive(); }
      out.heat = true;
    } else if (n.type === 'relic' && n.relic >= 0 && !s.relics.includes(n.relic)) {
      s.relics.push(n.relic);
      out.relic = n.relic;
    }
    earn(out.coins); s.gems += out.gems;
    G.Save.save();
    return out;
  }

  function buyCount(id) {
    const s = S();
    if (id === 'storage') return s.lv.storage >= 10 ? 0 : 1;
    const m = s.buyMode;
    if (m === 'max') return Math.max(1, G.maxBuy(id, s.lv[id], s.coins));
    return m;
  }
  function buyCost(id) { const s = S(); const n = buyCount(id); return n ? G.cost(id, s.lv[id], n) : Infinity; }
  function canBuy(id) {
    const s = S();
    if (id === 'storage') return s.lv.storage < 10 && s.gems >= buyCost(id);
    return s.coins >= buyCost(id);
  }
  function buy(id) {
    const s = S();
    if (!canBuy(id)) return false;
    const n = buyCount(id), c = buyCost(id);
    const before = s.lv[id];
    const tierBefore = G.Pix.tierOf(id, before);
    if (id === 'storage') s.gems -= c; else s.coins = Math.max(0, s.coins - c);
    s.lv[id] += n;
    rt.lastInputAt = performance.now();
    if (id !== 'storage') { s.stats.upgrades += n; R().progress('upgrades', n); ev('upgrade', n); }
    if (id === 'drill') {
      R().progress('drillLv', n);
      ev('drill', n);
      s.stats.maxDrill = Math.max(s.stats.maxDrill, s.lv.drill);
    }
    const tierAfter = G.Pix.tierOf(id, s.lv[id]);
    if (tierAfter > tierBefore) { G.Audio.sfx('milestone'); G.UI?.lookUpgraded(id, tierAfter); G.Render.flashDrill(); }
    else if (id === 'drill' && Math.floor(s.lv.drill / 25) > Math.floor(before / 25)) { G.Audio.sfx('milestone'); G.UI?.milestone(); }
    else G.Audio.sfx('buy');
    G.Save.save();
    return true;
  }

  function catchCart() {
    if (!rt.cart) return false;
    rt.cart = null;
    S().cartTimer = cartInterval();
    rt.lastInputAt = performance.now();
    return true;
  }
  function cartReward(ad) {
    const s = S();
    const c = incomeBase() * (ad ? 300 : 30);
    earn(c);
    s.stats.carts++;
    R().progress('carts', 1);
    ev('cart');
    G.Save.save();
    return c;
  }

  // what a core blast will give: used by the confirmation window
  function prestigePreview() {
    const s = S();
    const add = 10 * s.planet;
    return {
      shardsNow: s.shards, shardsAfter: s.shards + add, add,
      mulNow: 1 + 0.1 * s.shards, mulAfter: 1 + 0.1 * (s.shards + add),
      planet: s.planet + 1, perk: perkAt(s.planet + 1),
      startDrill: s.planet + 1 >= 11 ? 25 : s.planet + 1 >= 3 ? 10 : 1,
    };
  }

  function explode() {
    const s = S();
    if (!atCore()) return false;
    const p = s.planet;
    const now = Platform.now();
    s.lastRun = { p, sec: s.planetStart ? Math.max(0, (now - s.planetStart) / 1000) : 0 };
    if (!s.bestRun[p] || (s.lastRun.sec && s.lastRun.sec < s.bestRun[p])) s.bestRun[p] = s.lastRun.sec;
    s.planetStart = now;
    s.shards += 10 * p;
    s.planet = p + 1;
    s.coins = 0;
    s.lv.drill = perk('start25') ? 25 : perk('start10') ? 10 : 1;
    s.lv.engine = perk('engine5') ? 5 : 0;
    s.lv.sorter = 0; s.lv.grip = 0;
    s.depth = 0;
    s.plate = null;
    s.stats.cores++;
    R().completeTask('layers');
    ev('core');
    rt.banner = null; rt.layerAdPending = false; rt.cart = null; rt.over = 0; rt.heat = 0; rt.camB = 0; rt.enemy = null;
    checkAch();
    G.Save.save();
    return true;
  }

  // offline: 10 s steps, half power, no taps, no turbo, coins collected later
  function offline(sec) {
    const s = S();
    const out = { sec, coins: 0, meters: 0, layers: [], core: false };
    const startDepth = s.depth;
    const om = perk('offline') ? 1.5 : 1;
    let left = sec;
    while (left > 0) {
      const dt = Math.min(10, left);
      left -= dt;
      const i = layer();
      const P = G.power(s.lv, s.shards, false, true) * om;
      out.coins += G.income(P, i, s.planet, s.lv, s.shards, gold(i)) * relicMul() * dt;
      if (s.plate) {
        s.plate.timer += dt;
        s.plate.hp -= P * dt;
        if (s.plate.hp <= 0) out.layers.push(breakPlate(true));
        else if (s.plate.timer >= 30) { s.plate.hp = plateMax(); s.plate.timer = 0; }
      } else if (!atCore()) {
        const b = G.DEPTHS[i + 1];
        const nd = s.depth + G.speed(P, i, s.planet) * dt;
        if (nd >= b) {
          if (b === G.CORE) { s.depth = G.CORE; out.core = true; reachCore(true); }
          else { s.depth = b - 0.01; s.plate = { hp: G.plateHP(i, s.planet), timer: 0 }; }
        } else s.depth = nd;
      }
    }
    out.meters = Math.max(0, s.depth - startDepth);
    if (sec >= 8 * 3600) s.stats.off8h = 1;
    s.lastSeen = Platform.now();
    G.Save.save();
    rt.lastOffline = out;
    return out;
  }

  function offlineLimit() { return (2 + S().lv.storage) * 3600; }

  function checkAch() {
    const s = S(), td = totalDepth(), st = s.stats;
    const cond = {
      depth_100: td >= 100, depth_1k: td >= 1000, depth_5k: td >= 5000,
      first_core: st.cores >= 1, planet_3: s.planet >= 3, planet_5: s.planet >= 5,
      taps_1k: st.taps >= 1000, taps_10k: st.taps >= 10000, drill_100: s.lv.drill >= 100,
      plates_25: st.plates >= 25, cart_10: st.carts >= 10, offline_8h: !!st.off8h,
    };
    for (const a of G.ACH) {
      if (s.ach[a.id] || !cond[a.id]) continue;
      s.ach[a.id] = true;
      s.gems += a.gems;
      G.UI?.achievement(a);
      G.Save.save();
    }
  }

  G.Game = {
    rt, PERKS, perk, perkAt, ENEMIES, relicMul, rollNode, nodeInterval, collectNode, hitEnemy, spawnEnemy, prestigePreview,
    get OVERDRIVE() { return overdriveLen(); },
    layer, atCore, gold, power, rawPower, coinPerMeter, speed, income, incomeBase, plateMax, totalDepth, earn,
    addTurbo, update, tap, buy, buyCount, buyCost, canBuy, catchCart, cartReward, explode, offline, offlineLimit, checkAch,
  };
})();
