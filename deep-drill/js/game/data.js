(() => {
  const G = window.G;

  const LAYER_KEYS = ['soil', 'clay', 'stone', 'granite', 'basalt', 'quartz', 'gems', 'mantle', 'outer', 'core'];

  const ORES = [
    ['#5B3A1E', '#A88B6A', '#6E4A2A'],
    ['#D9822B', '#F0A85A', '#8C4A1A'],
    ['#1E1E22', '#3A3A40', '#5A5A60'],
    ['#C9A27E', '#E2C3A0', '#8E6E52'],
    ['#E8EEF4', '#B8C4D0', '#FFFFFF'],
    ['#FFD447', '#FFE98A', '#C99A10'],
    ['#E8344E', '#2ECC71', '#B04BFF'],
    ['#FF7A1A', '#FFB347', '#C23A0A'],
    ['#FFE08A', '#D8D8E0', '#FFF6D0'],
    ['#FFFFFF', '#FFF2A8', '#FFC93C'],
  ];

  const PALETTES = [
    ['#8B5A2B', '#B5651D', '#7D7D7D', '#5E5A66', '#3E3B47', '#C9C3D6', '#4B2E6B', '#8E2B16', '#D9531E', '#FFC93C'],
    ['#9C4A2A', '#B8562E', '#8E3B26', '#7A3328', '#5C2A26', '#C98A6A', '#6B2638', '#9E2A12', '#E0662A', '#FFB347'],
    ['#9EC6E0', '#BFE3F2', '#7FA8C9', '#5E86AD', '#3F5F87', '#E6F4FF', '#4A5FA8', '#2D7FB8', '#6FD6FF', '#E8FBFF'],
    ['#3A2E2E', '#4A3030', '#2B2424', '#3C2A2A', '#1F1A1C', '#6A4A3A', '#40202A', '#A0281A', '#FF5A1E', '#FFD23C'],
    ['#5B3E8A', '#3E8A8A', '#6A4FB0', '#2E6E7E', '#4A2E7A', '#A98BE0', '#2EA59A', '#7A2E9E', '#C04FD9', '#7FFFE0'],
  ];
  const PLANET_KEYS = ['earth', 'mars', 'ice', 'volcanis', 'crystallia'];

  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgbToHex(r, g, b) { return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
  function hueShift(hex, deg) {
    if (!deg) return hex;
    let [r, g, b] = hexToRgb(hex).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    h = (h + deg / 360) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return s === 0 ? rgbToHex(...[l, l, l].map(v => Math.round(v * 255))) : rgbToHex(...[f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255)));
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(...A.map((v, i) => Math.round(v + (B[i] - v) * t)));
  }

  const planetCache = {};
  function planet(p) {
    if (planetCache[p]) return planetCache[p];
    const base = (p - 1) % 5;
    const shift = 40 * Math.floor((p - 1) / 5);
    const pl = {
      p, base, shift,
      key: PLANET_KEYS[base],
      layers: PALETTES[base].map(c => hueShift(c, shift)),
      ores: ORES.map((o, i) => base === 0 ? o : o.map(c => hueShift(mix(c, PALETTES[base][i], 0.15), shift))),
    };
    planetCache[p] = pl;
    return pl;
  }

  const SKINS = [
    { id: 'classic', price: 0, body: '#F2B632', dark: '#B07A10', tip: '#B8C2CF', tipDark: '#6E7A8A', accent: '#E8434F', spark: '#FFD86B' },
    { id: 'rocket', price: 50, body: '#F4F4F8', dark: '#B9BCC8', tip: '#E8434F', tipDark: '#9E1E2A', accent: '#3A8DFF', spark: '#FF9F2E' },
    { id: 'dragon', price: 100, body: '#3DBB6A', dark: '#1E7A3E', tip: '#F1E3B0', tipDark: '#B8A26A', accent: '#FF5A2E', spark: '#FF6A2A' },
    { id: 'gold', price: 150, body: '#FFD447', dark: '#C9930E', tip: '#FFE98A', tipDark: '#C9A020', accent: '#FFFFFF', spark: '#FFF2A8' },
    { id: 'neon', price: 100, body: '#1C1F3A', dark: '#0C0E20', tip: '#25F4EE', tipDark: '#0E8C8A', accent: '#FE2C8B', spark: '#25F4EE' },
    { id: 'unicorn', price: 150, body: '#FFF4FB', dark: '#E0BCD8', tip: '#FFB3E6', tipDark: '#B57FD9', accent: '#8FD3FF', spark: '#FF9CE0' },
  ];

  const ACH = [
    { id: 'depth_100', gems: 2 }, { id: 'depth_1k', gems: 5 }, { id: 'depth_5k', gems: 10 },
    { id: 'first_core', gems: 25 }, { id: 'planet_3', gems: 30 }, { id: 'planet_5', gems: 50 },
    { id: 'taps_1k', gems: 3 }, { id: 'taps_10k', gems: 10 }, { id: 'drill_100', gems: 10 },
    { id: 'plates_25', gems: 10 }, { id: 'cart_10', gems: 5 }, { id: 'offline_8h', gems: 5 },
  ];

  const DAILY = [
    { gems: 5 }, { incomeMin: 10 }, { gems: 5 }, { turboMin: 10 }, { gems: 10 }, { incomeMin: 30 }, { gems: 25 },
  ];

  const TASKS = [
    { tpl: 'plates', min: 2, max: 4, step: 1 },
    { tpl: 'taps', min: 300, max: 800, step: 100 },
    { tpl: 'drillLv', min: 10, max: 30, step: 5 },
    { tpl: 'carts', min: 2, max: 3, step: 1 },
    { tpl: 'layers', min: 1, max: 2, step: 1 },
    { tpl: 'turbo', min: 1, max: 1, step: 1 },
    { tpl: 'upgrades', min: 15, max: 40, step: 5 },
  ];

  Object.assign(G, { LAYER_KEYS, planet, SKINS, ACH, DAILY, TASKS, mixColor: mix, hexToRgb });
})();
