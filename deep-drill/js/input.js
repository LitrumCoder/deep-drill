(() => {
  const G = window.G;

  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('selectstart', e => e.preventDefault());
  addEventListener('dblclick', e => e.preventDefault());
  addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });

  function init(canvas) {
    addEventListener('pointerdown', () => { G.Game.rt.lastInputAt = performance.now(); }, true);
    addEventListener('keydown', () => { G.Game.rt.lastInputAt = performance.now(); }, true);
    canvas.addEventListener('pointerdown', e => {
      if (G.UI.anyModal() || Platform.paused) return;
      const x = e.clientX, y = e.clientY;
      if (!G.Render.inScene(x, y)) return;
      e.preventDefault();
      if (G.Render.hitEnemy(x, y)) { G.Render.enemyFx(G.Game.hitEnemy(), x, y); return; }
      const n = G.Render.hitNode(x, y);
      if (n) { G.Render.collect(n); return; }
      if (G.Render.hitCart(x, y)) {
        if (G.Game.catchCart()) G.UI.showCart();
        return;
      }
      G.Game.tap(x, y);
    });

    addEventListener('keydown', e => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (G.UI.onKey(e.code)) { e.preventDefault(); return; }
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        if (G.UI.anyModal() || Platform.paused) return;
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
        e.preventDefault();
        G.Game.tap(G.Render.L.cx + (Math.random() - 0.5) * 60, G.Render.L.tipY + 30);
      }
    });
  }

  G.Input = { init };
})();
