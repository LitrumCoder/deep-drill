(() => {
  const G = window.G;
  const VERSION = 1;

  function defaults() {
    return {
      v: VERSION, savedAt: 0, lastSeen: 0, firstSeen: 0,
      planet: 1, depth: 0, coins: 0, gems: 0, shards: 0,
      lv: { drill: 1, engine: 0, sorter: 0, grip: 0, storage: 0 },
      plate: null,
      firstBreaks: {},
      turboLeft: 0,
      cartTimer: 75,
      buyMode: 1,
      skins: { owned: ['classic'], active: 'classic' },
      ach: {},
      stats: { taps: 0, plates: 0, carts: 0, layers: 0, upgrades: 0, cores: 0, nodes: 0, earned: 0, enemies: 0, overdrives: 0, playTime: 0, maxDrill: 1, quests: 0 },
      relics: [],
      planetStart: 0, lastRun: null, bestRun: {},
      quest: null,
      macro: {},
      pets: { bot: 0, bat: 0, golem: 0 },
      lab: { crit: 0, luck: 0, heat: 0, plate: 0, turbo: 0 },
      forge: 0,
      daily: { lastDay: null, cycleDay: 0 },
      geode: { startedAt: 0, adSkips: 0 },
      dailyTasks: { day: null, list: [], chestClaimed: false },
      seenTips: {},
      settings: { sound: true, music: true, vibro: true, shake: true, lang: null, notation: 'letters' },
      login: { gift: false },
    };
  }

  function fill(dst, def) {
    for (const k in def) {
      const d = def[k];
      if (dst[k] === undefined || dst[k] === null && d !== null) dst[k] = d;
      else if (d && typeof d === 'object' && !Array.isArray(d) && dst[k] && typeof dst[k] === 'object') fill(dst[k], d);
    }
    return dst;
  }

  function num(v, def = 0) { return typeof v === 'number' && isFinite(v) ? v : def; }
  function weight(d) {
    const st = d.stats || {};
    return num(st.playTime) * 1e6 + (num(d.planet, 1) * 10000 + num(d.depth)) + num(d.savedAt) / 1e15;
  }

  function migrate(d) {
    if (!d || typeof d !== 'object') return defaults();
    fill(d, defaults());
    d.v = VERSION;
    d.planet = Math.max(1, Math.floor(num(d.planet, 1)));
    d.depth = Math.min(10000, Math.max(0, num(d.depth)));
    d.coins = Math.max(0, num(d.coins));
    d.gems = Math.max(0, Math.floor(num(d.gems)));
    d.lv.drill = Math.max(1, Math.floor(num(d.lv.drill, 1)));
    for (const k of ['engine', 'sorter', 'grip']) d.lv[k] = Math.max(0, Math.floor(num(d.lv[k])));
    d.lv.storage = Math.min(10, Math.max(0, Math.floor(num(d.lv.storage))));
    d.turboLeft = Math.min(3600, Math.max(0, num(d.turboLeft)));
    if (![1, 10, 'max'].includes(d.buyMode)) d.buyMode = 1;
    if (!Array.isArray(d.skins.owned) || !d.skins.owned.includes('classic')) d.skins.owned = ['classic'].concat(d.skins.owned || []);
    if (!d.skins.owned.includes(d.skins.active)) d.skins.active = 'classic';
    if (!d.planetStart) d.planetStart = Date.now();
    d.stats.maxDrill = Math.max(d.stats.maxDrill || 1, d.lv.drill);
    if (!Array.isArray(d.relics)) d.relics = [];
    d.relics = [...new Set(d.relics.filter(i => Number.isInteger(i) && i >= 0 && i < 12))];
    if (d.plate && (typeof d.plate.hp !== 'number' || typeof d.plate.timer !== 'number')) d.plate = null;
    return d;
  }

  const Save = {
    data: defaults(),
    load() {
      // Of all readable copies take the one with the most play behind it (time, then cores and depth);
      // a fresh or broken copy can never replace real progress, even if it was written later.
      let d = null;
      for (const raw of Platform.storeGetAll()) {
        let c = null;
        try { c = JSON.parse(raw); } catch (e) { c = null; }
        if (c && typeof c === 'object' && (!d || weight(c) > weight(d))) d = c;
      }
      const fresh = !d;
      this.data = migrate(d);
      if (fresh) { this.data.firstSeen = Platform.now(); this.data.lastSeen = Platform.now(); }
      return fresh;
    },
    save() {
      this.data.savedAt = Date.now();
      try { Platform.storeSet(JSON.stringify(this.data)); } catch (e) {}
    },
    reset() { this.data = defaults(); },
    defaults, migrate,
  };

  G.Save = Save;
})();
