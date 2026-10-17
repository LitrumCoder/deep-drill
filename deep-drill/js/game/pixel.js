(() => {
  const G = window.G;

  // shared palette for icons and small sprites
  const PAL = {
    o: '#1A1020', w: '#FFFFFF', l: '#C9D2DE', g: '#8C96A6', d: '#4A5260',
    y: '#FFD447', Y: '#FFF2A8', O: '#E89A1C', r: '#E8434F', R: '#A82334',
    c: '#4FD1F0', C: '#B9F3FF', b: '#3A8DFF', B: '#1D5FB0', G: '#3CC66B', e: '#22914A',
    p: '#9B5DE5', P: '#C59BFF', t: '#E8DCC4', T: '#8E6E52', u: '#B07A45', U: '#6E4520',
    s: '#F2B98A', S: '#9A6440', m: '#FF5A8A', k: '#2A2A30', x: 'currentColor',
  };

  function norm(rows) {
    const w = Math.max(...rows.map(r => r.length));
    return rows.map(r => r.padEnd(w, '.'));
  }

  // ---------- sprites (offscreen canvases) ----------
  const cache = new Map();
  function sprite(key, rows, pal = PAL) {
    if (cache.has(key)) return cache.get(key);
    rows = norm(rows);
    const c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        x.fillStyle = pal[ch] || PAL[ch] || '#f0f';
        x.fillRect(i, y, 1, 1);
      }
    });
    cache.set(key, c);
    return c;
  }

  // ---------- svg icons for the html layer ----------
  function svgIcon(rows, pal = PAL) {
    rows = norm(rows);
    const w = rows[0].length, h = rows.length;
    let body = '';
    rows.forEach((row, y) => {
      let i = 0;
      while (i < row.length) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') { i++; continue; }
        let j = i;
        while (j < row.length && row[j] === ch) j++;
        body += `<rect x="${i}" y="${y}" width="${j - i}" height="1" fill="${pal[ch] || PAL[ch]}"/>`;
        i = j;
      }
    });
    return `<svg class="ic" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
  }

  const ICONS = {
    coin: ['....oooo....', '..ooyyyyoo..', '.oyYYyyyyOo.', '.oyYyyOyyOo.', 'oyYyyyOyyyOo', 'oyYyyyOyyyOo', 'oyYyyyOyyyOo', 'oyyyyyOyyyOo', '.oyyyyOyyOo.', '.oOyyyyyOOo.', '..ooOOOOoo..', '....oooo....'],
    gem: ['............', '..oooooooo..', '.oCCwCCcCco.', 'oCwCCCcCccBo', 'oooooooooooo', '.oCcccccBBo.', '..oCcccBBo..', '...oCccBo...', '....oCBo....', '.....oo.....', '............', '............'],
    shard: ['.....o......', '....oYo.....', '....oYOo....', '...oYyOo....', 'oooYyyyOooo.', 'oYYyyYyyyOOo', '.ooOyyyyOoo.', '...oOyyOo...', '....oyOo....', '....oOo.....', '.....o......', '............'],
    bolt: ['.......oooo.', '......oyyyo.', '.....oyyyo..', '....oyyyo...', '...oyyyooo..', '..oyyyyyyo..', '..oooyyyo...', '....oyyo....', '...oyyo.....', '...oyo......', '..oyo.......', '..oo........'],
    gift: ['..oo....oo..', '.oyyo..oyyo.', '.oyoyooyoyo.', 'oooooyyooooo', 'orrrryyrrrro', 'oRRRRyyRRRRo', 'oooooyyooooo', '.orrryyrrro.', '.orrryyrrro.', '.oRRRyyRRRo.', '.oRRRyyRRRo.', '.oooooooooo.'],
    tasks: ['....oooo....', '.oooTTTTooo.', '.otttttttto.', '.otGttdddto.', '.oGtGttttto.', '.otttttttto.', '.otGttdddto.', '.oGtGttttto.', '.otttttttto.', '.otttdddtto.', '.otttttttto.', '.oooooooooo.'],
    geode: ['............', '....oooo....', '..ooggggoo..', '.ogglgggdo..', '.oglgggggdo.', 'oggggggggddo', 'ogggdggggddo', 'ogggggggdddo', '.ogggggdddo.', '..oddddddo..', '...oooooo...', '............'],
    geodeOpen: ['............', '....oooo....', '..ooggggoo..', '.oggoooogdo.', '.ogoPwPPodo.', 'ogoPpPwPpodo', 'ogoPPpPPPodo', 'oggoPPpPoddo', '.ogdooooddo.', '..oddddddo..', '...oooooo...', '............'],
    up: ['.....xx.....', '....xxxx....', '...xxxxxx...', '..xxxxxxxx..', '.xxxxxxxxxx.', '....xxxx....', '....xxxx....', '....xxxx....', '....xxxx....', '....xxxx....', '....xxxx....', '............'],
    planet: ['............', '....oooo....', '..oobbGboo..', '.obGGGbbbbo.', '.obbbbbGGbo.', 'yyobbbbbboyy', 'YyyyyyyyyyyY', '.obGbbbbbbo.', '.obGGbbbbbo.', '..oobbbboo..', '....oooo....', '............'],
    bag: ['....xxxx....', '...x....x...', '...x....x...', '.xxxxxxxxxx.', '.xxxxxxxxxx.', '.xxxxxxxxxx.', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', '.xxxxxxxxxx.'],
    gear: ['.....xx.....', '.x..xxxx..x.', '.xxxxxxxxxx.', '..xxxxxxxx..', '.xxxx..xxxx.', 'xxxx....xxxx', 'xxxx....xxxx', '.xxxx..xxxx.', '..xxxxxxxx..', '.xxxxxxxxxx.', '.x..xxxx..x.', '.....xx.....'],
    video: ['............', '.xxxxxxxxxx.', 'x..........x', 'x...x......x', 'x...xxx....x', 'x...xxxxx..x', 'x...xxxxx..x', 'x...xxx....x', 'x...x......x', 'x..........x', '.xxxxxxxxxx.', '............'],
    check: ['............', '..........xx', '.........xxx', '........xxx.', '.......xxx..', 'xx....xxx...', 'xxx..xxx....', '.xxxxxx.....', '..xxxx......', '...xx.......', '............', '............'],
    close: ['xx........xx', 'xxx......xxx', '.xxx....xxx.', '..xxx..xxx..', '...xxxxxx...', '....xxxx....', '....xxxx....', '...xxxxxx...', '..xxx..xxx..', '.xxx....xxx.', 'xxx......xxx', 'xx........xx'],
    trophy: ['..oooooooo..', 'ooyYyyyyyOoo', 'oyoYyyyyyOyo', 'oyoYyyyyyOyo', '.ooYyyyyyOo.', '..oYyyyyOo..', '...oyyyOo...', '....oOOo....', '.....yO.....', '....oyOo....', '..oyyyyyOo..', '..oooooooo..'],
    drill: ['..oooooooo..', '..oyYyyyyo..', '..oybbbbyo..', '..oyyyyyyo..', '..okykykyo..', '..oooooooo..', '..olllgggo..', '...olgldo...', '...olgdgo...', '....olgo....', '....oldo....', '.....oo.....'],
    engine: ['............', '...oooooo...', '...oggggo...', '.oooooooooo.', '.olllllllgo.', '.ollyylllgoo', '.ollyyllggoo', '.olllyyllgoo', '.olllllllgo.', '.oooooooooo.', '..oo....oo..', '............'],
    sorter: ['............', 'oooooooooooo', 'obbybbrbbcbo', '.obbbbbbbbo.', '..obbbbbbo..', '...obbbbo...', '....obbo....', '....obbo....', '....obbo....', '....obbo....', '....oooo....', '............'],
    grip: ['............', '...ooooooo..', '..osSoSsoSso', '.ooSsoSsoSso', 'osssssssssso', 'osSsssssssso', 'osSsssssssSo', 'osssssssssSo', '.osssssssSo.', '..osssssSo..', '...ooooooo..', '............'],
    storage: ['............', '.oooooooooo.', '.ouuuuuuuuo.', '.oUUUUUUUUo.', '.ouUuuuuUuo.', '.ouuUuuUuuo.', '.ouuuUUuuuo.', '.ouuUuuUuuo.', '.ouUuuuuUuo.', '.oUUUUUUUUo.', '.oooooooooo.', '............'],
    boom: ['.....o......', '.o..oOo..o..', '..ooOyOooo..', '..oyyYYyyo..', 'ooOyYwwYyOoo', '.oOyYwwYyOo.', '..oyyYYyyo..', '..ooOyyOoo..', '.o..oOOo..o.', '.....oo.....', '............', '............'],
    cart: ['............', '...yy.gg.rr.', '..yYygGgrRr.', 'oooooooooooo', 'ouuuuuuuuuuo', '.oUUUUUUUUo.', '.ouuuuuuuuo.', '..oooooooo..', '..odo..odo..', '...o....o...', '............', '............'],
    hand: ['...oo.......', '..owwo......', '..owwo......', '..owwoooo...', '..owwowwoo..', 'oooowwwwwwo.', 'owwowwwwwwwo', 'owwwwwwwwwwo', '.owwwwwwwwwo', '..owwwwwwwo.', '...owwwwwo..', '....ooooo...'],
    sound: ['............', '......x.....', '.....xx..x..', 'xxxxxxx...x.', 'xxxxxxx.x.x.', 'xxxxxxx.x.x.', 'xxxxxxx.x.x.', 'xxxxxxx...x.', '.....xx..x..', '......x.....', '............', '............'],
    music: ['....xxxxxxxx', '....xxxxxxxx', '....x......x', '....x......x', '....x......x', '....x......x', '....x...xxxx', 'xxxxx..xxxxx', 'xxxxx..xxxxx', '.xxx....xxx.', '............', '............'],
    vibro: ['...xxxxxx...', '...x....x...', 'x..x....x..x', 'x..x....x..x', '.x.x....x.x.', 'x..x....x..x', 'x..x....x..x', '...x....x...', '...x.xx.x...', '...xxxxxx...', '............', '............'],
    shake: ['....xxxxx...', '....x...x...', 'x...x...x..x', '.x.x...x..x.', 'x..x...x...x', '.x.x...x..x.', 'x.x...x...x.', '..x...x.....', '..x.xxx.....', '..xxxx......', '............', '............'],
    globe: ['...xxxxxx...', '..x..x...x..', '.x..x.....x.', 'x...x......x', 'xxxxxxxxxxxx', 'x...x...x..x', 'x...x...x..x', 'xxxxxxxxxxxx', 'x....x....x.', '.x...x...x..', '..x..x..x...', '...xxxxxx...'],
    num: ['............', '.x..xxx.xxx.', 'xx....x...x.', '.x..xxx..xx.', '.x..x.....x.', 'xxx.xxx.xxx.', '............', '............', '............', '............', '............', '............'],
    user: ['....xxxx....', '...xxxxxx...', '...xxxxxx...', '...xxxxxx...', '....xxxx....', '............', '..xxxxxxxx..', '.xxxxxxxxxx.', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', '............'],
    fire: ['.....o......', '....oro.....', '....orro..o.', '...orrOro.oo', '..orrOOroorO', '.orrOyyOrrro', '.orOyyyyOrro', 'orrOyYYyOrro', 'orOyYwwYyOro', '.orOyYYyOro.', '..ooOyyOoo..', '....oooo....'],
    relic: ['....oooo....', '..ooPPPPoo..', '.oPPpppPPPo.', '.oPpwpppPpo.', 'oPppppwpppPo', 'oPpwppppppPo', 'oPppppppwpPo', 'oPpppwppppPo', '.oPpppppPPo.', '.oPPpppPPPo.', '..ooPPPPoo..', '....oooo....'],
  };
  const iconCache = {};
  function icon(name) { return iconCache[name] || (iconCache[name] = svgIcon(ICONS[name])); }
  function iconSprite(name) { return sprite('icon-' + name, ICONS[name]); }

  // ---------- treasure node sprites ----------
  const NODES = {
    nugget: ['..........', '...oo.....', '..oYyo.oo.', '.oYyyyoYyo', '.oyyyOoyOo', '..oyOOoOo.', '...ooYyyo.', '....oyyOo.', '.....ooo..', '..........'],
    gem: ['....oo....', '...oCwo...', '..oCwCco..', '.oCCCccco.', 'oCCCcccBBo', '.oCcccBBo.', '..oCcBBo..', '...oBBo...', '....oo....', '..........'],
    chest: ['..........', '.oooooooo.', 'ouuuuuuuuo', 'oUUUUUUUUo', 'ooooyyoooo', 'ouuuyOuuuo', 'ouuuuuuuuo', 'oUUUUUUUUo', '.oooooooo.', '..........'],
    tnt: ['......Y...', '.....oyw..', '....o.Y...', '..ooooo...', '.orRrRro..', '.orRrRro..', '.owwwwwo..', '.orRrRro..', '.orRrRro..', '..ooooo...'],
    heat: ['....o.....', '...oro....', '...orro.o.', '..orOrooro', '.orOyyOrro', '.oOyYYyOro', 'orOyYwYyOo', '.oOyYYyOo.', '..ooOOoo..', '....oo....'],
    relic: ['...oooo...', '..oPPPPo..', '.oPpwppPo.', 'oPpppwppPo', 'oPwpppppPo', 'oPppwpppPo', 'oPpppppwPo', '.oPpppppo.', '..oPPPPo..', '...oooo...'],
  };
  function node(type) { return sprite('node-' + type, NODES[type]); }

  // ---------- relics (12 collectibles) ----------
  const RELICS = [
    ['..oooooo..', '.otttttto.', 'otTTTTTtto', 'otToooTTto', 'otTotToTto', 'otTottoTto', 'otTooooTto', 'otTTTTTTto', '.otttttto.', '..oooooo..'],
    ['...oooo...', '..ollllo..', '.oldllldo.', '.ollllllo.', '.oddddddo.', '.ollllllo.', '.oddddddo.', '.ollllllo.', '..oddddo..', '...oooo...'],
    ['..oooooo..', '.owwwwwwo.', 'owwowwowwo', 'owookooowo', 'owwwwwwwwo', '.owwwwwwo.', '.owowowoo.', '..owowowo.', '...oooooo.', '..........'],
    ['....oo....', '...oGGo...', '..oGeeGo..', '.oGeGGeGo.', '..oGeeGo..', '.oGeGGeGo.', '..oGeeGo..', '...oGGo...', '....oo....', '....oo....'],
    ['..oooooo..', '.oOyyyyOo.', 'oOyyyyyyOo', 'oyyyokyyyo', 'oyykkkkyyo', 'oyyyokyyyo', 'oyyykykyyo', 'oOyyyyyyOo', '.oOyyyyOo.', '..oooooo..'],
    ['oo........', 'owo.......', 'otwo......', '.otwo.....', '.ottwo....', '..ottwoo..', '...otttwo.', '....ootttw', '......oooo', '..........'],
    ['...oooo...', '..oGGGGo..', '.oGGeGGGo.', '.oGGGGeGo.', 'oGeGGGGGGo', 'oGGGGeGGGo', 'oGGeGGGGeo', '.oGGGGGGo.', '..oGGGGo..', '...oooo...'],
    ['..........', '.oo....oo.', 'oCCo..oCCo', 'oCwCooCCco', 'oCCCCCCcco', '.oCCCCcco.', '..oCCcco..', '...oCco...', '....oo....', '..........'],
    ['...oooo...', '..orrrro..', '.orOyyOro.', 'orOyYYyOro', 'orOYwYyOro', 'orOyYYyOro', 'orrOyyOrro', '.orrOOrro.', '..orrrro..', '...oooo...'],
    ['....oo....', '....oyo...', '...oyYo...', 'oooyYYyooo', 'oyyYwwYyyo', '.oyyYYyyo.', '..oyyyyo..', '.oyyooyyo.', '.oyo..oyo.', '.oo....oo.'],
    ['..oooooo..', '.oOyyyyOo.', 'oOyYYYYyOo', 'oyYyooyyyo', 'oyYo..oyyo', 'oyYo..oyyo', 'oyyyooyyOo', 'oOyyyyyOOo', '.oOOOOOOo.', '..oooooo..'],
    ['...oooo...', '..oyyyyo..', '..oykkyo..', '..oyyyyo..', '.ooyyyyoo.', 'oyoyyyyoyo', '..oyOOyo..', '..oyyyyo..', '.oyyooyyo.', '.oooooooo.'],
  ];
  const RELIC_REQ = [1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  function relic(i) { return sprite('relic-' + i, RELICS[i]); }

  // ---------- drill ----------
  const BODY = {
    classic: ['....pp........pp....', '...oPPo......oPPo...', '...oPpo......oPpo...', '.oooooooooooooooooo.', 'oLLLLLLLLLLLLLLLLLbo', 'oLBBBBBBBBBBBBBBBBbo', 'oLBBoooooooooooBBBbo', 'oLBBowWWwwwwwwoBBBbo', 'oLBBoWWwwwwwwwoBBBbo', 'oLBBowwwwwwwwwoBBBbo', 'oLBBoooooooooooBBBbo', 'oLBBBBBBBBBBBBBBBBbo', 'obbbbbbbbbbbbbbbbbbo', '.oooooooooooooooooo.', '..oLBBBBBBBBBBBBbo..', '..oyykkyykkyykkyyo..', '..okkyykkyykkyykko..', '..oLBBBBBaaBBBBBbo..', '..oLBBBBBBBBBBBBbo..', '.oooooooooooooooooo.', 'omMMMMMMMMMMMMMMMmno', 'onnnnnnnnnnnnnnnnnno', '.oooooooooooooooooo.'],
  };
  BODY.gold = BODY.classic.map((r, i) => i === 15 ? '..oLBLBLBLBLBLBLBo..' : i === 16 ? '..oBLBLBLBLBLBLBLo..' : r);
  BODY.neon = BODY.classic.map((r, i) => i === 15 ? '..oaaaaaaaaaaaaaao..' : i === 16 ? '..okkkkkkkkkkkkkko..' : r);
  BODY.rocket = BODY.classic.map((r, i) => ({
    0: '....................', 1: '.........oo.........', 2: '........oaao........',
    6: 'oLBBBBBoooooBBBBBBbo', 7: 'oLBBBBowWwwwoBBBBBbo', 8: 'oLBBBBoWwwwwoBBBBBbo', 9: 'oLBBBBowwwwwoBBBBBbo', 10: 'oLBBBBBoooooBBBBBBbo',
    14: '.foLBBBBBBBBBBBBbof.', 15: 'ffoaaaaaaaaaaaaaaoff', 16: 'ffoLBBBBBBBBBBBBboff', 17: 'f.oLBBBBBBBBBBBBbo.f',
  })[i] || r);
  BODY.dragon = BODY.classic.map((r, i) => ({
    0: '..h..............h..', 1: '..hh............hh..', 2: '...hh..........hh...',
    6: 'oLBBBBBBBBBBBBBBBBbo', 7: 'oLByyyBBBBBByyyBBBbo', 8: 'oLBykyBBBBBBykyBBBbo', 9: 'oLByyyBBBBBByyyBBBbo', 10: 'oLBBBBBBBBBBBBBBBBbo',
    15: '..oBbBbBbBbBbBbBbo..', 16: '..obBbBbBbBbBbBbBo..',
  })[i] || r);
  BODY.unicorn = BODY.classic.map((r, i) => ({
    0: '....rrggbbppvv......', 1: '...rrggbbppvvyy.....', 2: '..rrggbbppvvyyrr....',
    15: '..oLBBBBBBBBBBBBbo..', 16: '..oLBBBBBssBBBBBbo..',
  })[i] || r);

  const SKINPAL = {
    classic: { o: '#2A1A10', L: '#FFE08A', B: '#F2B632', b: '#B07A10', w: '#5FB8E8', W: '#D8F4FF', a: '#E8434F', y: '#F2C230', k: '#2A2A2A', m: '#8C96A6', M: '#C9D2DE', n: '#5A6472', p: '#3A3A42', P: '#6A6A74',
      head: ['#E6ECF2', '#B8C2CF', '#7E8A9A', '#4A5260'], spark: '#FFD86B' },
    rocket: { o: '#1A1A2A', L: '#FFFFFF', B: '#E8EAF2', b: '#A9AEC0', w: '#5FB8E8', W: '#D8F4FF', a: '#3A8DFF', f: '#E8434F', k: '#2A2A2A', m: '#8C96A6', M: '#C9D2DE', n: '#5A6472', p: '#3A3A42', P: '#6A6A74',
      head: ['#FF9AA8', '#E8434F', '#A82334', '#5A0E18'], spark: '#FF9F2E' },
    dragon: { o: '#0E2414', L: '#7FE89A', B: '#3DBB6A', b: '#1E7A3E', y: '#FFE14D', k: '#111', h: '#F1E3B0', m: '#B8A26A', M: '#F1E3B0', n: '#7A6A40', a: '#FF5A2E', w: '#5FB8E8', W: '#D8F4FF',
      head: ['#FFF6D8', '#F1E3B0', '#B8A26A', '#6E5E30'], spark: '#FF6A2A' },
    gold: { o: '#4A2E00', L: '#FFF2A8', B: '#FFD447', b: '#C9930E', w: '#FFF6D0', W: '#FFFFFF', a: '#FFFFFF', y: '#F2C230', k: '#2A2A2A', m: '#E2B23A', M: '#FFE98A', n: '#A87A10', p: '#A87A10', P: '#E2B23A',
      head: ['#FFF6C8', '#FFE070', '#D4A21A', '#8A6608'], spark: '#FFF2A8' },
    neon: { o: '#25F4EE', L: '#2C3060', B: '#1C1F3A', b: '#0C0E20', w: '#FE2C8B', W: '#FFB0D8', a: '#FE2C8B', k: '#25F4EE', m: '#25F4EE', M: '#9AFFFC', n: '#0E8C8A', p: '#25F4EE', P: '#9AFFFC',
      head: ['#9AFFFC', '#25F4EE', '#0E8C8A', '#FE2C8B'], spark: '#25F4EE' },
    unicorn: { o: '#5A3A6A', L: '#FFFFFF', B: '#FFF0FA', b: '#E0BCD8', w: '#8FD3FF', W: '#E8F8FF', a: '#C59BFF', k: '#2A2A2A', m: '#E0BCD8', M: '#FFF4FB', n: '#B57FD9', s: '#FFD447',
      r: '#FF9CE0', g: '#9CFFC8', bb: '#8FD3FF', pp: '#C59BFF', v: '#FFE27A', y: '#FFB3B3',
      head: ['#FFF4FB', '#FFB3E6', '#C59BFF', '#8A5AB0'], rainbow: ['#FF6FB5', '#B98CFF', '#6FC8FF', '#7FF0B0', '#FFE27A'], spark: '#FF9CE0' },
  };
  SKINPAL.unicorn.b = '#E0BCD8';
  const uniMane = { r: '#FF9CE0', g: '#9CFFC8', b: '#8FD3FF', p: '#C59BFF', v: '#FFE27A', y: '#FFB3B3' };

  function bodySprite(id) {
    const pal = Object.assign({}, SKINPAL[id] || SKINPAL.classic);
    let rows = BODY[id] || BODY.classic;
    if (id === 'unicorn') {
      rows = rows.map((r, i) => i < 3 ? r.replace(/[rgbpvy]/g, ch => ({ r: '1', g: '2', b: '3', p: '4', v: '5', y: '6' })[ch]) : r);
      Object.assign(pal, { 1: uniMane.r, 2: uniMane.g, 3: uniMane.b, 4: uniMane.p, 5: uniMane.v, 6: uniMane.y });
    }
    return sprite('body-' + id, rows, pal);
  }

  const DW = 20, BODY_H = 23, HEAD_H = 16;

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
  const HEAD_LEN = [16, 16, 17, 18, 20, 22];
  const HEAD_HW = [8, 8, 8, 9, 9, 10];
  const HEAD_TINT = [null, null, '#7F9FBF', '#D8E6F8', '#9FF0FF', '#FF7AF0'];
  const mixc = (a, b, t) => G.mixColor ? G.mixColor(a, b, t) : a;

  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }

  function drawAddons(c, x, y, L, phase, pal) {
    const f = Math.floor(phase);
    // engine
    if (L.engine >= 1) {
      for (const ex of [4, 14]) {
        px(c, x + ex - 1, y - 3, 4, 3, '#1A1020'); px(c, x + ex, y - 3, 2, 3, L.engine >= 4 ? '#5AF0FF' : '#6A6A74');
        if (L.engine >= 3) px(c, x + ex, y - 5 - (f % 2), 2, 2 + (f % 2), f % 3 ? '#FF9F2E' : '#FFE27A');
      }
    }
    if (L.engine >= 2) {
      px(c, x + 7, y - 5, 6, 5, '#1A1020'); px(c, x + 8, y - 4, 4, 3, '#8C96A6');
      const b = f % 2;
      px(c, x + 8 + b, y - 4, 1, 3, '#2A2A30'); px(c, x + 10 + b, y - 4, 1, 3, '#2A2A30');
      if (L.engine >= 4) { px(c, x + 9, y - 3, 2, 1, (f % 4) < 2 ? '#5AF0FF' : '#FFFFFF'); }
    }
    // storage crates on the left of the cab
    if (L.storage >= 1) {
      const crates = L.storage >= 3 ? 3 : L.storage;
      for (let k = 0; k < crates; k++) {
        const cy = y + 12 - (k + 1) * 4 - k;
        const vault = L.storage >= 4;
        px(c, x - 6, cy, 6, 5, '#1A1020');
        px(c, x - 5, cy + 1, 4, 3, vault ? '#8C96A6' : '#B07A45');
        px(c, x - 5, cy + 2, 4, 1, vault ? '#5A6472' : '#6E4520');
        if (vault && k === crates - 1) px(c, x - 4, cy + 1, 2, 2, '#FFD447');
      }
      px(c, x - 1, y + 6, 1, 1, '#1A1020');
    }
    // sorter hopper on the right of the cab
    if (L.sorter >= 1) {
      const big = L.sorter >= 2;
      const hx = x + 20, hy = y + 5, w = big ? 6 : 4, h = big ? 8 : 6;
      px(c, hx, hy, w + 1, h + 1, '#1A1020');
      px(c, hx, hy + 1, w, h - 1, L.sorter >= 4 ? '#FFD447' : '#3A8DFF');
      px(c, hx, hy + 1, w, 1, L.sorter >= 4 ? '#FFF2A8' : '#7FB8FF');
      const ores = ['#FFD447', '#E8344E', '#2ECC71', '#4FD1F0'];
      for (let k = 0; k < (L.sorter >= 3 ? 4 : 2); k++) px(c, hx + 1 + (k % 3), hy - 1 - (k > 2 ? 1 : 0), 1, 1, ores[(k + (f >> 2)) % 4]);
      if (L.sorter >= 3 && f % 6 < 3) px(c, hx + w - 1, hy - 2, 1, 1, '#FFFFFF');
    }
    // grip arms on the lower body
    if (L.grip >= 1) {
      const reach = [0, 2, 3, 5, 5][L.grip];
      const pump = L.grip >= 3 ? (f % 4 < 2 ? 1 : 0) : 0;
      const col = L.grip >= 4 ? '#FFD447' : '#8C96A6', dk = L.grip >= 4 ? '#C9930E' : '#4A5260';
      for (const sgn of [-1, 1]) {
        const ax = sgn < 0 ? x + 2 - reach - pump : x + 17 + pump;
        px(c, ax - 1, y + 14, reach + 3, 6, '#1A1020');
        px(c, ax, y + 15, reach + 1, 4, col);
        px(c, ax, y + 18, reach + 1, 1, dk);
        if (L.grip >= 2) { const tx = sgn < 0 ? ax - 1 : ax + reach + 1; px(c, tx, y + 19, 1, 3, dk); px(c, tx, y + 21, 1, 1, '#1A1020'); }
      }
    }
  }

  // draws the drill with its body's top-left at (x, y) in pixel space; phase spins the head
  function drawDrill(c, x, y, id, phase, heatGlow, L) {
    L = L || { head: 0, engine: 0, grip: 0, sorter: 0, storage: 0 };
    const pal = SKINPAL[id] || SKINPAL.classic;
    c.drawImage(bodySprite(id), x, y);
    drawAddons(c, x, y, L, phase, pal);
    const hy = y + BODY_H;
    const tint = HEAD_TINT[L.head];
    let [hl, hm, hd, hg] = pal.head;
    if (tint) { hl = mixc(hl, tint, 0.4); hm = mixc(hm, tint, 0.4); hd = mixc(hd, tint, 0.45); hg = mixc(hg, tint, 0.3); }
    const H = HEAD_LEN[L.head], HW = HEAD_HW[L.head];
    const ph = Math.floor(phase) % 5;
    const fr = Math.floor(phase);
    for (let r = 0; r < H; r++) {
      const half = Math.max(1, Math.round(HW * (1 - r / H)));
      const left = 10 - half, right = 10 + half - 1;
      for (let i = left; i <= right; i++) {
        let col;
        if (i === left || i === right) col = L.head >= 5 ? (((r + fr) & 2) ? '#FF5AF0' : '#5AF0FF') : pal.o;
        else {
          const u = (i - left) / Math.max(1, right - left);
          const groove = ((i - r + ph) % 5 + 5) % 5 < 2;
          if (groove) col = pal.rainbow ? pal.rainbow[((i + r + 50 - ph) >> 1) % 5] : hg;
          else col = u < 0.3 ? hl : u < 0.68 ? hm : hd;
          if (L.head >= 4 && groove && ((i * 7 + r * 3 + fr) % 11) === 0) col = '#FFFFFF';
        }
        c.fillStyle = col;
        c.fillRect(x + i, hy + r, 1, 1);
      }
      if (L.head >= 1 && r % 3 === 1 && half > 2) {
        const tl = L.head >= 2 ? 2 : 1;
        const toothCol = L.head >= 4 ? '#BFF6FF' : hd;
        const off = ((r + ph) % 2);
        px(c, x + left - tl, hy + r + off, tl, 1, toothCol); px(c, x + right + 1, hy + r + 1 - off, tl, 1, toothCol);
      }
    }
    c.fillStyle = L.head >= 5 ? '#FFFFFF' : pal.o;
    c.fillRect(x + 9, hy + H, 2, 1);
    if (heatGlow > 0) {
      c.globalAlpha = Math.min(0.55, heatGlow);
      c.fillStyle = '#FF5A1E';
      for (let r = 0; r < H; r += 2) {
        const half = Math.max(1, Math.round(HW * (1 - r / H)));
        c.fillRect(x + 10 - half + 1, hy + r, half * 2 - 2, 1);
      }
      c.globalAlpha = 1;
    }
    if (id === 'gold' || id === 'neon') {
      const tw = Math.floor(phase / 3) % 4;
      c.fillStyle = id === 'gold' ? '#FFFFFF' : '#FE2C8B';
      const pts = [[3, 5], [15, 12], [6, 18], [13, 2]];
      const [sx, sy] = pts[tw];
      c.fillRect(x + sx, y + sy - 1, 1, 3); c.fillRect(x + sx - 1, y + sy, 3, 1);
    }
  }
  const DRILL = { W: DW, H: BODY_H + HEAD_H + 1, BODY_H };
  const sparkColor = id => (SKINPAL[id] || SKINPAL.classic).spark;

  // ---------- underground enemies ----------
  const ENEMY = {
    mole: ['....oooooo....', '..ooBBBBBBoo..', '.oBbbbbbbbbBo.', '.oBbkbbbbkbbo.', 'oBbbbbbbbbbbbo', 'oBbbbbppbbbbbo', 'obbbbbppbbbbbo', '.obbbwwwwbbbo.', '.obbbbbbbbbbo.', 'oyobbbbbbbboyo', 'oyyobbbbbboyyo', '.oo.oooooo.oo.'],
    spider: ['o....oooo....o', '.o..oPPPPo..o.', '..ooPpwpPPoo..', 'oooPppppppPooo', '.o.oPpkpkpo.o.', 'o..oPPppPPo..o', '..o.oPPPPo.o..', '.o...oooo...o.', 'o............o', '..............'],
    slime: ['....oooo....', '..ooYyyyoo..', '.oYyyyyyyyo.', '.oyykyykyyo.', 'oyyykyykyyyo', 'oyyyyyyyyyOo', 'oyyyywwyyyOo', 'oOyyyyyyyOOo', '.oOOOOOOOOo.', '..oooooooo..'],
    boulder: ['..oooo..', '.oglggo.', 'oglgggdo', 'ogggggdo', 'oggggddo', '.odddddo', '..oooo..'],
    sack: ['..oo..', '.osso.', 'osscso', 'oscsso', 'osssso', '.oooo.'],
    bot: ['..oooooo..', '.olllllgo.', '.olcllcgo.', '.ollmmlgo.', '..oooooo..', '...oddo...'],
    bat: ['oo........oo', 'opo.oooo.opo', 'oppoppppoppo', '.oppwppwppo.', '..oppppppo..', '...o.oo.o...'],
    golem: ['...oooooo...', '..oggggggo..', '..ogyggygo..', '..oggggggo..', '.oooggggooo.', 'oggoggggoggo', 'oggoggggoggo', 'oggoddddoggo', '.oo.oggo.oo.', '..oggo.oggo.', '..oddo.oddo.', '..oooo.oooo.'],
  };
  const enemyPal = Object.assign({}, PAL, { b: '#7A4A2A', B: '#A8724A', p: '#FF9AA8', k: '#111111', y: '#E8DCC4', s: '#C9A26A', c: '#FFD447' });
  const slimePal = Object.assign({}, PAL, { y: '#FF8A2A', Y: '#FFD08A', O: '#C2420A', k: '#111111', w: '#FFF6D8' });
  const petPal = Object.assign({}, PAL, { p: '#7A4FC0', w: '#FFE27A', m: '#E8434F', c: '#5AF0FF', y: '#FFD447', g: '#8C8494', d: '#55505E' });
  function enemy(type) {
    const pal = type === 'slime' ? slimePal : (type === 'bot' || type === 'bat' || type === 'golem') ? petPal : enemyPal;
    return sprite('enemy-' + type, ENEMY[type], pal);
  }

  // ---------- cart ----------
  const CART = ['......yY..gG.rR.....', '....yYYyygGGgrRRyy..', '..oyyYyyGgggRrrYyyo.', '.oooooooooooooooooo.', '.oWwwwwwwwwwwwwwwWo.', '.owddddddddddddddwo.', '..owddddddddddddwo..', '..owwwwwwwwwwwwwwo..', '...oooooooooooooo...', '....okko....okko....', '....okko....okko....', '.....oo......oo.....'];
  const cartPal = Object.assign({}, PAL, { y: '#FFD447', Y: '#FFF2A8', g: '#2ECC71', G: '#9CFFC8', r: '#E8344E', R: '#FF9AA8', o: '#2A1A10', W: '#B9C2D0', w: '#8A5A30', d: '#6E4520', k: '#55555E' });
  const cart = () => sprite('cart', CART, cartPal);

  // ---------- 5x7 bitmap font ----------
  const F5 = {
    '0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '], '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
    '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'], '3': ['#####', '   # ', '  #  ', '   # ', '    #', '#   #', ' ### '],
    '4': ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '], '5': ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
    '6': ['  ## ', ' #   ', '#    ', '#### ', '#   #', '#   #', ' ### '], '7': ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
    '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '], '9': [' ### ', '#   #', '#   #', ' ####', '    #', '   # ', ' ##  '],
    A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'], B: ['#### ', '#   #', '#   #', '#### ', '#   #', '#   #', '#### '],
    C: [' ### ', '#   #', '#    ', '#    ', '#    ', '#   #', ' ### '], D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
    E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'], F: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#    '],
    G: [' ### ', '#   #', '#    ', '# ###', '#   #', '#   #', ' ####'], H: ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
    I: [' ### ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '], J: ['  ###', '   # ', '   # ', '   # ', '   # ', '#  # ', ' ##  '],
    K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'], L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
    M: ['#   #', '## ##', '# # #', '# # #', '#   #', '#   #', '#   #'], N: ['#   #', '#   #', '##  #', '# # #', '#  ##', '#   #', '#   #'],
    O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '], P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
    Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'], R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
    S: [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '], T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
    U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '], V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
    W: ['#   #', '#   #', '#   #', '# # #', '# # #', '# # #', ' # # '], X: ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
    Y: ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '], Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
    '+': ['     ', '  #  ', '  #  ', '#####', '  #  ', '  #  ', '     '], '-': ['     ', '     ', '     ', '#####', '     ', '     ', '     '],
    '.': ['     ', '     ', '     ', '     ', '     ', ' ##  ', ' ##  '], ',': ['     ', '     ', '     ', '     ', ' ##  ', '  #  ', ' #   '],
    '!': ['  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '     ', '  #  '], '×': ['     ', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '     '],
    ':': ['     ', ' ##  ', ' ##  ', '     ', ' ##  ', ' ##  ', '     '], '/': ['    #', '    #', '   # ', '  #  ', ' #   ', '#    ', '#    '],
    '%': ['##  #', '## # ', '   # ', '  #  ', ' #   ', ' # ##', '#  ##'], ' ': ['     ', '     ', '     ', '     ', '     ', '     ', '     '],
  };
  const textCache = new Map();
  // renders text into a cached canvas (1 font pixel = 1 canvas pixel) with a dark outline
  function textSprite(str, color) {
    str = String(str).toUpperCase().replace(/ /g, ' ').replace(/e(?=\d)/gi, 'E');
    const key = str + '|' + color;
    if (textCache.has(key)) return textCache.get(key);
    if (textCache.size > 300) textCache.clear();
    const chars = [...str].map(ch => F5[ch] || F5[' ']);
    const w = chars.length * 6 + 1, h = 9;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const plot = (ox, oy, col) => {
      x.fillStyle = col;
      chars.forEach((g, ci) => g.forEach((row, ry) => {
        for (let i = 0; i < 5; i++) if (row[i] === '#') x.fillRect(1 + ci * 6 + i + ox, 1 + ry + oy, 1, 1);
      }));
    };
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) plot(ox, oy, '#140C18');
    plot(0, 0, color);
    textCache.set(key, c);
    return c;
  }

  G.Pix = { PAL, sprite, icon, svgIcon, node, relic, RELIC_REQ, RELIC_COUNT: RELICS.length, drawDrill, DRILL, sparkColor, cart, textSprite, SKINPAL,
    TIERS, tierOf, look, headLen: L => HEAD_LEN[L ? L.head : 0], enemy, iconSprite };
})();
