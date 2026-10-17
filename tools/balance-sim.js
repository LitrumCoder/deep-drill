// node tools/balance-sim.js [planets]
const path = require('path');
const F = require(path.join(__dirname, '..', 'deep-drill', 'js', 'game', 'formulas.js'));

const PLANETS = +process.argv[2] || 7;
const CAP = 200 * 3600;
const IDS = ['drill', 'engine', 'sorter', 'grip'];

function gain(id, lv, tps) {
  if (id === 'drill') return F.basePower(lv.drill + 1) / F.basePower(lv.drill) - 1;
  if (id === 'engine') return 0.25 / (1 + 0.25 * lv.engine);
  if (id === 'sorter') return 0.2 / (1 + 0.2 * lv.sorter);
  const k = F.tapK(lv.grip);
  return 0.015 * tps / (1 + k * tps);
}

function planet(p, S, tps) {
  const lv = { drill: 1, engine: 0, sorter: 0, grip: 0 };
  let coins = 0, depth = 0, t = 0, plate = null;
  const layers = [];
  let layerStart = 0;
  while (depth < F.CORE && t < CAP) {
    for (;;) {
      let best = null, bestR = 0;
      for (const id of IDS) {
        const r = gain(id, lv, tps) / F.cost(id, lv[id]);
        if (r > bestR) { bestR = r; best = id; }
      }
      if (!best) break;
      const c = F.cost(best, lv[best]);
      if (c > coins) break;
      coins -= c; lv[best]++;
    }
    const i = F.layerAt(depth);
    const P = F.power(lv, S, false, false);
    const mul = 1 + F.tapK(lv.grip) * tps;
    coins += F.income(P, i, p, lv, S, false) * mul;
    if (plate) {
      plate.t += 1;
      plate.hp -= P * mul;
      if (plate.hp <= 0) {
        depth = F.DEPTHS[i + 1];
        plate = null;
        layers.push(t + 1 - layerStart);
        layerStart = t + 1;
      } else if (plate.t >= 30) { plate.hp = F.plateHP(i, p); plate.t = 0; }
    } else {
      const b = F.DEPTHS[i + 1];
      const nd = depth + F.speed(P, i, p) * mul;
      if (nd >= b) {
        if (b === F.CORE) { depth = F.CORE; layers.push(t + 1 - layerStart); }
        else { depth = b - 0.01; plate = { hp: F.plateHP(i, p), t: 0 }; }
      } else depth = nd;
    }
    t++;
  }
  return { t, layers, lv, done: depth >= F.CORE };
}

const hms = s => `${(s / 3600).toFixed(2)} h`;
for (const tps of [0, 3]) {
  console.log(`\n=== ${tps} taps/s ===`);
  let S = 0;
  for (let p = 1; p <= PLANETS; p++) {
    const r = planet(p, S, tps);
    const lay = r.layers.map((s, i) => `L${i}:${s < 3600 ? (s / 60).toFixed(1) + 'm' : (s / 3600).toFixed(1) + 'h'}`).join(' ');
    console.log(`planet ${p} (shards ${S}): ${r.done ? hms(r.t) : '> ' + hms(CAP)}  drill ${r.lv.drill} engine ${r.lv.engine} sorter ${r.lv.sorter} grip ${r.lv.grip}`);
    console.log('   ' + lay);
    S += 10 * p;
  }
}
