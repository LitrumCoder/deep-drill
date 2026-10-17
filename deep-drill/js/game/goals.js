(() => {
  const G = window.G;
  const S = () => G.Save.data;

  // ---------- micro quests: an endless chain of short goals ----------
  const TEMPLATES = ['drill', 'node', 'tap', 'upgrade', 'plate', 'overdrive', 'earn', 'depth', 'enemy', 'cart'];
  function hash(n) { n = Math.imul(n ^ 0x5bd1e995, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; }

  function makeQuest(q) {
    const s = S(), Gm = G.Game;
    const bad = new Set();
    if (Gm.atCore()) { bad.add('plate'); bad.add('depth'); }
    if (s.stats.playTime < 240) bad.add('enemy');
    if (q < 3) { bad.add('enemy'); bad.add('cart'); bad.add('overdrive'); }
    let k, tries = 0;
    do { k = TEMPLATES[hash(q * 31 + tries) % TEMPLATES.length]; tries++; } while (bad.has(k) && tries < 40);
    if (q === 0) k = 'tap';
    if (q === 1) k = 'drill';
    if (q === 2) k = 'node';
    const v = hash(q * 7 + 3);
    let n;
    switch (k) {
      case 'drill': n = 3 + (v % 4) * 2; break;
      case 'node': n = 2 + (v % 3); break;
      case 'tap': n = 25 + (v % 5) * 10; break;
      case 'upgrade': n = 4 + (v % 4) * 2; break;
      case 'earn': n = Math.max(50, Math.ceil(Gm.incomeBase() * (90 + (v % 3) * 30))); break;
      case 'depth': {
        const i = Gm.layer();
        const end = G.DEPTHS[i + 1];
        n = Math.min(end, Math.ceil((s.depth + Math.max(15, Gm.speed(Gm.rawPower(false, false)) * 45)) / 10) * 10);
        if (n <= s.depth) n = end;
        break;
      }
      default: n = 1;
    }
    return { q, k, n, p: k === 'depth' ? s.depth : 0, done: false };
  }

  function quest() {
    const s = S();
    if (!s.quest || s.quest.q == null) s.quest = makeQuest(s.stats.quests || 0);
    return s.quest;
  }

  function questReward(q) {
    const base = Math.max(5, G.Game.incomeBase());
    return { coins: base * (40 + 15 * (q.q % 4)), gems: q.q % 5 === 4 ? 2 : 0 };
  }

  let nextT = 0;
  function complete() {
    const s = S(), qq = s.quest;
    qq.done = true;
    const r = questReward(qq);
    G.Game.earn(r.coins); s.gems += r.gems;
    s.stats.quests++;
    G.UI?.questDone(qq, r);
    nextT = 1.6;
    G.Save.save();
  }

  function event(k, n = 1) {
    const q = quest();
    if (!q.done && q.k === k && k !== 'depth') {
      q.p = Math.min(q.n, q.p + n);
      if (q.p >= q.n) complete();
    }
  }

  function tick(dt) {
    const s = S();
    const q = quest();
    if (q.done) {
      nextT -= dt;
      if (nextT <= 0) { s.quest = makeQuest(s.stats.quests); G.UI?.questNew(s.quest); }
      return;
    }
    if (q.k === 'depth') {
      q.p = Math.min(q.n, s.depth);
      if (s.depth >= q.n || (G.Game.atCore() && q.n >= G.CORE)) complete();
    }
    else if (q.k === 'plate' && G.Game.atCore()) complete();
  }

  // ---------- macro goals: long multi-stage milestones ----------
  const MACRO = [
    { id: 'depth', stages: [1000, 10000, 50000, 100000, 250000, 500000], gems: [10, 25, 50, 100, 150, 250], val: () => G.Game.totalDepth() },
    { id: 'cores', stages: [1, 3, 5, 10, 20], gems: [20, 40, 60, 100, 200], val: s => s.stats.cores },
    { id: 'drill', stages: [50, 100, 200, 300, 500], gems: [10, 20, 40, 80, 150], val: s => s.stats.maxDrill },
    { id: 'relics', stages: [3, 6, 9, 12], gems: [25, 50, 75, 150], val: s => s.relics.length },
    { id: 'enemies', stages: [5, 25, 100, 250], gems: [10, 25, 50, 100], val: s => s.stats.enemies },
    { id: 'treasures', stages: [25, 100, 500, 2000], gems: [10, 25, 50, 100], val: s => s.stats.nodes },
    { id: 'skins', stages: [2, 4, 6], gems: [20, 40, 80], val: s => s.skins.owned.length },
    { id: 'quests', stages: [10, 50, 200, 500], gems: [10, 30, 60, 120], val: s => s.stats.quests },
  ];
  function macroState(m) {
    const s = S();
    const claimed = s.macro[m.id] || 0;
    const stage = Math.min(claimed, m.stages.length - 1);
    const target = m.stages[stage];
    const val = m.val(s);
    return { claimed, maxed: claimed >= m.stages.length, target, val, ready: claimed < m.stages.length && val >= target, gems: m.gems[stage], stage };
  }
  function claimMacro(id) {
    const m = MACRO.find(q => q.id === id);
    const st = macroState(m);
    if (!st.ready) return 0;
    S().macro[id] = st.claimed + 1;
    S().gems += st.gems;
    G.Save.save();
    return st.gems;
  }
  const macroReady = () => MACRO.some(m => macroState(m).ready);

  G.Goals = { quest, questReward, event, tick, MACRO, macroState, claimMacro, macroReady };
})();
