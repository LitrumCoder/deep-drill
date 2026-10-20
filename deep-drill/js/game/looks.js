(() => {
  const G = window.G;

  // visual tiers: every part of the drill changes its look at these levels
  const TIERS = {
    drill: [0, 25, 50, 100, 150, 200],
    engine: [0, 5, 15, 30, 60],
    grip: [0, 5, 15, 30, 60],
    sorter: [0, 5, 15, 30, 60],
    storage: [0, 1, 4, 7, 10],
  };
  function tierOf(part, lv) { let t = 0; TIERS[part].forEach((v, i) => { if (lv >= v) t = i; }); return t; }
  function look(lv) {
    return { head: tierOf('drill', lv.drill), engine: tierOf('engine', lv.engine), grip: tierOf('grip', lv.grip), sorter: tierOf('sorter', lv.sorter), storage: tierOf('storage', lv.storage) };
  }

  // planet from which each relic can drop
  const RELIC_REQ = [1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];

  G.Look = { TIERS, tierOf, look, RELIC_REQ, RELIC_COUNT: RELIC_REQ.length };
})();
