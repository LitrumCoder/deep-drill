(function (F) {
  const DEPTHS = [0, 50, 150, 400, 800, 1500, 2500, 4000, 6000, 8500, 10000];
  const CORE = 10000;
  const UPG = {
    drill: { base: 10, g: 1.17, cur: 'coins' },
    engine: { base: 500, g: 1.6, cur: 'coins' },
    sorter: { base: 100, g: 1.35, cur: 'coins' },
    grip: { base: 100, g: 1.45, cur: 'coins' },
    storage: { base: 10, g: 2, cur: 'gems', max: 10 },
  };

  const M = p => Math.pow(3, p - 1);
  const H = (i, p) => Math.pow(5, i) * M(p);
  const V = (i, p) => Math.pow(7.5, i) * M(p);
  const shardMul = S => 1 + 0.1 * S;

  function layerAt(depth) {
    for (let i = 9; i > 0; i--) if (depth >= DEPTHS[i]) return i;
    return 0;
  }

  function basePower(Lb) { return Lb * Math.pow(3, Math.floor(Lb / 25)); }

  function power(lv, S, turbo, offline) {
    return basePower(lv.drill) * (1 + 0.25 * lv.engine) * shardMul(S) * (turbo ? 2 : 1) * (offline ? 0.5 : 1);
  }

  function coinPerMeter(i, p, lv, S, gold) {
    return V(i, p) * (1 + 0.2 * lv.sorter) * shardMul(S) * (gold ? 3 : 1);
  }

  const speed = (P, i, p) => P / H(i, p);
  const income = (P, i, p, lv, S, gold) => speed(P, i, p) * coinPerMeter(i, p, lv, S, gold);
  const tapK = Lt => 0.15 * (1 + 0.1 * Lt);
  const plateHP = (i, p) => 15 * H(i + 1, p);

  function cost(id, L, n = 1) {
    const u = UPG[id];
    return u.base * Math.pow(u.g, L) * (Math.pow(u.g, n) - 1) / (u.g - 1);
  }

  function maxBuy(id, L, money) {
    const u = UPG[id];
    if (!(money > 0)) return 0;
    let n = Math.floor(Math.log(money * (u.g - 1) / (u.base * Math.pow(u.g, L)) + 1) / Math.log(u.g));
    if (!isFinite(n) || n < 0) n = 0;
    if (u.max != null) n = Math.min(n, u.max - L);
    while (n > 0 && cost(id, L, n) > money) n--;
    return Math.max(0, n);
  }

  Object.assign(F, { DEPTHS, CORE, UPG, M, H, V, shardMul, layerAt, basePower, power, coinPerMeter, speed, income, tapK, plateHP, cost, maxBuy });
})(typeof window !== 'undefined' ? (window.G = window.G || {}) : module.exports);
