(() => {
  const G = window.G;
  const S = () => G.Save.data;

  // companions: hired and levelled with gems, never reset
  const PETS = {
    bot: { base: 40, g: 1.7, max: 10 },
    bat: { base: 60, g: 1.7, max: 10 },
    golem: { base: 50, g: 1.7, max: 10 },
  };
  const petLv = id => S().pets[id] || 0;
  const petCost = id => Math.round(PETS[id].base * Math.pow(PETS[id].g, petLv(id)));
  const botRate = (lv = petLv('bot')) => lv * 0.5;                       // auto taps per second
  const batEvery = (lv = petLv('bat')) => lv ? Math.max(2, 11 - lv) : 0;  // seconds between grabs
  const golemEvery = (lv = petLv('golem')) => lv ? Math.max(0.6, 3.5 - 0.3 * lv) : 0;

  // crystal lab: permanent boosts
  const LAB = {
    crit: { base: 15, g: 1.75, max: 15 },
    luck: { base: 10, g: 1.6, max: 15 },
    heat: { base: 20, g: 1.75, max: 10 },
    plate: { base: 12, g: 1.6, max: 15 },
    turbo: { base: 25, g: 1.8, max: 10 },
  };
  const labLv = id => S().lab[id] || 0;
  const labCost = id => Math.round(LAB[id].base * Math.pow(LAB[id].g, labLv(id)));
  const critMul = (lv = labLv('crit')) => 5 + lv;
  const luckMul = (lv = labLv('luck')) => 1 + 0.25 * lv;
  const heatBonus = (lv = labLv('heat')) => lv;
  const plateMul = (lv = labLv('plate')) => 1 + 0.15 * lv;
  const turboMul = (lv = labLv('turbo')) => 2 + 0.2 * lv;

  // shard forge: endless sink, each forged shard is +10% power and income
  const forgeCost = () => Math.round(50 * Math.pow(1.3, S().forge || 0));

  function pay(cost) {
    const s = S();
    if (s.gems < cost) return false;
    s.gems -= cost;
    return true;
  }
  function buyPet(id) {
    if (petLv(id) >= PETS[id].max || !pay(petCost(id))) return false;
    S().pets[id] = petLv(id) + 1;
    G.Save.save();
    return true;
  }
  function buyLab(id) {
    if (labLv(id) >= LAB[id].max || !pay(labCost(id))) return false;
    S().lab[id] = labLv(id) + 1;
    G.Save.save();
    return true;
  }
  function forge() {
    if (!pay(forgeCost())) return false;
    const s = S();
    s.forge = (s.forge || 0) + 1;
    s.shards += 1;
    G.Save.save();
    return true;
  }

  G.Crystal = {
    PETS, petLv, petCost, botRate, batEvery, golemEvery, buyPet,
    LAB, labLv, labCost, critMul, luckMul, heatBonus, plateMul, turboMul, buyLab,
    forgeCost, forge,
  };
})();
