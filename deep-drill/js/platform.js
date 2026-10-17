// CrazyGames SDK v3 layer. The only file that talks to window.CrazyGames.
window.Platform = (() => {
  const RU_LANGS = ['ru', 'be', 'kk', 'uk', 'uz'];
  const INTERSTITIAL_GAP_MS = 180000;
  const SAVE_KEY = 'deep-drill-save';
  let sdk = null, dataOk = false;
  let lastInterstitial = performance.now();
  let gameplayWanted = false, gameplayOn = false;
  const pauseReasons = new Set();
  const subs = { pause: [], resume: [], audio: [], ads: [], auth: [] };
  const P = { sdk: false, env: 'none', lang: 'en', mobile: false, adsOk: true, adblock: false, muted: false, accounts: false };
  let audioOff = false;

  const fire = (k, ...a) => subs[k].forEach(f => { try { f(...a); } catch (e) { console.error(e); } });

  function syncAudio() {
    const off = P.muted || [...pauseReasons].some(r => r !== 'adreq');
    if (off !== audioOff) { audioOff = off; fire('audio', off); }
  }

  function setPause(reason, on) {
    const was = pauseReasons.size > 0;
    on ? pauseReasons.add(reason) : pauseReasons.delete(reason);
    const now = pauseReasons.size > 0;
    if (was !== now) fire(now ? 'pause' : 'resume');
    syncGameplay();
    syncAudio();
  }

  // the SDK throttles gameplay events to one per second, so only the settled state is sent
  let gpLast = -Infinity, gpTimer = 0;
  function syncGameplay() {
    if (gpTimer) return;
    const wait = gpLast + 1050 - performance.now();
    if (wait > 0) { gpTimer = setTimeout(() => { gpTimer = 0; syncGameplay(); }, wait); return; }
    const should = gameplayWanted && !pauseReasons.has('menu') && !pauseReasons.has('ad') && !pauseReasons.has('adreq');
    if (should === gameplayOn) return;
    gameplayOn = should;
    gpLast = performance.now();
    try { should ? sdk?.game.gameplayStart() : sdk?.game.gameplayStop(); } catch (e) {}
  }

  // an SDK call must never hold the loading screen forever
  function withTimeout(promise, ms, fallback) {
    return Promise.race([Promise.resolve(promise).catch(() => fallback), new Promise(res => setTimeout(() => res(fallback), ms))]);
  }

  function langFrom(locale) {
    const l = String(locale || 'en').slice(0, 2).toLowerCase();
    return RU_LANGS.includes(l) ? 'ru' : 'en';
  }

  async function init() {
    document.addEventListener('visibilitychange', () => setPause('hidden', document.hidden));
    const S = !window.__NO_SDK__ && window.CrazyGames && window.CrazyGames.SDK;
    if (S) {
      try {
        if (await withTimeout(S.init().then(() => true), 8000, false) !== true) throw new Error('SDK init timeout');
        P.env = S.environment;
        if (P.env !== 'disabled') {
          sdk = S;
          P.sdk = true;
          try { sdk.game.loadingStart(); } catch (e) {}
          const info = sdk.user.systemInfo || {};
          P.lang = langFrom(info.locale);
          P.mobile = info.device?.type === 'mobile' || info.device?.type === 'tablet';
          P.muted = !!sdk.game.settings?.muteAudio;
          sdk.game.addSettingsChangeListener(s => { P.muted = !!s.muteAudio; syncAudio(); });
          P.accounts = !!sdk.user.isUserAccountAvailable;
          if (P.accounts) {
            try { const u = await withTimeout(sdk.user.getUser(), 1500, null); P.userId = u && u.userId ? String(u.userId) : null; } catch (e) {}
            sdk.user.addAuthListener(u => { P.userId = u && u.userId ? String(u.userId) : null; rememberUser(); fire('auth', u); });
          }
          try { P.adblock = !!(await withTimeout(sdk.ad.hasAdblock(), 1500, false)); } catch (e) {}
          if (P.adblock) P.adsOk = false;
          try { sdk.data.getItem(SAVE_KEY); dataOk = true; } catch (e) { dataOk = false; }
        }
      } catch (e) { console.warn('CrazyGames SDK init failed, offline mode', e); sdk = null; P.sdk = false; }
    }
    if (!sdk) {
      P.lang = langFrom(navigator.language);
      P.mobile = matchMedia('(pointer:coarse)').matches;
      try { P.userId = localStorage.getItem(LAST_USER_KEY) || null; } catch (e) {}
    } else rememberUser();
    syncAudio();
    return P;
  }

  function ready() { try { sdk?.game.loadingStop(); } catch (e) {} }
  function gameplay(on) { gameplayWanted = on; syncGameplay(); }
  function menuPause(on) { setPause('menu', on); }

  function adsUnavailable(err) {
    const code = err && err.code;
    if (code === 'adsDisabledBasicLaunch' || code === 'adblock') {
      if (P.adsOk) { P.adsOk = false; fire('ads', false); }
    }
  }

  function requestAd(type) {
    return new Promise(res => {
      setPause('adreq', true);
      let done = false;
      const finish = ok => { if (done) return; done = true; setPause('ad', false); setPause('adreq', false); res(ok); };
      try {
        sdk.ad.requestAd(type, {
          adStarted: () => setPause('ad', true),
          adFinished: () => finish(true),
          adError: err => { adsUnavailable(err); finish(false); },
        });
      } catch (e) { finish(false); }
    });
  }

  function canInterstitial() { return performance.now() - lastInterstitial >= INTERSTITIAL_GAP_MS; }
  async function showInterstitial() {
    if (!canInterstitial()) return false;
    lastInterstitial = performance.now();
    if (!sdk) return false;
    return requestAd('midgame');
  }
  async function showRewarded() {
    if (!sdk) { console.log('[offline] rewarded'); return new Promise(r => setTimeout(() => r(true), 400)); }
    if (!P.adsOk) return false;
    return requestAd('rewarded');
  }

  // The Data module is the main store. A same-device mirror in localStorage (one per account,
  // so people sharing a device never mix progress) covers an SDK that failed to load or a
  // Data-module write that was still debounced when the tab closed.
  const mirrorKey = () => P.userId ? SAVE_KEY + ':' + P.userId : SAVE_KEY;
  const LAST_USER_KEY = 'deep-drill-last-user';
  function rememberUser() {
    try { P.userId ? localStorage.setItem(LAST_USER_KEY, P.userId) : localStorage.removeItem(LAST_USER_KEY); } catch (e) {}
  }
  function storeGetAll() {
    const out = [];
    try { if (sdk && dataOk) out.push(sdk.data.getItem(SAVE_KEY)); } catch (e) {}
    try { out.push(localStorage.getItem(mirrorKey())); } catch (e) {}
    return out.filter(Boolean);
  }
  function storeSet(str) {
    try { if (sdk && dataOk) sdk.data.setItem(SAVE_KEY, str); } catch (e) {}
    try { localStorage.setItem(mirrorKey(), str); } catch (e) {}
  }

  async function getUser() { try { return sdk && P.accounts ? await withTimeout(sdk.user.getUser(), 3000, null) : null; } catch (e) { return null; } }
  async function askAuth() {
    try { return !!(await sdk.user.showAuthPrompt()); } catch (e) { return false; }
  }

  function happytime() { try { sdk?.game.happytime(); } catch (e) {} }

  function now() { return Date.now(); }
  function dayIndex(t = now()) { return Math.floor(t / 86400e3); }
  function weekday(t = now()) { return new Date(t).getUTCDay(); }

  return {
    init, ready, gameplay, menuPause, showInterstitial, canInterstitial, showRewarded,
    storeGetAll, storeSet, getUser, askAuth, happytime, now, dayIndex, weekday,
    onPause: f => subs.pause.push(f), onResume: f => subs.resume.push(f),
    onAudio: f => subs.audio.push(f), onAds: f => subs.ads.push(f), onAuth: f => subs.auth.push(f),
    get paused() { return pauseReasons.size > 0; },
    get audioOff() { return audioOff; },
    get adsOk() { return P.adsOk; },
    info: P,
  };
})();
