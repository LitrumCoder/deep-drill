(() => {
  const G = window.G;
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let musicTimer = 0, nextBar = 0, barIndex = 0;
  let loop = null;
  const lastPlay = {};

  const PRESETS = {
    tap: [{ type: 'noise', filter: 'highpass', freq: 1500, dur: 0.04, vol: 0.15 }, { type: 'square', f0: 300, dur: 0.03, vol: 0.06 }],
    buy: [{ type: 'sine', f0: 500, f1: 900, dur: 0.08, vol: 0.2 }],
    milestone: [{ type: 'triangle', f0: 523, dur: 0.12, vol: 0.25 }, { type: 'triangle', f0: 659, dur: 0.12, vol: 0.25, at: 0.09 },
                { type: 'triangle', f0: 784, dur: 0.12, vol: 0.25, at: 0.18 }, { type: 'triangle', f0: 1047, dur: 0.35, vol: 0.28, at: 0.27 }],
    plate_hit: [{ type: 'noise', filter: 'lowpass', freq: 600, dur: 0.06, vol: 0.22 }],
    break: [{ type: 'noise', filter: 'lowpass', freq: 1400, dur: 0.4, vol: 0.4 }, { type: 'sine', f0: 120, f1: 60, dur: 0.4, vol: 0.4 }],
    layer: [{ type: 'triangle', f0: 587, dur: 0.14, vol: 0.25 }, { type: 'triangle', f0: 740, dur: 0.14, vol: 0.25, at: 0.12 },
            { type: 'triangle', f0: 880, dur: 0.45, vol: 0.28, at: 0.24 }, { type: 'sine', f0: 440, dur: 0.5, vol: 0.15, at: 0.24 }],
    cart: [{ type: 'sine', f0: 1200, dur: 0.08, vol: 0.2 }, { type: 'sine', f0: 1200, dur: 0.08, vol: 0.2, at: 0.13 }],
    boom: [{ type: 'noise', filter: 'lowpass', freq: 900, dur: 1.2, vol: 0.5, attack: 0.01 }, { type: 'sine', f0: 80, f1: 30, dur: 1.2, vol: 0.5 }],
    coin: [{ type: 'square', f0: 1200, f1: 1600, dur: 0.05, vol: 0.12 }],
    button: [{ type: 'sine', f0: 600, dur: 0.04, vol: 0.15 }],
    regen: [{ type: 'sine', f0: 300, f1: 600, dur: 0.3, vol: 0.15 }],
    reward: [{ type: 'square', f0: 784, dur: 0.06, vol: 0.14 }, { type: 'square', f0: 988, dur: 0.06, vol: 0.14, at: 0.07 },
             { type: 'square', f0: 1175, dur: 0.06, vol: 0.14, at: 0.14 }, { type: 'square', f0: 1568, dur: 0.14, vol: 0.14, at: 0.21 }],
    crit: [{ type: 'noise', filter: 'highpass', freq: 1200, dur: 0.08, vol: 0.22 }, { type: 'square', f0: 520, f1: 1040, dur: 0.09, vol: 0.12 }],
    node: [{ type: 'square', f0: 880, dur: 0.05, vol: 0.12 }, { type: 'square', f0: 1320, dur: 0.08, vol: 0.12, at: 0.05 }],
    boomSmall: [{ type: 'noise', filter: 'lowpass', freq: 700, dur: 0.45, vol: 0.45, attack: 0.005 }, { type: 'sine', f0: 140, f1: 45, dur: 0.4, vol: 0.4 }],
    overdrive: [{ type: 'sawtooth', f0: 110, f1: 880, dur: 0.6, vol: 0.14 }, { type: 'square', f0: 660, dur: 0.08, vol: 0.12, at: 0.55 },
                { type: 'square', f0: 990, dur: 0.16, vol: 0.12, at: 0.63 }],
    alarm: [{ type: 'square', f0: 660, dur: 0.12, vol: 0.14 }, { type: 'square', f0: 440, dur: 0.12, vol: 0.14, at: 0.14 },
            { type: 'square', f0: 660, dur: 0.12, vol: 0.14, at: 0.28 }, { type: 'square', f0: 440, dur: 0.14, vol: 0.14, at: 0.42 }],
    hit: [{ type: 'noise', filter: 'bandpass', freq: 900, dur: 0.07, vol: 0.3 }, { type: 'square', f0: 220, f1: 110, dur: 0.07, vol: 0.12 }],
    whoosh: [{ type: 'noise', filter: 'bandpass', freq: 700, dur: 1.6, vol: 0.25, attack: 0.5 }],
  };
  const LIMIT = { plate_hit: 0.1, tap: 0.05, coin: 0.06, hit: 0.05 };

  // chiptune loop: Dm - Bb - F - C, 8 steps per bar, lead melody answers itself every other phrase
  const BPM = 112, STEP = 60 / BPM / 2, BAR = STEP * 8;
  const ROOTS = [38, 34, 41, 36];
  const CHORD_TONES = [[62, 65, 69], [58, 62, 65], [65, 69, 72], [60, 64, 67]];
  const LEAD = [
    [74, null, 77, 74, 72, null, 69, null],
    [70, null, 74, 77, 74, null, 72, 70],
    [72, null, 69, 72, 77, null, 76, 72],
    [76, null, 72, 67, 72, null, null, null],
  ];
  const LEAD_B = [
    [81, null, null, 79, 77, null, 74, null],
    [77, null, null, 74, 70, null, 74, null],
    [77, null, 79, 81, 84, null, 81, null],
    [79, null, 76, null, 72, null, 74, null],
  ];
  const KEY_SHIFT = [0, -2, 3, -5, 5];
  const midi = (n, shift) => 440 * Math.pow(2, (n + shift - 69) / 12);

  function settings() { return G.Save?.data?.settings || { sound: true, music: true }; }

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      sfxBus = ctx.createGain();
      musicBus = ctx.createGain();
      sfxBus.connect(master); musicBus.connect(master); master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      buildLoop();
      apply();
      musicTimer = setInterval(scheduleMusic, 120);
    }
    if (ctx.state !== 'running' && !Platform.audioOff) ctx.resume().catch(() => {});
  }

  function buildLoop() {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.value = 55;
    const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 420;
    const nz = ctx.createBufferSource(); nz.buffer = noiseBuf; nz.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 300;
    const g = ctx.createGain(); g.gain.value = 0;
    const trem = ctx.createGain(); trem.gain.value = 0.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.3;
    lfo.connect(lfoAmt); lfoAmt.connect(trem.gain);
    const oscG = ctx.createGain(); oscG.gain.value = 0.6;
    osc.connect(of); of.connect(oscG); oscG.connect(trem);
    nz.connect(nf); nf.connect(trem);
    trem.connect(g); g.connect(sfxBus);
    osc.start(); nz.start(); lfo.start();
    loop = { osc, g, on: false, layer: 0 };
  }

  function drill(on, layer, turbo) {
    if (!loop) return;
    const t = ctx.currentTime;
    const f = 55 * Math.pow(1.07, layer || 0) * (turbo ? 1.25 : 1);
    if (Math.abs(loop.osc.frequency.value - f) > 0.5) loop.osc.frequency.setTargetAtTime(f, t, 0.15);
    const vol = on ? 0.05 : 0;
    if (loop.on !== on) { loop.on = on; loop.g.gain.setTargetAtTime(vol, t, 0.08); }
  }

  function apply() {
    if (!ctx) return;
    const s = settings();
    const t = ctx.currentTime;
    master.gain.setValueAtTime(Platform.info.muted ? 0 : 1, t);
    sfxBus.gain.setValueAtTime(s.sound ? 1 : 0, t);
    musicBus.gain.setValueAtTime(s.music ? 0.9 : 0, t);
    if (s.music) nextBar = Math.max(nextBar, t + 0.05);
  }

  function env(g, t, vol, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function voice(p, t0, out) {
    const t = t0 + (p.at || 0);
    const g = ctx.createGain();
    env(g, t, Math.min(0.5, p.vol), Math.max(0.005, p.attack || 0.006), p.dur);
    let src;
    if (p.type === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = p.filter || 'lowpass'; f.frequency.value = p.freq || 1000;
      src.connect(f); f.connect(g);
    } else {
      src = ctx.createOscillator();
      src.type = p.type;
      src.frequency.setValueAtTime(p.f0, t);
      if (p.f1) src.frequency.exponentialRampToValueAtTime(p.f1, t + p.dur);
      src.connect(g);
    }
    g.connect(out);
    src.start(t);
    src.stop(t + p.dur + 0.05);
  }

  function sfx(name) {
    if (!ctx || ctx.state !== 'running' || !settings().sound) return;
    const list = PRESETS[name];
    if (!list) return;
    const now = ctx.currentTime;
    if (LIMIT[name] && now - (lastPlay[name] || 0) < LIMIT[name]) return;
    lastPlay[name] = now;
    for (const p of list) voice(p, now + 0.005, sfxBus);
  }

  function note(type, f, t, dur, vol, out = musicBus) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function drum(kind, t) {
    const g = ctx.createGain();
    if (kind === 'kick') {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      env(g, t, 0.16, 0.004, 0.16);
      o.connect(g); o.start(t); o.stop(t + 0.18);
    } else {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = kind === 'snare' ? 'bandpass' : 'highpass';
      f.frequency.value = kind === 'snare' ? 1800 : 7000;
      env(g, t, kind === 'snare' ? 0.07 : 0.025, 0.003, kind === 'snare' ? 0.09 : 0.03);
      src.connect(f); f.connect(g); src.start(t, Math.random()); src.stop(t + 0.12);
    }
    g.connect(musicBus);
  }
  function scheduleMusic() {
    if (!ctx || ctx.state !== 'running' || !settings().music) return;
    if (nextBar < ctx.currentTime) nextBar = ctx.currentTime + 0.05;
    const shift = KEY_SHIFT[((G.Save?.data?.planet || 1) - 1) % 5];
    while (nextBar < ctx.currentTime + 0.6) {
      const b = barIndex % 4, phrase = Math.floor(barIndex / 4) % 4;
      const lead = (phrase % 2 ? LEAD_B : LEAD)[b];
      const t = nextBar;
      for (let s = 0; s < 8; s++) {
        const st = t + s * STEP;
        note('triangle', midi(ROOTS[b] + (s % 2 ? 12 : 0), shift), st, STEP * 0.9, 0.07);
        if (phrase > 0) {
          if (s === 0 || s === 4) drum('kick', st);
          if (s === 2 || s === 6) drum('snare', st);
          if (s % 2) drum('hat', st);
        }
        const n = lead[s];
        if (n != null && phrase !== 0) note('square', midi(n, shift), st, STEP * 1.6, 0.028);
        if (phrase === 0 || s % 2 === 0) note('square', midi(CHORD_TONES[b][s % 3] + 12, shift), st, STEP * 0.5, 0.012);
      }
      barIndex++;
      nextBar += BAR;
    }
  }

  function setOff(off) {
    if (!ctx) return;
    if (off) { if (ctx.state === 'running') ctx.suspend().catch(() => {}); }
    else if (ctx.state !== 'running') ctx.resume().then(() => { nextBar = ctx.currentTime + 0.05; }).catch(() => {});
    apply();
  }

  function init() {
    const u = () => unlock();
    addEventListener('pointerdown', u, true);
    addEventListener('touchend', u, true);
    addEventListener('keydown', u, true);
    Platform.onAudio(setOff);
  }

  G.Audio = { init, sfx, apply, drill, get ctx() { return ctx; } };
})();
