(async () => {
  const G = window.G;
  const loader = document.getElementById('loader');
  const bar = loader.querySelector('.bar i');
  const step = p => { bar.style.width = p + '%'; };
  const canvas = document.getElementById('game');

  step(15);
  await Platform.init();
  step(45);

  const fresh = G.Save.load();
  const s = () => G.Save.data;
  G.setLang(s().settings.lang || Platform.info.lang);
  document.title = G.t('title');
  G.Audio.init();
  G.UI.build();
  G.Render.init(canvas, G.UI.scene);
  G.Input.init(canvas);
  G.Retention.geodeEnsure();
  G.Retention.tasksEnsure();
  step(80);

  function offlineDelta(since) {
    const now = Platform.now();
    let d = (now - (since || now)) / 1000;
    if (!(d > 0)) d = 0;
    return Math.min(d, G.Game.offlineLimit());
  }

  const delta = fresh ? 0 : offlineDelta(s().lastSeen);
  const off = delta > 0 ? G.Game.offline(delta) : null;
  s().lastSeen = Platform.now();
  G.Save.save();

  G.Render.frame(0);
  G.UI.update(0);
  step(100);
  Platform.ready();
  Platform.gameplay(true);
  loader.classList.add('out');
  setTimeout(() => loader.remove(), 320);

  const afterOffline = () => {
    if (!fresh && G.Retention.dailyAvailable() && s().seenTips.tap) G.UI.showDaily();
  };
  if (off && delta >= 60) G.UI.showOffline(off, afterOffline);
  else {
    if (off) s().coins += off.coins;
    afterOffline();
  }

  // returning to a hidden tab works like a short offline session
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Platform.now();
      s().lastSeen = hiddenAt;
      G.Save.save();
    } else if (hiddenAt) {
      const d = offlineDelta(hiddenAt);
      hiddenAt = 0;
      if (d < 1 || G.Render.busy()) return;
      const res = G.Game.offline(d);
      if (d >= 60 && !G.UI.anyModal()) G.UI.showOffline(res);
      else s().coins += res.coins;
    }
  });
  addEventListener('pagehide', () => { s().lastSeen = Platform.now(); G.Save.save(); });

  Platform.onAuth(user => {
    setTimeout(() => {
      G.UI.closeAll();
      G.Save.load();
      G.setLang(s().settings.lang || Platform.info.lang);
      G.UI.rebuild();
      if (user) G.UI.loginGift();
    }, 600);
  });

  let last = performance.now(), resetDt = false;
  Platform.onResume(() => { resetDt = true; });
  function loop(now) {
    let dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (resetDt) { dt = 0; resetDt = false; }
    const paused = Platform.paused;
    if (!paused) G.Game.update(dt);
    const st = s(), rt = G.Game.rt;
    G.Audio.drill(!paused && !G.Render.busy() && (rt.moving || !!st.plate), G.Game.layer(), st.turboLeft > 0);
    G.Render.frame(paused ? 0 : dt);
    G.UI.update(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
