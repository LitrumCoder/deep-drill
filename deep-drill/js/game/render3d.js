import * as THREE from '../../vendor/three/three.module.min.js';

// 3D cross-section of the planet: the camera looks at a cut face of rock from the front and slightly above.
// The drill sits in a groove carved into the face. The rock scrolls up past the drill; the drill itself stays put.
const G = window.G;
const S = () => G.Save.data;

const U = 0.4;            // world units per meter of depth
const SW = 2.0;           // half width of the shaft groove, wide enough for every drill attachment
const GD = 1.8;           // groove depth into the face
const CELL = 1.0;
const FACE_W = 72;
const TILE_H = 16, TILE_ROWS = TILE_H / CELL, TILE_COLS = FACE_W / CELL;
const Y0 = 26;            // top of the scrolling face in world units
const NTILES = 4;
const DRILL_Z = -0.55;
const PLATE_T = 0.9;

let renderer, scene, camera, overlay, octx, W = 1, H = 1, dpr = 1;
const R = { x: 0, y: 0, w: 1, h: 1 };
const L = { cx: 0, cy: 0, tipY: 0, s: 60, k: 1, cart: null, enemy: null };
let sceneEl = null, ro = null;
let time = 0, shakeT = 0, shakeAmp = 0, flash = 0, anim = null;
let camDist = 20, camTarget = new THREE.Vector3(0, 2.0, -0.3), focus = { x: 0.5, y: 0.46 };
const bounds = { x0: -10, x1: 10, y0: -10, y1: 10 };

// ---------- small helpers ----------
function hash(n) {
  n = (n | 0) ^ 0x9e3779b9;
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  return (n ^ (n >>> 16)) >>> 0;
}
const frac = n => (hash(n) % 100000) / 100000;
const h2 = (a, b) => frac(a * 73856093 ^ b * 19349663);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const col = hex => new THREE.Color(hex);
const matCache = new Map();
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  let m = matCache.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.8, metalness: 0 }, o)); matCache.set(key, m); }
  return m;
}
function mesh(geo, material, cast = true, receive = false) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
const v3 = new THREE.Vector3();
function toScreen(x, y, z) {
  v3.set(x, y, z).project(camera);
  return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H };
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hitP = new THREE.Vector3();
function screenToFace(x, y, z = 0) {
  ndc.set(x / W * 2 - 1, 1 - y / H * 2);
  ray.setFromCamera(ndc, camera);
  planeZ.constant = -z;
  return ray.ray.intersectPlane(planeZ, hitP) ? hitP.clone() : new THREE.Vector3();
}

// ---------- state shortcuts ----------
const skinId = () => S().skins.active;
const planetOf = () => G.planet(S().planet);
let layerCols = [], layerColsKey = '';
function refreshPalette() {
  const pl = planetOf();
  const key = pl.base + '|' + pl.shift;
  if (key === layerColsKey) return;
  layerColsKey = key;
  // lit faces wash colours out, so the flat 2D palette gets a little more saturation here
  const hsl = {};
  layerCols = pl.layers.map(c => {
    col(c).getHSL(hsl, THREE.SRGBColorSpace);
    return new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s + 0.08), Math.max(hsl.l - 0.03, 0.2 + hsl.l * 0.35), THREE.SRGBColorSpace);
  });
  oreCols = pl.ores.map(o => o.map(c => col(c)));
  buildSurface();
}
let oreCols = [];

// ---------- scene ----------
let world, faceMat, plugMat, decorMats, beams, surface, surfacePlane, skyTex = {}, hemi, sun, headLamp, tipLight, coreGlow, coreLight;
const tiles = [];

function init(canvas, scene0) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer:coarse)').matches ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  overlay = document.createElement('canvas');
  overlay.id = 'fx';
  canvas.after(overlay);
  octx = overlay.getContext('2d');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.5, 300);
  world = new THREE.Group();
  scene.add(world);

  // tiny studio for reflections: metal parts need something to mirror
  const envScene = new THREE.Scene();
  const dome = new THREE.SphereGeometry(10, 24, 12);
  const dc = [];
  for (let i = 0; i < dome.attributes.position.count; i++) {
    const y = dome.attributes.position.getY(i) / 10;
    const c = new THREE.Color(0x5a4430).lerp(new THREE.Color(0xfff4e0), clamp(y * 0.7 + 0.45, 0, 1));
    dc.push(c.r, c.g, c.b);
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3));
  envScene.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
  for (const [x, y, z] of [[6, 6, 4], [-7, 4, 3], [0, 8, -6]]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    panel.position.set(x, y, z); panel.lookAt(0, 0, 0);
    envScene.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  hemi = new THREE.HemisphereLight(0xe8eeff, 0x4a3828, 1.4);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff2dd, 2.6);
  sun.position.set(9, 16, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  sun.shadow.bias = -0.0015;
  scene.add(sun, sun.target);
  headLamp = new THREE.PointLight(0xffd9a8, 40, 16, 1.6);
  headLamp.position.set(0, 2.6, 4.5);
  scene.add(headLamp);
  tipLight = new THREE.PointLight(0xffb060, 18, 9, 1.8);
  tipLight.position.set(0, -0.8, 1.6);
  scene.add(tipLight);

  surfacePlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  faceMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0, clippingPlanes: [surfacePlane] });
  decorMats = {
    rock: new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9, clippingPlanes: [surfacePlane] }),
    gem: new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.2, metalness: 0, emissive: 0x141414, clippingPlanes: [surfacePlane] }),
  };
  plugMat = faceMat.clone();
  plugMat.clippingPlanes = [surfacePlane, new THREE.Plane(new THREE.Vector3(0, -1, 0), FLOOR_Y)];
  for (let i = 0; i < NTILES; i++) tiles.push(makeTile());
  buildGroove();
  buildFloor();
  buildParticles();
  buildCart();
  coreGlow = mesh(new THREE.IcosahedronGeometry(7, 2), new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0xffe48a, emissiveIntensity: 1.5, flatShading: true }), false);
  coreGlow.visible = false;
  coreLight = new THREE.PointLight(0xffb040, 0, 40, 1.2);
  world.add(coreGlow, coreLight);
  refreshPalette();

  setScene(scene0);
  resize();
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 150));
  document.fonts?.load('900 20px Nunito');
}

function setScene(el) {
  sceneEl = el;
  if (window.ResizeObserver) {
    ro?.disconnect();
    ro = new ResizeObserver(measure);
    ro.observe(el);
  }
  measure();
}

function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  overlay.width = Math.round(W * dpr); overlay.height = Math.round(H * dpr);
  overlay.style.width = W + 'px'; overlay.style.height = H + 'px';
  measure();
}

// the drill is framed inside the free scene area; the rest of the canvas keeps showing the world behind the UI
let camFocusX = null, camFocusY = null, camDistTarget = 20, viewScale = 1;
function setViewScale(k) { viewScale = k; measure(); }
function measure() {
  if (!sceneEl || !renderer) return;
  const r = sceneEl.getBoundingClientRect();
  R.x = r.left; R.y = r.top; R.w = Math.max(1, r.width); R.h = Math.max(1, r.height);
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const unitsH = (R.w < R.h * 1.3 ? 9.6 : 11) * viewScale, unitsW = 9.5 * viewScale;
  camDistTarget = Math.max(unitsH * H / (R.h * 2 * tan), unitsW * H / (R.w * 2 * tan));
  camDistTarget = clamp(camDistTarget, 10, 70);
  const fx = R.x + R.w / 2, fy = R.y + R.h * 0.47;
  if (camFocusX == null) { camFocusX = fx; camFocusY = fy; camDist = camDistTarget; }
  focus.tx = fx; focus.ty = fy;
  L.k = clamp(Math.min(R.w / 620, R.h / 540), 1, 1.8);
}

function updateCamera(dt) {
  const a = 1 - Math.exp(-dt * 6);
  camFocusX = lerp(camFocusX, focus.tx, dt ? a : 1);
  camFocusY = lerp(camFocusY, focus.ty, dt ? a : 1);
  camDist = lerp(camDist, camDistTarget, dt ? a : 1);
  camera.aspect = W / H;
  camera.setViewOffset(W, H, W / 2 - camFocusX, H / 2 - camFocusY, W, H);
  const dir = new THREE.Vector3(0, 0.26, 1).normalize();
  const sx = shakeAmp ? (Math.random() - 0.5) * shakeAmp * 0.06 * (shakeT / 0.3) : 0;
  const sy = shakeAmp ? (Math.random() - 0.5) * shakeAmp * 0.06 * (shakeT / 0.3) : 0;
  camera.position.copy(camTarget).addScaledVector(dir, camDist);
  camera.position.x += sx; camera.position.y += sy;
  camera.lookAt(camTarget.x + sx, camTarget.y + sy, camTarget.z);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  // visible part of the face plane inside the scene rect
  const a0 = screenToFace(R.x + 8, R.y + 8), a1 = screenToFace(R.x + R.w - 8, R.y + R.h - 8);
  bounds.x0 = a0.x; bounds.x1 = a1.x; bounds.y1 = a0.y; bounds.y0 = a1.y;
}

// ---------- rock face tiles ----------
// each tile has the face on both sides of the shaft plus the strip in the middle that is only drawn below the drill
function tilePart(cols, material) {
  const nq = cols.length * TILE_ROWS;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nq * 18), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nq * 18), 3));
  return { mesh: mesh(geo, material, false, true), cols, triY: new Float32Array(nq * 2), triVar: new Float32Array(nq * 2) };
}
function makeTile() {
  const side = [], mid = [];
  for (let c = 0; c < TILE_COLS; c++) (Math.abs(-FACE_W / 2 + (c + 0.5) * CELL) > SW ? side : mid).push(c);
  const main = tilePart(side, faceMat), plug = tilePart(mid, plugMat);
  const m = main.mesh;
  world.add(m);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.42, 0), decorMats.rock, 30);
  const crystal = new THREE.CylinderGeometry(0, 0.2, 0.75, 5, 1);
  crystal.translate(0, 0.3, 0);
  const gems = new THREE.InstancedMesh(crystal, decorMats.gem, 34);
  rocks.castShadow = gems.castShadow = true;
  rocks.receiveShadow = true;
  m.add(plug.mesh, rocks, gems);
  return { mesh: m, parts: [main, plug], k: -1, rocks, gems, rockY: [], gemY: [], gemVar: [] };
}

// relief height of a face vertex, keyed by its global grid coordinate so tile seams always match
function relief(ix, gy) {
  const big = Math.sin(ix * 0.55 + gy * 0.23) * 0.18 + Math.sin(ix * 0.21 - gy * 0.41) * 0.16;
  return 0.16 + big + (h2(ix, gy) - 0.5) * 0.36;
}
function jitter(ix, gy, axis) { return (h2(ix * 3 + axis, gy * 7 + 11) - 0.5) * 0.38; }

const dummy = new THREE.Object3D();
function vx(ix, gy) {
  const x = -FACE_W / 2 + ix * CELL;
  return x + (Math.abs(x) > SW + 0.5 ? jitter(ix, gy, 0) : 0);
}
function buildPart(P, k) {
  const pos = P.mesh.geometry.attributes.position.array;
  let q = 0;
  for (const c of P.cols) {
    for (let r = 0; r < TILE_ROWS; r++) {
      const gy0 = k * TILE_ROWS + r, gy1 = gy0 + 1;
      const p = [[c, gy0], [c + 1, gy0], [c + 1, gy1], [c, gy1]].map(([ix, gy]) => {
        const edge = Math.abs(Math.abs(-FACE_W / 2 + ix * CELL) - SW) < 0.01;
        return [vx(ix, gy), -(gy - k * TILE_ROWS) * CELL + jitter(ix, gy, 1) * 0.6, edge ? 0.05 : relief(ix, gy)];
      });
      const tri = [p[0], p[3], p[1], p[1], p[3], p[2]];
      for (let i = 0; i < 6; i++) { pos[q * 18 + i * 3] = tri[i][0]; pos[q * 18 + i * 3 + 1] = tri[i][1]; pos[q * 18 + i * 3 + 2] = tri[i][2]; }
      P.triY[q * 2] = (p[0][1] + p[3][1] + p[1][1]) / 3;
      P.triY[q * 2 + 1] = (p[1][1] + p[3][1] + p[2][1]) / 3;
      // soft patches of darker and lighter rock
      const patch = Math.sin(c * 0.7 + gy0 * 0.45) * 0.5 + Math.sin(c * 0.29 - gy0 * 0.83 + 1.3) * 0.5;
      P.triVar[q * 2] = patch * 0.13 + (h2(c * 5 + 1, gy0) - 0.5) * 0.2;
      P.triVar[q * 2 + 1] = patch * 0.13 + (h2(c * 5 + 2, gy0) - 0.5) * 0.2;
      q++;
    }
  }
  P.mesh.geometry.attributes.position.needsUpdate = true;
  P.mesh.geometry.computeVertexNormals();
  P.mesh.geometry.computeBoundingSphere();
}
function buildTile(t, k) {
  t.k = k;
  for (const P of t.parts) buildPart(P, k);
  // decor: rocks and ore crystals sticking out of the face
  let nr = 0, ng = 0;
  t.rockY.length = 0; t.gemY.length = 0; t.gemVar.length = 0;
  for (let cy = 0; cy < TILE_ROWS / 2; cy++) {
    for (let cx = 0; cx < FACE_W / 2; cx++) {
      const gy = k * TILE_ROWS / 2 + cy;
      const hh = hash(gy * 7919 + cx * 104729 + 3);
      const x = -FACE_W / 2 + cx * 2 + 0.5 + (hh % 100) / 100;
      if (Math.abs(x) < SW + 0.9) continue;
      const y = -(cy * 2 + ((hh >>> 8) % 100) / 60);
      const kind = (hh >>> 16) % 100;
      if (kind < 12 && nr < t.rocks.count) {
        const s = 0.6 + ((hh >>> 4) % 100) / 120;
        dummy.position.set(x, y, 0.25);
        dummy.rotation.set(hh % 7, (hh >>> 3) % 7, 0);
        dummy.scale.set(s, s * 0.8, s * 0.7);
        dummy.updateMatrix();
        t.rocks.setMatrixAt(nr, dummy.matrix);
        t.rockY[nr++] = y;
      } else if (kind >= 12 && kind < 30 && ng < t.gems.count) {
        const cluster = 1 + (hh >>> 20) % 3;
        for (let j = 0; j < cluster && ng < t.gems.count; j++) {
          const s = 0.45 + ((hh >>> (j * 3)) % 100) / 260;
          // crystals fan out of the rock and lean toward the camera so they read as 3D
          dummy.position.set(x + (j - 1) * 0.22, y - 0.15, 0.2);
          dummy.rotation.set(0.75 + (j % 2) * 0.2, (hh >>> (j * 2)) % 6, (j - 1) * 0.55);
          dummy.scale.set(s, s * (1.1 + (j === 1 ? 0.4 : 0)), s);
          dummy.updateMatrix();
          t.gems.setMatrixAt(ng, dummy.matrix);
          t.gemY[ng] = y; t.gemVar[ng++] = (hh >>> (j + 9)) % 3;
        }
      }
    }
  }
  dummy.scale.set(0, 0, 0); dummy.updateMatrix();
  for (let i = nr; i < t.rocks.count; i++) t.rocks.setMatrixAt(i, dummy.matrix);
  for (let i = ng; i < t.gems.count; i++) t.gems.setMatrixAt(i, dummy.matrix);
  t.rocks.instanceMatrix.needsUpdate = true; t.gems.instanceMatrix.needsUpdate = true;
  t.nr = nr; t.ng = ng;
}

const tmpC = new THREE.Color(), tmpD = new THREE.Color();
function layerColorAt(yWorld, d, out, darken = 0) {
  const depthM = d - yWorld / U;
  if (depthM < 0) { out.copy(grassCol); return -1; }
  const li = G.layerAt(Math.min(G.CORE, depthM));
  out.copy(layerCols[li]);
  const toTop = depthM - G.DEPTHS[li];
  if (li > 0 && toTop < 0.7) out.multiplyScalar(0.62);
  if (darken) out.multiplyScalar(1 - darken);
  return li;
}

function updateTiles(scroll, d) {
  const first = Math.floor(scroll / TILE_H);
  for (let i = 0; i < NTILES; i++) {
    const k = first + i;
    const t = tiles[((k % NTILES) + NTILES) % NTILES];
    if (t.k !== k) buildTile(t, k);
    t.mesh.position.y = Y0 + scroll - k * TILE_H;
  }
  for (const t of tiles) {
    const baseY = t.mesh.position.y;
    for (const P of t.parts) {
      const colA = P.mesh.geometry.attributes.color.array;
      const n = P.triY.length;
      for (let i = 0; i < n; i++) {
        layerColorAt(baseY + P.triY[i], d, tmpC);
        const v = P.triVar[i];
        const o = i * 9;
        colA[o] = colA[o + 3] = colA[o + 6] = tmpC.r * (1 + v);
        colA[o + 1] = colA[o + 4] = colA[o + 7] = tmpC.g * (1 + v);
        colA[o + 2] = colA[o + 5] = colA[o + 8] = tmpC.b * (1 + v);
      }
      P.mesh.geometry.attributes.color.needsUpdate = true;
    }
    for (let i = 0; i < t.nr; i++) { layerColorAt(baseY + t.rockY[i], d, tmpC); tmpC.multiplyScalar(0.72); t.rocks.setColorAt(i, tmpC); }
    for (let i = 0; i < t.ng; i++) {
      const depthM = d - (baseY + t.gemY[i]) / U;
      const li = G.layerAt(clamp(depthM, 0, G.CORE));
      t.gems.setColorAt(i, tmpC.copy(oreCols[li][t.gemVar[i]]).multiplyScalar(0.82));
    }
    if (t.rocks.instanceColor) t.rocks.instanceColor.needsUpdate = true;
    if (t.gems.instanceColor) t.gems.instanceColor.needsUpdate = true;
  }
}

// ---------- shaft groove above the drill, rock plug below it ----------
function stripGeo(w, h, rows, z, xs) {
  const geo = new THREE.BufferGeometry();
  const pos = [], ty = [];
  for (let r = 0; r < rows; r++) {
    const y0 = h * r / rows, y1 = h * (r + 1) / rows;
    for (let c = 0; c < xs.length - 1; c++) {
      const a = [xs[c], y0, z(xs[c], r)], b = [xs[c + 1], y0, z(xs[c + 1], r)], cc = [xs[c + 1], y1, z(xs[c + 1], r + 1)], dd = [xs[c], y1, z(xs[c], r + 1)];
      pos.push(...a, ...b, ...dd, ...b, ...cc, ...dd);
      ty.push((y0 * 2 + y1) / 3, (y0 + y1 * 2) / 3);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3));
  geo.computeVertexNormals();
  return { geo, ty };
}
let grooveParts = [];
function buildGroove() {
  const H0 = Y0 + 4;
  const back = stripGeo(SW * 2, H0, 30, () => -GD, [-SW, 0, SW]);
  // side walls are built flat and turned to face the shaft; local x becomes depth into the face
  const bump = (x, r) => (x <= -GD || x >= GD || Math.abs(x) <= 0.05 ? 0 : (h2(Math.round(x * 4) + 17, r) - 0.5) * 0.14);
  const left = stripGeo(1, H0, 30, bump, [-0.05, GD / 2, GD]);
  const right = stripGeo(1, H0, 30, bump, [-GD, -GD / 2, 0.05]);
  const mk = (part, dark) => {
    const m = mesh(part.geo, faceMat, false, true);
    m.userData = { ty: part.ty, dark };
    world.add(m);
    grooveParts.push(m);
    return m;
  };
  mk(back, 0.62);
  const l = mk(left, 0.42); l.rotation.y = Math.PI / 2; l.position.x = -SW;
  const r = mk(right, 0.42); r.rotation.y = -Math.PI / 2; r.position.x = SW;
  // wooden supports and lamps, scrolling with the rock
  beams = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(SW * 2 + 0.3, 0.24, 0.3), mat('#7A4E28'), true, true));
    const post1 = mesh(new THREE.BoxGeometry(0.22, 1.6, 0.26), mat('#5E3A1C'), true, true); post1.position.set(-SW + 0.12, -0.8, 0);
    const post2 = post1.clone(); post2.position.x = SW - 0.12;
    g.add(post1, post2);
    if (i % 2 === 0) {
      const lamp = mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), new THREE.MeshStandardMaterial({ color: 0xffd447, emissive: 0xffb020, emissiveIntensity: 2.2 }), false);
      lamp.position.set(-SW + 0.45, -0.32, 0.1);
      g.add(lamp);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffc860, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(2.4, 2.4, 1);
      glow.position.copy(lamp.position);
      g.add(glow);
    }
    g.position.z = -GD + 0.25;
    g.userData.slot = i;
    beams.add(g);
  }
  world.add(beams);
}
// bottom of the shaft the head is grinding into
function buildFloor() {
  const floor = stripGeo(SW * 2, GD + 0.05, 3, (x, r) => (r === 0 || r === 3 ? 0 : (h2(Math.round(x * 3) + 7, r) - 0.5) * 0.18), [-SW, -SW / 3, SW / 3, SW]);
  floorMesh = mesh(floor.geo, faceMat, false, true);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, FLOOR_Y, 0.05);
  floorMesh.userData.ty = floor.ty.map(() => 0);
  world.add(floorMesh);
}
let floorMesh;
const FLOOR_Y = 0.3;
function colorStrip(m, ty, d, darken) {
  const colA = m.geometry.attributes.color.array;
  const by = m.position.y;
  for (let i = 0; i < ty.length; i++) {
    layerColorAt(by + ty[i], d, tmpC, darken);
    const o = i * 9;
    colA[o] = colA[o + 3] = colA[o + 6] = tmpC.r;
    colA[o + 1] = colA[o + 4] = colA[o + 7] = tmpC.g;
    colA[o + 2] = colA[o + 5] = colA[o + 8] = tmpC.b;
  }
  m.geometry.attributes.color.needsUpdate = true;
}

let glowT = null;
function glowTex() {
  if (glowT) return glowT;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  glowT = new THREE.CanvasTexture(c);
  return glowT;
}

// ---------- surface: grass top, camp, sky ----------
let grassCol = col('#58B04A');
const GRASS = ['#5DB34C', '#C0603E', '#EAF4FF', '#3A2E34', '#9E7FE0'];
function skyTexture(base) {
  if (skyTex[base]) return skyTex[base];
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const x = c.getContext('2d');
  const s = [['#3F8EE0', '#BFE6FF'], ['#B85F55', '#F6CDB0'], ['#050814', '#1C2648'], ['#2A0606', '#C2441E'], ['#080B26', '#3A1C66']][base];
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, s[0]); g.addColorStop(1, s[1]);
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  skyTex[base] = t;
  return t;
}
function buildSurface() {
  if (surface) { world.remove(surface); surface.traverse(o => o.geometry?.dispose()); }
  const pl = planetOf();
  surface = new THREE.Group();
  grassCol = col(GRASS[pl.base]);
  // grass top of the slab, seen from above thanks to the camera angle
  const top = new THREE.PlaneGeometry(FACE_W, 30, 24, 10);
  top.rotateX(-Math.PI / 2);
  const p = top.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getZ(i) < 14.9) p.setY(i, (h2(i, 3) - 0.5) * 0.25);
  top.translate(0, 0, -15);
  const topM = mesh(top, mat(GRASS[pl.base], { roughness: 1 }), false, true);
  surface.add(topM);
  const lip = mesh(new THREE.BoxGeometry(FACE_W, 0.35, 0.5), mat(new THREE.Color(GRASS[pl.base]).multiplyScalar(0.85).getStyle()), false, true);
  lip.position.set(0, -0.12, 0.05);
  surface.add(lip);
  // hole around the shaft
  const hole = mesh(new THREE.BoxGeometry(SW * 2 + 0.2, 0.05, GD + 0.2), mat('#1A1014'), false);
  hole.position.set(0, 0.03, -GD / 2);
  surface.add(hole);
  // mining derrick over the shaft
  const wood = mat('#6E4A2C'), dark = mat('#3E2A1C');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = mesh(new THREE.BoxGeometry(0.22, 6.6, 0.22), wood);
    leg.position.set(sx * 2.7, 3.2, -0.9 + sz * 1.1);
    leg.rotation.z = -sx * 0.17; leg.rotation.x = sz * 0.12;
    surface.add(leg);
  }
  for (let k = 1; k <= 3; k++) {
    const bar = mesh(new THREE.BoxGeometry(6.2 - k * 0.55, 0.14, 0.16), dark);
    bar.position.set(0, k * 1.6, -2.0 + 0.1 * k);
    surface.add(bar);
  }
  const head = mesh(new THREE.BoxGeometry(4.6, 0.4, 1.4), dark); head.position.set(0, 6.6, -0.9); surface.add(head);
  const wheel = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 10), mat('#9AA4B2', { metalness: 0.6, roughness: 0.4 }));
  wheel.rotation.x = Math.PI / 2; wheel.position.set(0, 7.0, -0.3);
  surface.add(wheel);
  surface.userData.wheel = wheel;
  // cabin
  const cabin = new THREE.Group();
  cabin.add(mesh(new THREE.BoxGeometry(3.2, 2.0, 2.4), mat('#B07A45'), true, true));
  const roof = mesh(new THREE.ConeGeometry(2.5, 1.3, 4), mat('#C0503A'));
  roof.rotation.y = Math.PI / 4; roof.position.y = 1.65; roof.scale.set(1, 1, 0.8);
  cabin.add(roof);
  const win = mesh(new THREE.BoxGeometry(0.8, 0.6, 0.06), new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffc040, emissiveIntensity: 1.2 }), false);
  win.position.set(-0.6, 0.2, 1.22);
  const door = mesh(new THREE.BoxGeometry(0.7, 1.2, 0.06), mat('#5A3818'), false); door.position.set(0.8, -0.4, 1.22);
  cabin.add(win, door);
  cabin.position.set(-7.5, 1.0, -3.2);
  cabin.rotation.y = 0.25;
  surface.add(cabin);
  // flag
  const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.4, 6), mat('#C9D2DE')); pole.position.set(5.6, 2.2, -2); surface.add(pole);
  const flag = mesh(new THREE.PlaneGeometry(1.4, 0.8, 4, 1), new THREE.MeshStandardMaterial({ color: 0xffd447, side: THREE.DoubleSide, flatShading: true }));
  flag.position.set(6.32, 4.0, -2); surface.add(flag);
  surface.userData.flag = flag;
  // crates and barrels
  const crate = mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat('#9A6A3A'), true, true); crate.position.set(3.4, 0.45, -1.2); crate.rotation.y = 0.4; surface.add(crate);
  const crate2 = crate.clone(); crate2.position.set(4.2, 0.45, -2.1); surface.add(crate2);
  const ore = mesh(new THREE.DodecahedronGeometry(0.45, 0), mat('#FFD447', { metalness: 0.5, roughness: 0.35 })); ore.position.set(3.4, 1.05, -1.2); surface.add(ore);
  for (let i = 0; i < 3; i++) {
    const barrel = mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 10), mat(i % 2 ? '#3A8DFF' : '#E8434F'), true, true);
    barrel.position.set(-4.4 + i * 0.9, 0.5, -1.4 - (i % 2) * 0.6);
    surface.add(barrel);
  }
  // planet scenery
  for (let i = 0; i < 14; i++) {
    const x = (i % 2 ? 1 : -1) * (9 + frac(i * 7) * 14), z = -4 - frac(i * 11) * 22;
    let o;
    if (pl.base === 0) {
      o = new THREE.Group();
      const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.2, 6), mat('#6E4A2C')); trunk.position.y = 0.6;
      const crown = mesh(new THREE.ConeGeometry(1.1 + frac(i) * 0.6, 2.6, 7), mat(i % 3 ? '#3E9443' : '#4FB052')); crown.position.y = 2.4;
      o.add(trunk, crown);
    } else if (pl.base === 2 || pl.base === 4) {
      o = mesh(new THREE.OctahedronGeometry(0.8 + frac(i) * 0.8, 0), mat(pl.base === 2 ? '#BFE8FF' : (i % 2 ? '#7FFFE0' : '#C59BFF'), { roughness: 0.2, emissive: pl.base === 4 ? 0x301050 : 0x000000 }));
      o.scale.y = 1.8; o.position.y = 1.2;
    } else {
      o = mesh(new THREE.DodecahedronGeometry(0.8 + frac(i) * 1.1, 0), mat(pl.base === 3 ? '#2A2026' : '#9A4A30'));
      o.position.y = 0.4;
    }
    o.position.x += x; o.position.z = z;
    surface.add(o);
  }
  // distant hills / volcano
  const hillMat = mat(pl.base === 0 ? '#4E9A48' : pl.base === 1 ? '#A85A40' : pl.base === 2 ? '#C8E0F4' : pl.base === 3 ? '#1E1418' : '#5A3E8A', { roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const hill = mesh(new THREE.ConeGeometry(6 + frac(i * 3) * 8, 4 + frac(i * 5) * 7, 7), hillMat, false);
    hill.position.set(-40 + i * 13 + frac(i) * 5, 1.5, -34 - frac(i * 9) * 14);
    surface.add(hill);
  }
  for (let i = 0; i < 5; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const puff = mesh(new THREE.IcosahedronGeometry(1 + frac(i * 4 + j) * 0.8, 0), mat(pl.base === 2 || pl.base === 4 ? '#8C96C8' : '#FFFFFF', { roughness: 1 }), false);
      puff.position.set(j * 1.3, (j % 2) * 0.4, 0); puff.scale.y = 0.65;
      cloud.add(puff);
    }
    cloud.position.set(-26 + i * 13, 14 + frac(i) * 6, -30);
    cloud.userData.drift = 0.3 + frac(i) * 0.4;
    surface.add(cloud);
  }
  world.add(surface);
}

// ---------- drill model ----------
let drill = null, drillKey = '';
function skinOf(id) { return G.SKINS.find(k => k.id === id) || G.SKINS[0]; }
const HEAD_LEN = [1.9, 1.9, 2.0, 2.15, 2.35, 2.55];
const HEAD_R = [0.95, 0.95, 0.97, 1.05, 1.08, 1.12];
const HEAD_TINT = [null, null, '#7F9FBF', '#D8E6F8', '#9FF0FF', '#FF7AF0'];
function buildDrill(id, Lk) {
  const k = skinOf(id);
  const g = new THREE.Group();
  const hl = HEAD_LEN[Lk.head], hr = HEAD_R[Lk.head];
  const metal = k.id === 'gold' ? { metalness: 0.75, roughness: 0.3 } : { metalness: 0.35, roughness: 0.45 };
  let tipC = new THREE.Color(k.tip);
  if (HEAD_TINT[Lk.head]) tipC.lerp(new THREE.Color(HEAD_TINT[Lk.head]), 0.45);
  const emissiveHead = Lk.head >= 5 ? 0x8a1a80 : Lk.head >= 4 ? 0x0a4a55 : 0x000000;
  // head: cone + spiral thread, spins around Y
  const spin = new THREE.Group();
  const cone = mesh(new THREE.ConeGeometry(hr, hl, 12, 1), mat(tipC.getStyle(), Object.assign({ emissive: emissiveHead }, metal)));
  cone.rotation.x = Math.PI; cone.position.y = hl / 2;
  spin.add(cone);
  const turns = 3.2, pts = [];
  for (let i = 0; i <= 64; i++) {
    const u = i / 64, a = u * turns * Math.PI * 2, rr = hr * u + 0.06;
    pts.push(new THREE.Vector3(Math.cos(a) * rr, u * hl, Math.sin(a) * rr));
  }
  const threadCol = k.id === 'unicorn' ? '#FF6FB5' : k.id === 'neon' ? '#FE2C8B' : new THREE.Color(k.tipDark).getStyle();
  spin.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.075, 5, false), mat(threadCol, { emissive: k.id === 'neon' ? 0xfe2c8b : 0x000000, metalness: 0.4, roughness: 0.4 })));
  if (k.id === 'unicorn') {
    const pts2 = pts.map(p => new THREE.Vector3(p.x * -1, p.y, p.z * -1));
    spin.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 96, 0.07, 5, false), mat('#8FD3FF')));
  }
  if (Lk.head >= 1) {
    const tc = Lk.head >= 4 ? '#BFF6FF' : new THREE.Color(k.tipDark).getStyle();
    const nT = 6 + Lk.head * 2;
    for (let i = 0; i < nT; i++) {
      const u = 0.35 + (i % 3) * 0.2, a = i / nT * Math.PI * 2;
      const tooth = mesh(new THREE.ConeGeometry(0.1 + Lk.head * 0.015, 0.32 + Lk.head * 0.04, 4), mat(tc, { metalness: 0.6, roughness: 0.3, emissive: Lk.head >= 4 ? 0x1a6a7a : 0 }));
      tooth.position.set(Math.cos(a) * hr * u, u * hl, Math.sin(a) * hr * u);
      tooth.rotation.z = -Math.cos(a) * 1.2; tooth.rotation.x = Math.sin(a) * 1.2;
      spin.add(tooth);
    }
  }
  g.add(spin);
  let y = hl;
  const collar = mesh(new THREE.CylinderGeometry(hr + 0.06, hr + 0.06, 0.3, 14), mat('#4A5260', { metalness: 0.6, roughness: 0.35 }));
  collar.position.y = y + 0.15; g.add(collar); y += 0.3;
  const bodyMat = mat(k.body, metal);
  const body = mesh(new THREE.CylinderGeometry(0.86, 0.86, 1.15, 14), k.id === 'neon' ? mat('#1C1F3A', { emissive: 0x05101a }) : bodyMat);
  body.position.y = y + 0.575; g.add(body);
  const stripe = mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.24, 14), mat(k.accent, { emissive: k.id === 'neon' ? 0xfe2c8b : 0 }));
  stripe.position.y = y + 0.5; g.add(stripe);
  y += 1.15;
  const cab = mesh(new THREE.BoxGeometry(2.0, 1.15, 1.7), k.id === 'neon' ? mat('#1C1F3A', { emissive: 0x05101a }) : bodyMat);
  cab.position.y = y + 0.575; g.add(cab);
  if (k.id === 'neon') {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cab.geometry), new THREE.LineBasicMaterial({ color: 0x25f4ee }));
    edges.position.copy(cab.position); g.add(edges);
  }
  // face: window, or eyes for the dragon
  if (k.id === 'dragon') {
    for (const sx of [-0.45, 0.45]) {
      const eye = mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe14d, emissive: 0x806000 }), false);
      eye.position.set(sx, y + 0.7, 0.86); g.add(eye);
      const slit = mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), mat('#111111'), false); slit.position.set(sx, y + 0.7, 1.04); g.add(slit);
      const horn = mesh(new THREE.ConeGeometry(0.16, 0.7, 6), mat(k.tip)); horn.position.set(sx * 1.4, y + 1.45, 0); horn.rotation.z = -sx * 0.6; g.add(horn);
    }
  } else {
    const winM = new THREE.MeshStandardMaterial({ color: k.id === 'neon' ? 0xfe2c8b : 0x8fd3ff, emissive: k.id === 'neon' ? 0xfe2c8b : 0x3a7ab0, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.2 });
    const win = mesh(k.id === 'rocket' ? new THREE.CylinderGeometry(0.34, 0.34, 0.08, 14) : new THREE.BoxGeometry(1.25, 0.48, 0.08), winM, false);
    if (k.id === 'rocket') win.rotation.x = Math.PI / 2;
    win.position.set(0, y + 0.66, 0.86); g.add(win);
  }
  if (k.id === 'rocket') {
    for (const sx of [-1, 1]) {
      const fin = mesh(new THREE.BoxGeometry(0.12, 1.1, 0.8), mat(k.tip)); fin.position.set(sx * 1.05, y + 0.3, 0); fin.rotation.z = sx * 0.35; g.add(fin);
    }
  }
  if (k.id === 'unicorn') {
    ['#FF9CE0', '#C59BFF', '#8FD3FF', '#9CFFC8'].forEach((c, i) => {
      const tuft = mesh(new THREE.IcosahedronGeometry(0.28, 0), mat(c)); tuft.position.set(-0.6 + i * 0.4, y + 1.2, -0.3); g.add(tuft);
    });
  }
  // headlights
  for (const sx of [-0.7, 0.7]) {
    const lamp = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xffffe0, emissive: 0xfff2a0, emissiveIntensity: 1.5 }), false);
    lamp.rotation.x = Math.PI / 2; lamp.position.set(sx, y + 0.2, 0.86); g.add(lamp);
  }
  const top = y + 1.15;
  const parts = { spin, cone, flames: [], fan: null, arms: [], reactor: null };
  // engine: exhausts, turbine, flames, reactor
  const pipeH = Lk.engine >= 1 ? 1.0 : 0.6;
  for (const sx of [-0.62, 0.62]) {
    const pipe = mesh(new THREE.CylinderGeometry(0.15, 0.17, pipeH, 8), mat(Lk.engine >= 4 ? '#5AF0FF' : '#5A5A64', { metalness: 0.5, roughness: 0.4 }));
    pipe.position.set(sx, top + pipeH / 2, -0.25); g.add(pipe);
    if (Lk.engine >= 3) {
      const fl = mesh(new THREE.ConeGeometry(0.16, 0.6, 6), new THREE.MeshBasicMaterial({ color: Lk.engine >= 4 ? 0x7af8ff : 0xffa030, transparent: true, opacity: 0.85 }), false);
      fl.position.set(sx, top + pipeH + 0.3, -0.25); g.add(fl); parts.flames.push(fl);
    }
  }
  if (Lk.engine >= 2) {
    const housing = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 12), mat('#4A5260', { metalness: 0.5 }));
    housing.position.set(0, top + 0.18, 0.25); g.add(housing);
    const fan = new THREE.Group();
    for (let i = 0; i < 4; i++) { const blade = mesh(new THREE.BoxGeometry(0.85, 0.05, 0.16), mat('#C9D2DE', { metalness: 0.6 })); blade.rotation.y = i * Math.PI / 4; fan.add(blade); }
    fan.position.set(0, top + 0.4, 0.25); g.add(fan); parts.fan = fan;
  }
  if (Lk.engine >= 4) {
    const core = mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshStandardMaterial({ color: 0x9ffcff, emissive: 0x30e0ff, emissiveIntensity: 2 }), false);
    core.position.set(0, top + 0.75, 0.25); g.add(core); parts.reactor = core;
  }
  // grip arms
  if (Lk.grip >= 1) {
    const armC = Lk.grip >= 4 ? mat('#FFD447', { metalness: 0.7, roughness: 0.3 }) : mat('#8C96A6', { metalness: 0.5, roughness: 0.4 });
    for (const sx of [-1, 1]) {
      const arm = new THREE.Group();
      const reach = [0, 0.2, 0.35, 0.5, 0.6][Lk.grip];
      const a = mesh(new THREE.BoxGeometry(0.4 + reach, 0.28, 0.4), armC); a.position.x = sx * (0.86 + (0.4 + reach) / 2 - 0.1); arm.add(a);
      if (Lk.grip >= 2) { const pad = mesh(new THREE.BoxGeometry(0.16, 0.6, 0.5), mat('#4A5260')); pad.position.set(sx * (0.86 + 0.4 + reach), -0.15, 0); arm.add(pad); }
      if (Lk.grip >= 3) { const piston = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6), mat('#C9D2DE', { metalness: 0.7 })); piston.rotation.z = Math.PI / 2; piston.position.set(sx * (0.86 + reach / 2), 0.22, 0.12); arm.add(piston); }
      arm.position.y = hl + 0.3 + 0.55;
      g.add(arm); parts.arms.push(arm);
    }
  }
  // sorter hopper on the right of the cab
  if (Lk.sorter >= 1) {
    const big = Lk.sorter >= 2 ? 1.25 : 1;
    const hop = mesh(new THREE.CylinderGeometry(0.42 * big, 0.26 * big, 0.8 * big, 6), mat(Lk.sorter >= 4 ? '#FFD447' : '#3A8DFF', { metalness: Lk.sorter >= 4 ? 0.7 : 0.1 }));
    hop.position.set(1.3, y + 0.75, 0.1); g.add(hop);
    const ores = ['#FFD447', '#E8344E', '#2ECC71', '#4FD1F0'];
    for (let i = 0; i < (Lk.sorter >= 3 ? 4 : 2); i++) {
      const o = mesh(new THREE.IcosahedronGeometry(0.13, 0), mat(ores[i], { emissive: Lk.sorter >= 3 ? 0x202020 : 0 }), false);
      o.position.set(1.18 + (i % 2) * 0.24, y + 1.2 + (i > 1 ? 0.1 : 0), 0.1 + (i > 1 ? 0.15 : -0.1)); g.add(o);
    }
  }
  // storage crates on the left
  if (Lk.storage >= 1) {
    const n = Math.min(3, Lk.storage);
    for (let i = 0; i < n; i++) {
      const vault = Lk.storage >= 4;
      const c = mesh(new THREE.BoxGeometry(0.62, 0.5, 0.62), mat(vault ? '#8C96A6' : '#B07A45', { metalness: vault ? 0.6 : 0 }));
      c.position.set(-1.32, y + 0.3 + i * 0.52, 0); g.add(c);
      if (vault && i === n - 1) { const lock = mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), mat('#FFD447', { metalness: 0.7 }), false); lock.position.set(-1.32, y + 0.3 + i * 0.52, 0.33); g.add(lock); }
    }
  }
  g.userData = { parts, height: top };
  return g;
}

let heatMat = null;
function ensureDrill() {
  const s = S();
  const look = G.Look.look(s.lv);
  const key = s.skins.active + JSON.stringify(look);
  if (key === drillKey) return;
  drillKey = key;
  if (drill) { world.remove(drill); drill.traverse(o => o.geometry?.dispose()); }
  drill = buildDrill(s.skins.active, look);
  drill.position.set(0, 0, DRILL_Z);
  world.add(drill);
  drill.traverse(o => { if (o.isMesh && o.material?.isMeshStandardMaterial && !o.material.userData.own) { o.material = o.material.clone(); o.material.userData.own = true; } });
}

// ---------- treasure nodes ----------
const nodes = [];
let nodeTimer = 4;
function buildNode(type) {
  const g = new THREE.Group();
  if (type === 'nugget') {
    for (let i = 0; i < 4; i++) {
      const n = mesh(new THREE.DodecahedronGeometry(0.22 + frac(i) * 0.12, 0), mat('#FFC93C', { metalness: 0.25, roughness: 0.3, emissive: 0x6a4400 }));
      n.position.set((i % 2 - 0.5) * 0.36, (i > 1 ? 0.22 : -0.1), (i % 3) * 0.08); g.add(n);
    }
  } else if (type === 'gem') {
    const c = mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: 0x5ee0ff, emissive: 0x0a5a70, roughness: 0.1, metalness: 0.2, flatShading: true }));
    c.scale.set(0.8, 1.35, 0.8); g.add(c);
    const c2 = c.clone(); c2.scale.set(0.45, 0.8, 0.45); c2.position.set(0.32, -0.2, 0.05); c2.rotation.z = -0.5; g.add(c2);
  } else if (type === 'chest') {
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.55, 0.62), mat('#9A6034')));
    const lid = mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.95, 8, 1, false, 0, Math.PI), mat('#B57440'));
    lid.rotation.z = Math.PI / 2; lid.position.y = 0.27; g.add(lid);
    const band = mesh(new THREE.BoxGeometry(0.14, 0.9, 0.66), mat('#FFD447', { metalness: 0.7, roughness: 0.3 })); band.position.y = 0.14; g.add(band);
  } else if (type === 'tnt') {
    for (let i = 0; i < 3; i++) { const st = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.85, 8), mat('#E03A3A')); st.position.set((i - 1) * 0.3, 0, 0); g.add(st); }
    const tape = mesh(new THREE.BoxGeometry(0.95, 0.16, 0.34), mat('#2A2A30')); g.add(tape);
    const fuse = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4), mat('#3A3A3A')); fuse.position.set(0, 0.6, 0); fuse.rotation.z = 0.4; g.add(fuse);
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffd060, blending: THREE.AdditiveBlending, depthWrite: false }));
    spark.scale.set(0.5, 0.5, 1); spark.position.set(0.1, 0.8, 0); g.add(spark); g.userData.spark = spark;
  } else if (type === 'heat') {
    const f1 = mesh(new THREE.ConeGeometry(0.36, 0.95, 7), new THREE.MeshBasicMaterial({ color: 0xff6a1e }), false);
    const f2 = mesh(new THREE.ConeGeometry(0.2, 0.6, 7), new THREE.MeshBasicMaterial({ color: 0xffe27a }), false); f2.position.y = -0.12;
    g.add(f1, f2); g.userData.flame = g;
  } else {
    const r = mesh(new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: 0xc59bff, emissive: 0x5a2a9a, emissiveIntensity: 1.2, flatShading: true, roughness: 0.2 }));
    g.add(r);
    const ring = mesh(new THREE.TorusGeometry(0.62, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: 0xe0c8ff }), false); g.add(ring); g.userData.ring = ring;
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: { nugget: 0xffd447, gem: 0x7fe3ff, chest: 0xffd447, tnt: 0xff8a3a, heat: 0xff6a1e, relic: 0xc59bff }[type], transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(2.0, 2.0, 1); halo.position.z = -0.2;
  g.add(halo); g.userData.halo = halo;
  return g;
}
let scrollU = 0;
function nodeWorldY(n) { return Y0 + scrollU - n.gy; }
function spawnNode() {
  const rt = G.Game.rt;
  const roll = G.Game.rollNode();
  const left = Math.random() < 0.5;
  const xa = Math.max(bounds.x0 + 1.2, -12), xb = Math.min(bounds.x1 - 1.2, 12);
  const x = left ? lerp(xa, -2.7, Math.random()) : lerp(2.7, xb, Math.random());
  let y = rt.moving ? lerp(Math.max(bounds.y0 + 1.5, -9), -1.6, Math.random()) : lerp(Math.max(bounds.y0 + 1.5, -8), Math.min(bounds.y1 - 2, 6), Math.random());
  if (S().plate && y > -PLATE_T - 0.8 && y < 0.6) y = -PLATE_T - 1.4;
  const m = buildNode(roll.type);
  m.position.set(x, y, 0.55);
  world.add(m);
  const n = { type: roll.type, relic: roll.relic, x, gy: Y0 + scrollU - y, life: 11, t: 0, mesh: m };
  nodes.push(n);
  if (nodes.length > 4) removeNode(nodes[0]);
}
function removeNode(n) {
  const i = nodes.indexOf(n);
  if (i >= 0) nodes.splice(i, 1);
  world.remove(n.mesh);
  n.mesh.traverse(o => o.geometry?.dispose());
}
function nodeScreen(n) { return toScreen(n.x, nodeWorldY(n), 0.6); }
function hitNode(x, y) {
  const rad = Math.max(36, unitPx() * 0.9);
  for (let k = nodes.length - 1; k >= 0; k--) {
    const p = nodeScreen(nodes[k]);
    if (Math.abs(x - p.x) <= rad && Math.abs(y - p.y) <= rad) return nodes[k];
  }
  return null;
}
function unitPx() {
  const a = toScreen(0, 0, 0), b = toScreen(1, 0, 0);
  return Math.abs(b.x - a.x);
}
const NODE_COL = { nugget: ['#FFD447', '#FFF2A8'], gem: ['#4FD1F0', '#B9F3FF'], chest: ['#B07A45', '#FFD447'], tnt: ['#FF6A1E', '#FFD447'], heat: ['#FF5A1E', '#FFE27A'], relic: ['#C59BFF', '#FFFFFF'] };
function collect(n) {
  if (!nodes.includes(n)) return false;
  const p = nodeScreen(n);
  const wy = nodeWorldY(n);
  removeNode(n);
  const out = G.Game.collectNode(n);
  const [c1, c2] = NODE_COL[n.type];
  burst(n.x, wy, 0.6, out.boom ? 36 : 18, [c1, c2], out.boom ? 7 : 4);
  sparks(n.x, wy, 0.8, 18, c2);
  if (out.boom) { shake(7); pop(p.x, p.y - 24, 'BOOM!', '#FF6A1E', true); G.Audio.sfx('boomSmall'); }
  else G.Audio.sfx(out.relic != null ? 'reward' : 'node');
  if (out.coins) { pop(p.x, p.y, '+' + G.fmt(out.coins, true), '#FFD447'); flyTo('coins', p.x, p.y, 6); }
  if (out.gems) { pop(p.x, p.y - 26, '+' + out.gems, '#8FE8FF', true, 'gem'); flyTo('gems', p.x, p.y, out.gems + 2); }
  if (out.heat) pop(p.x, p.y - 24, 'HEAT!', '#FF8A3A', true);
  if (out.relic != null) { pop(p.x, p.y - 24, 'RELIC!', '#E0C8FF', true); G.UI?.relicFound(out.relic); }
  return true;
}

// ---------- particles ----------
const NDEB = 220, NSPK = 320;
let debris, debCol, sparkPts, sparkPos, sparkCol;
const deb = Array.from({ length: NDEB }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, s: 1, rx: 0, ry: 0 }));
const spk = Array.from({ length: NSPK }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, g: 0, r: 1, gg: 1, b: 1 }));
let di = 0, si = 0;
function buildParticles() {
  debris = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), NDEB);
  debris.castShadow = true;
  dummy.scale.set(0, 0, 0); dummy.updateMatrix();
  for (let i = 0; i < NDEB; i++) { debris.setMatrixAt(i, dummy.matrix); debris.setColorAt(i, tmpC.set(1, 1, 1)); }
  world.add(debris);
  const geo = new THREE.BufferGeometry();
  sparkPos = new Float32Array(NSPK * 3); sparkCol = new Float32Array(NSPK * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  sparkPts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex() }));
  sparkPts.frustumCulled = false;
  world.add(sparkPts);
}
function debrisAt(x, y, z, vx, vy, vz, life, size, color) {
  const p = deb[di]; di = (di + 1) % NDEB;
  Object.assign(p, { on: true, x, y, z, vx, vy, vz, life, max: life, s: size, rx: Math.random() * 6, ry: Math.random() * 6 });
  debris.setColorAt(deb.indexOf(p), tmpD.set(color));
  debris.instanceColor.needsUpdate = true;
}
function sparkAt(x, y, z, vx, vy, vz, life, color, g = 9) {
  const p = spk[si]; si = (si + 1) % NSPK;
  tmpD.set(color);
  Object.assign(p, { on: true, x, y, z, vx, vy, vz, life, max: life, g, r: tmpD.r, gg: tmpD.g, b: tmpD.b });
}
function burst(x, y, z, n, colors, power = 4) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    debrisAt(x, y, z, Math.cos(a) * power * Math.random(), Math.sin(a) * power * Math.random() + power * 0.5, Math.random() * 3, 0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.9, colors[i % colors.length]);
  }
}
function sparks(x, y, z, n, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
    sparkAt(x, y, z, Math.cos(a) * sp, Math.sin(a) * sp + 1.5, Math.random() * 2, 0.35 + Math.random() * 0.3, color);
  }
}
function updateParticles(dt) {
  for (let i = 0; i < NDEB; i++) {
    const p = deb[i];
    if (!p.on) continue;
    p.life -= dt;
    if (p.life <= 0) { p.on = false; dummy.scale.set(0, 0, 0); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix); continue; }
    p.vy -= 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.rx += dt * 5; p.ry += dt * 4;
    const s = p.s * Math.min(1, p.life / p.max * 2.5);
    dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx, p.ry, 0); dummy.scale.set(s, s, s); dummy.updateMatrix();
    debris.setMatrixAt(i, dummy.matrix);
  }
  debris.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < NSPK; i++) {
    const p = spk[i];
    if (p.on) {
      p.life -= dt;
      if (p.life <= 0) p.on = false;
      else { p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
    }
    const a = p.on ? Math.min(1, p.life / p.max * 1.6) : 0;
    sparkPos[i * 3] = p.x; sparkPos[i * 3 + 1] = p.y; sparkPos[i * 3 + 2] = p.z;
    sparkCol[i * 3] = p.r * a; sparkCol[i * 3 + 1] = p.gg * a; sparkCol[i * 3 + 2] = p.b * a;
  }
  sparkPts.geometry.attributes.position.needsUpdate = true;
  sparkPts.geometry.attributes.color.needsUpdate = true;
}

// ---------- plate ----------
let plate = null, crackCanvas, crackTex, crackKey = '';
function ensurePlate() {
  const s = S();
  if (!s.plate) { if (plate) { world.remove(plate); plate = null; } return; }
  if (!plate) {
    crackCanvas = crackCanvas || document.createElement('canvas');
    crackCanvas.width = 1024; crackCanvas.height = 64;
    crackTex = crackTex || new THREE.CanvasTexture(crackCanvas);
    crackTex.colorSpace = THREE.SRGBColorSpace;
    const side = mat('#6E6E78');
    const front = new THREE.MeshStandardMaterial({ map: crackTex, flatShading: true, roughness: 0.85 });
    plate = mesh(new THREE.BoxGeometry(FACE_W, PLATE_T, GD + 3), [side, side, side, side, front, side], true, true);
    plate.position.set(0, -PLATE_T / 2 - 0.02, -(GD + 3) / 2 + 0.75);
    world.add(plate);
    crackKey = '';
  }
  const i = G.Game.layer();
  const pl = planetOf();
  const base = G.mixColor(G.mixColor(pl.layers[i], pl.layers[Math.min(9, i + 1)], 0.5), '#6E6E78', 0.55);
  const dmg = clamp(1 - s.plate.hp / G.Game.plateMax(), 0, 1);
  const rt = G.Game.rt;
  const key = base + Math.round(dmg * 24) + (rt.regenT > 0 ? 'r' + Math.round(rt.regenT * 10) : '');
  if (key === crackKey) return;
  crackKey = key;
  const c = crackCanvas.getContext('2d');
  c.fillStyle = base; c.fillRect(0, 0, 1024, 64);
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, 0, 1024, 6);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, 56, 1024, 8);
  c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 3;
  for (let x = 0; x < 1024; x += 64) { c.beginPath(); c.moveTo(x, 6); c.lineTo(x, 56); c.stroke(); }
  c.beginPath(); c.moveTo(0, 31); c.lineTo(1024, 31); c.stroke();
  const shown = rt.regenT > 0 ? 1 : dmg;
  c.strokeStyle = rt.regenT > 0 ? 'rgba(190,240,255,0.8)' : 'rgba(20,8,8,0.9)'; c.lineWidth = 4;
  const N = 12;
  for (let k = 0; k < N; k++) {
    const f = clamp(shown * N - k, 0, 1);
    if (f <= 0) break;
    let x = 512 + (frac(k * 31 + i) - 0.5) * 60, y = 6;
    const dir = frac(k * 7 + 2) < 0.5 ? -1 : 1;
    c.beginPath(); c.moveTo(x, y);
    for (let q = 0; q < 9 * f; q++) { x += dir * (14 + frac(k * 13 + q) * 40); y = 6 + frac(k * 5 + q * 3) * 50; c.lineTo(x, y); }
    c.stroke();
  }
  crackTex.needsUpdate = true;
}

// ---------- cart ----------
let cart, rails;
function buildCart() {
  cart = new THREE.Group();
  const hull = mesh(new THREE.CylinderGeometry(0.95, 0.72, 0.9, 4), mat('#8A5A30')); hull.rotation.y = Math.PI / 4; hull.scale.set(1.3, 1, 0.85); cart.add(hull);
  const rim = mesh(new THREE.BoxGeometry(2.2, 0.12, 1.4), mat('#B9C2D0', { metalness: 0.6 })); rim.position.y = 0.46; cart.add(rim);
  const oreC = ['#FFD447', '#E8344E', '#2ECC71', '#4FD1F0', '#FFD447'];
  for (let i = 0; i < 7; i++) {
    const o = mesh(i % 3 ? new THREE.DodecahedronGeometry(0.22, 0) : new THREE.OctahedronGeometry(0.24, 0), mat(oreC[i % 5], { metalness: 0.4, roughness: 0.3, emissive: 0x111111 }));
    o.position.set(-0.7 + (i / 6) * 1.4, 0.6 + Math.sin(i / 6 * Math.PI) * 0.35, (i % 2 - 0.5) * 0.4); cart.add(o);
  }
  cart.userData.wheels = [];
  for (const sx of [-0.65, 0.65]) for (const sz of [-0.5, 0.5]) {
    const w = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 10), mat('#2A2A30')); w.rotation.x = Math.PI / 2; w.position.set(sx, -0.48, sz); cart.add(w); cart.userData.wheels.push(w);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffe27a, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(3.6, 3.6, 1); halo.position.z = -0.5; cart.add(halo);
  cart.visible = false;
  world.add(cart);
  rails = new THREE.Group();
  for (const z of [-0.5, 0.5]) { const r = mesh(new THREE.BoxGeometry(60, 0.1, 0.12), mat('#B9C2D0', { metalness: 0.6 }), false, true); r.position.z = z; rails.add(r); }
  for (let i = 0; i < 40; i++) { const tie = mesh(new THREE.BoxGeometry(0.3, 0.1, 1.4), mat('#6E4520'), false, true); tie.position.set(-30 + i * 1.5, -0.08, 0); rails.add(tie); }
  rails.visible = false;
  world.add(rails);
}

// ---------- enemies ----------
let enemyMesh = null, enemyFor = null;
function buildEnemy(type) {
  const g = new THREE.Group();
  if (type === 'mole') {
    const body = mesh(new THREE.IcosahedronGeometry(0.8, 1), mat('#7A4A2A')); body.scale.set(1, 0.85, 0.9); g.add(body);
    const belly = mesh(new THREE.IcosahedronGeometry(0.55, 1), mat('#A8724A')); belly.position.set(0, -0.1, 0.42); g.add(belly);
    const nose = mesh(new THREE.SphereGeometry(0.17, 8, 6), mat('#FF9AA8')); nose.position.set(0, 0.05, 0.85); g.add(nose);
    for (const sx of [-0.28, 0.28]) {
      const eye = mesh(new THREE.SphereGeometry(0.08, 6, 4), mat('#111111'), false); eye.position.set(sx, 0.3, 0.7); g.add(eye);
      const claw = mesh(new THREE.ConeGeometry(0.12, 0.3, 4), mat('#E8DCC4')); claw.position.set(sx * 2.3, -0.45, 0.4); claw.rotation.x = Math.PI / 2; g.add(claw);
    }
    const sack = mesh(new THREE.IcosahedronGeometry(0.42, 0), mat('#C9A26A')); sack.position.set(0.7, 0.55, -0.2); g.add(sack); g.userData.sack = sack;
  } else if (type === 'spider') {
    const body = mesh(new THREE.IcosahedronGeometry(0.55, 0), mat('#7A4FC0', { emissive: 0x200a40 })); g.add(body);
    const head = mesh(new THREE.IcosahedronGeometry(0.32, 0), mat('#9B6AE0')); head.position.set(0, -0.15, 0.5); g.add(head);
    for (const sx of [-0.12, 0.12]) { const eye = mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3a3a }), false); eye.position.set(sx, -0.05, 0.78); g.add(eye); }
    for (let i = 0; i < 8; i++) {
      const sx = i < 4 ? -1 : 1, k = i % 4;
      const leg = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 4), mat('#3A2060'));
      leg.position.set(sx * 0.7, -0.2, -0.3 + k * 0.22); leg.rotation.z = sx * 1.0; g.add(leg);
    }
    const thread = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(0, 30, 0)]), new THREE.LineBasicMaterial({ color: 0xe8e8f0 }));
    g.add(thread);
  } else if (type === 'slime') {
    const blob = mesh(new THREE.IcosahedronGeometry(0.75, 1), new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xc2420a, emissiveIntensity: 0.6, flatShading: true, roughness: 0.4 }));
    blob.scale.set(1.2, 0.8, 1); g.add(blob); g.userData.blob = blob;
    for (const sx of [-0.25, 0.25]) { const eye = mesh(new THREE.SphereGeometry(0.11, 6, 4), mat('#111111'), false); eye.position.set(sx, 0.2, 0.68); g.add(eye); }
  } else {
    for (let i = 0; i < 4; i++) {
      const rock = mesh(new THREE.DodecahedronGeometry(0.55 + frac(i) * 0.3, 0), mat('#8C8494'));
      rock.position.set((i - 1.5) * 0.7, (i % 2) * 0.45, (i % 3 - 1) * 0.3); g.add(rock);
    }
  }
  return g;
}
function hpBar(x, y, e) {
  const w = 54, h = 7;
  octx.fillStyle = 'rgba(20,12,24,0.85)'; roundRect(octx, x - w / 2 - 2, y - 2, w + 4, h + 4, 5); octx.fill();
  octx.fillStyle = '#3A2E44'; roundRect(octx, x - w / 2, y, w, h, 4); octx.fill();
  octx.fillStyle = '#FF4A4A'; roundRect(octx, x - w / 2, y, w * e.hp / e.max, h, 4); octx.fill();
}
const enemyHud = [];
function updateEnemy(dt) {
  const rt = G.Game.rt, e = rt.enemy;
  L.enemy = null;
  if (!e) { if (enemyMesh) { world.remove(enemyMesh); enemyMesh = null; enemyFor = null; } return; }
  if (enemyFor !== e) {
    if (enemyMesh) world.remove(enemyMesh);
    enemyMesh = buildEnemy(e.type); enemyFor = e;
    world.add(enemyMesh);
  }
  const dh = drill.userData.height;
  let x = 0, y = 0, z = 0.7;
  if (e.type === 'mole') {
    const k = Math.min(1, e.t / 1.2);
    const tx = e.side < 0 ? -3.4 : 3.4, fx = e.side < 0 ? bounds.x0 - 2 : bounds.x1 + 2;
    x = lerp(fx, tx, k); y = dh * 0.55; z = 0.8;
    enemyMesh.rotation.y = e.side < 0 ? 0.5 : -0.5;
    enemyMesh.userData.sack.visible = e.stolen > 0;
    enemyMesh.position.y += Math.sin(time * 12) * 0.03;
    if (e.stolen > 0) {
      e.popT = (e.popT || 0) - dt;
      if (e.popT <= 0) { e.popT = 1; const p = toScreen(x, y + 1.2, z); pop(p.x, p.y, '-' + G.fmt(e.stolen, true), '#FF6A6A'); }
    }
  } else if (e.type === 'spider') {
    const k = Math.min(1, e.t / 1.5);
    x = 0.2; y = lerp(bounds.y1 + 2, dh + 0.9, k); z = DRILL_Z + 0.6;
  } else if (e.type === 'slime') {
    const k = Math.min(1, e.t / 0.8);
    x = 0; y = lerp(bounds.y1 + 2, 0.9, k * k); z = DRILL_Z + 0.95;
    enemyMesh.userData.blob.scale.y = 0.8 + Math.sin(time * 7) * 0.08;
    if (k >= 1 && Math.random() < dt * 6) sparkAt((Math.random() - 0.5) * 1.2, 0.4, z + 0.3, 0, -2, 0, 0.8, '#FF8A2A', 6);
  } else {
    const k = Math.min(1, e.t / 0.6);
    x = 0; y = lerp(bounds.y1 + 2, dh + 0.45, k * k); z = DRILL_Z;
    if (k >= 1 && Math.random() < dt * 8) debrisAt((Math.random() - 0.5) * 2, dh + 0.3, z + 0.6, (Math.random() - 0.5) * 2, 1, 0.5, 1.2, 0.6, '#9A96A6');
  }
  enemyMesh.position.set(x, y, z);
  const c = toScreen(x, y, z);
  const r = Math.max(40, unitPx() * (e.type === 'cavein' ? 1.6 : 1.1));
  L.enemy = { x: c.x - r, y: c.y - r, w: r * 2, h: r * 2 };
  if (e.type === 'slime' || e.type === 'cavein') {
    const a = toScreen(0, 0, 0), b = toScreen(0, dh + 1, 0);
    L.enemy = { x: a.x - r, y: b.y - 10, w: r * 2, h: a.y - b.y + 20 };
  }
  enemyHud.length = 0;
  enemyHud.push({ x: c.x, y: c.y - r - 14, e, jam: G.Game.ENEMIES[e.type].mul === 0 });
}
function hitEnemy(x, y) {
  const e = L.enemy;
  if (!e || !G.Game.rt.enemy) return false;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  return Math.abs(x - cx) <= Math.max(22, e.w / 2) && Math.abs(y - cy) <= Math.max(22, e.h / 2);
}
function enemyFx(res, x, y) {
  if (!res || res.limited) return;
  const w = screenToFace(x, y, 0.6);
  sparks(w.x, w.y, 1, 10, '#FFFFFF');
  burst(w.x, w.y, 0.8, 6, ['#FF6A6A', '#FFFFFF'], 3);
  shake(2);
  pop(x, y - 10, res.defeated ? 'WIN!' : 'POW!', res.defeated ? '#9BE58A' : '#FFFFFF', res.defeated);
  if (res.defeated) {
    burst(w.x, w.y, 0.8, 30, ['#FFD447', '#FFF2A8', '#9BE58A'], 6);
    pop(x, y + 18, '+' + G.fmt(res.coins, true), '#FFD447');
    flyTo('coins', x, y, 8);
    if (res.gems) { pop(x, y + 40, '+' + res.gems, '#8FE8FF', true, 'gem'); flyTo('gems', x, y, 3); }
  }
}

// ---------- companions ----------
const pets = { bot: null, bat: null, golem: null };
const petState = { botHit: 0, botCoins: 0, botPopT: 0, bat: { x: -3, y: 4, state: 'idle', target: null, cd: 2 }, golem: { x: -4.5, y: -0.4, state: 'home', cd: 0, tx: 0, ty: 0 } };
function buildPet(id) {
  const g = new THREE.Group();
  if (id === 'bot') {
    const body = mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), mat('#C9D2DE', { metalness: 0.5, roughness: 0.4 })); g.add(body);
    const eye = mesh(new THREE.BoxGeometry(0.42, 0.14, 0.05), new THREE.MeshStandardMaterial({ color: 0x5af0ff, emissive: 0x30c0e0, emissiveIntensity: 1.5 }), false); eye.position.set(0, 0.04, 0.31); g.add(eye);
    const rotor = new THREE.Group();
    for (let i = 0; i < 2; i++) { const b = mesh(new THREE.BoxGeometry(0.9, 0.03, 0.1), mat('#4A5260')); b.rotation.y = i * Math.PI / 2; rotor.add(b); }
    rotor.position.y = 0.36; g.add(rotor); g.userData.rotor = rotor;
    const arm = mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), mat('#8C96A6')); arm.position.set(-0.5, -0.1, 0); g.add(arm);
  } else if (id === 'bat') {
    const body = mesh(new THREE.IcosahedronGeometry(0.32, 0), mat('#7A4FC0')); g.add(body);
    const wings = [];
    for (const sx of [-1, 1]) {
      const w = mesh(new THREE.ConeGeometry(0.45, 0.9, 3), mat('#5A3A9A')); w.rotation.z = sx * Math.PI / 2; w.position.x = sx * 0.6; w.scale.set(1, 1, 0.2); g.add(w); wings.push(w);
    }
    for (const sx of [-0.12, 0.12]) { const e = mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe27a }), false); e.position.set(sx, 0.06, 0.3); g.add(e); }
    const mag = mesh(new THREE.TorusGeometry(0.16, 0.06, 6, 10, Math.PI), mat('#E8434F')); mag.position.y = -0.38; mag.rotation.z = Math.PI; g.add(mag);
    g.userData.wings = wings;
  } else {
    const body = mesh(new THREE.BoxGeometry(1.0, 1.0, 0.8), mat('#8C8494')); body.position.y = 0.9; g.add(body);
    const head = mesh(new THREE.BoxGeometry(0.7, 0.55, 0.6), mat('#9A92A2')); head.position.y = 1.7; g.add(head);
    for (const sx of [-0.16, 0.16]) { const e = mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), new THREE.MeshStandardMaterial({ color: 0xffd447, emissive: 0xffb020, emissiveIntensity: 1.5 }), false); e.position.set(sx, 1.75, 0.31); g.add(e); }
    for (const sx of [-0.65, 0.65]) { const arm = mesh(new THREE.BoxGeometry(0.35, 0.9, 0.4), mat('#7A7484')); arm.position.set(sx, 0.85, 0); g.add(arm); }
    for (const sx of [-0.25, 0.25]) { const leg = mesh(new THREE.BoxGeometry(0.35, 0.45, 0.4), mat('#6A6474')); leg.position.set(sx, 0.22, 0); g.add(leg); }
  }
  g.scale.setScalar(0.9);
  world.add(g);
  return g;
}
function moveTo(o, tx, ty, sp, dt) {
  const dx = tx - o.x, dy = ty - o.y, dd = Math.hypot(dx, dy);
  if (dd <= sp * dt || dd < 0.02) { o.x = tx; o.y = ty; return true; }
  o.x += dx / dd * sp * dt; o.y += dy / dd * sp * dt;
  return false;
}
function botFx(coins) {
  petState.botHit = 0.15;
  petState.botCoins += coins;
  sparkAt(0.3, 0.1, DRILL_Z + 1.1, 2 + Math.random() * 2, 2 + Math.random() * 2, 1, 0.3, '#5AF0FF', 8);
}
function updatePets(dt) {
  const C = G.Crystal;
  for (const id of ['bot', 'bat', 'golem']) {
    const want = C.petLv(id) > 0;
    if (want && !pets[id]) pets[id] = buildPet(id);
    if (!want && pets[id]) { world.remove(pets[id]); pets[id] = null; }
  }
  const dh = drill.userData.height;
  if (pets.bot) {
    petState.botHit -= dt;
    const g = pets.bot;
    g.position.set(2.4 + (petState.botHit > 0 ? -0.25 : 0), 1.0 + Math.sin(time * 3) * 0.12, DRILL_Z + 1.0);
    g.userData.rotor.rotation.y += dt * 30;
    petState.botPopT -= dt;
    if (petState.botPopT <= 0 && petState.botCoins > 0) {
      petState.botPopT = 1.2;
      const p = toScreen(g.position.x, g.position.y + 0.8, g.position.z);
      pop(p.x, p.y, '+' + G.fmt(petState.botCoins, true), '#5AF0FF');
      petState.botCoins = 0;
    }
  }
  if (pets.bat) {
    const b = petState.bat, g = pets.bat;
    b.cd -= dt;
    if (b.state === 'idle') {
      moveTo(b, Math.cos(time * 1.2) * 4.2, dh + 0.8 + Math.sin(time * 2.4) * 0.6, 4, dt);
      if (b.cd <= 0 && nodes.length) { b.target = nodes[0]; b.state = 'go'; }
    } else if (!nodes.includes(b.target)) b.state = 'idle';
    else if (moveTo(b, b.target.x, nodeWorldY(b.target), 11, dt)) { collect(b.target); b.state = 'idle'; b.cd = C.batEvery(); }
    g.position.set(b.x, b.y, 1.3);
    const flap = Math.sin(time * 22) * 0.6;
    g.userData.wings[0].rotation.y = flap; g.userData.wings[1].rotation.y = -flap;
  }
  if (pets.golem) {
    const gs = petState.golem, g = pets.golem;
    const hx = -4.6, hy = -0.6;
    gs.cd -= dt;
    const e = G.Game.rt.enemy;
    if (gs.state === 'home') {
      moveTo(gs, hx, hy, 3, dt);
      if (e && e.t > 1.3 && enemyMesh && gs.cd <= 0) { gs.tx = enemyMesh.position.x - 0.8; gs.ty = enemyMesh.position.y - 1.0; gs.state = 'go'; }
    } else if (gs.state === 'go') {
      if (!e) gs.state = 'home';
      else if (moveTo(gs, gs.tx, gs.ty, 12, dt)) {
        const p = toScreen(enemyMesh.position.x, enemyMesh.position.y, enemyMesh.position.z);
        enemyFx(G.Game.hitEnemy(true), p.x, p.y);
        gs.cd = C.golemEvery(); gs.state = 'home';
      }
    }
    g.position.set(gs.x, gs.y + Math.abs(Math.sin(time * 6)) * (gs.state === 'go' ? 0.25 : 0.04), 1.0);
  }
}

// ---------- public fx ----------
function shake(amp) { if (!S().settings.shake) return; shakeAmp = Math.max(shakeAmp, amp); shakeT = 0.3; }
let tipFlash = 0;
function tapFx(x, y, coins, dmg, crit) {
  tipFlash = 1;
  const sc = skinOf(skinId()).spark;
  sparks(0, 0, DRILL_Z + 1, crit ? 26 : 10, crit ? '#FF6A2A' : sc);
  burst(0, 0.2, DRILL_Z + 1.1, crit ? 10 : 4, [layerHex(), '#8A8A96'], 4);
  // numbers fly out to the side of the drill so they never sit on top of it
  const side = Math.random() < 0.65 ? 1 : -1;
  const halfW = Math.max(L.s * 0.55, 40);
  const tx = clamp(L.cx + side * (halfW + 34 + Math.random() * 40), R.x + 70, R.x + R.w - 70);
  const ty = clamp(L.tipY - L.s * (0.25 + Math.random() * 0.45), R.y + 30, R.y + R.h - 20);
  if (crit) pop(tx, ty - 30 * L.k, 'CRIT!', '#FF6A2A', true);
  pop(tx, ty, '+' + G.fmt(coins, true), crit ? '#FFB347' : '#FFD447', crit);
  flyTo('coins', tx, ty, crit ? 4 : 1);
  if (dmg > 0) pop(L.cx + (Math.random() - 0.5) * 80, L.tipY + 34 * L.k, '-' + G.fmt(dmg, true), '#FFFFFF');
  shake(crit ? 3 : 1);
}
function layerHex() { return planetOf().layers[G.Game.layer()]; }
function plateBroken(ni, gems) {
  const colr = planetOf().layers[ni];
  for (let i = 0; i < 60; i++) debrisAt(-10 + Math.random() * 20, -PLATE_T / 2, 0.4 + Math.random(), (Math.random() - 0.5) * 8, 3 + Math.random() * 6, Math.random() * 4, 1 + Math.random() * 0.6, 1 + Math.random() * 1.6, i % 3 ? colr : '#8A8A96');
  sparks(0, 0, 1, 30, '#FFE27A');
  if (gems) { pop(L.cx, L.tipY - L.s * 0.5, '+' + gems, '#8FE8FF', true, 'gem'); flyTo('gems', L.cx, L.tipY, Math.min(6, gems + 1)); }
  shake(5);
}
let drillFlash = 0;
function flashDrill() {
  drillFlash = 0.6;
  for (let i = 0; i < 26; i++) sparkAt((Math.random() - 0.5) * 3, Math.random() * 4, DRILL_Z + 1.2, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, 1, 0.9, '#FFF2A8', 1);
  shake(3);
}
function boom(onDone) { anim = { type: 'boom', t: 0, from: S().planet - 1, onDone }; flash = 0; while (nodes.length) removeNode(nodes[0]); }
const busy = () => !!anim;

// ---------- 2D overlay: popups, coins, bars, splash ----------
const pops = Array.from({ length: 30 }, () => ({ on: false, x: 0, y: 0, text: '', color: '#fff', life: 0, big: false, icon: null }));
let popi = 0;
function pop(x, y, text, color, big, icon) {
  x = clamp(x + (Math.random() - 0.5) * 30, R.x + 56, R.x + R.w - 56);
  for (let tries = 0; tries < 6; tries++) {
    if (!pops.some(q => q.on && q.life > 0.55 && Math.abs(q.x - x) < 70 && Math.abs(q.y - y) < 20)) break;
    y -= 22;
  }
  const p = pops[popi]; popi = (popi + 1) % pops.length;
  Object.assign(p, { on: true, x, y, text, color, life: 1, big: !!big, icon: icon || null });
}
const flyers = [];
function flyTo(kind, x, y, n) {
  const T = G.UI?.hudTarget(kind);
  if (!T) return;
  for (let k = 0; k < n && flyers.length < 48; k++) {
    flyers.push({ kind, t: -k * 0.05, dur: 0.55 + Math.random() * 0.2, x0: x + (Math.random() - 0.5) * 24, y0: y + (Math.random() - 0.5) * 24,
      cx: x + (Math.random() - 0.5) * 160, cy: Math.min(y, T.y) - 60 - Math.random() * 80, x1: T.x, y1: T.y });
  }
}
const iconImgs = {};
function iconImg(name) {
  if (iconImgs[name]) return iconImgs[name];
  const svg = (G.UI?.IC || {})[name];
  if (!svg) return null;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" '));
  iconImgs[name] = img;
  return img;
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function outlined(text, x, y, size, color) {
  octx.font = `900 ${size}px Nunito, system-ui, sans-serif`;
  octx.textAlign = 'center'; octx.textBaseline = 'middle';
  octx.lineJoin = 'round';
  octx.lineWidth = Math.max(3, size * 0.2); octx.strokeStyle = 'rgba(25,12,30,0.9)';
  octx.strokeText(text, x, y);
  octx.fillStyle = color; octx.fillText(text, x, y);
}
function drawOverlay(dt) {
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  octx.clearRect(0, 0, W, H);
  if (flash > 0) { octx.fillStyle = `rgba(255,255,255,${flash})`; octx.fillRect(0, 0, W, H); }
  const rt = G.Game.rt;
  // heat meter beside the drill
  heatShow = rt.heat > 0 || rt.over > 0 ? 1 : Math.max(0, heatShow - dt * 2);
  if (heatShow > 0 && !anim) {
    const a = toScreen(-SW - 0.7, 0.9, 0.6), b = toScreen(-SW - 0.7, 3.4, 0.6);
    const h = a.y - b.y, w = Math.max(10, h * 0.16), x = a.x - w / 2;
    octx.globalAlpha = heatShow;
    octx.fillStyle = 'rgba(20,12,24,0.85)'; roundRect(octx, x - 3, b.y - 3, w + 6, h + 6, w / 2 + 3); octx.fill();
    const f = rt.over > 0 ? rt.over / G.Game.OVERDRIVE : rt.heat;
    const gr = octx.createLinearGradient(0, a.y, 0, b.y);
    if (rt.over > 0) { ['#FF5A5A', '#FFD447', '#5AFF8A', '#5AC8FF', '#C59BFF'].forEach((c, i) => gr.addColorStop(((i + time * 2) % 5) / 5, c)); }
    else { gr.addColorStop(0, '#FFD447'); gr.addColorStop(0.6, '#FF9F2E'); gr.addColorStop(1, '#FF3A2A'); }
    octx.fillStyle = gr; roundRect(octx, x, a.y - h * f, w, h * f, w / 2); octx.fill();
    outlined('🔥', a.x, b.y - w - 4, w * 1.4, '#FFFFFF');
    octx.globalAlpha = 1;
  }
  for (const eh of enemyHud) {
    hpBar(eh.x, eh.y, eh.e);
    if (eh.jam && Math.floor(time * 2.5) % 2) outlined('JAMMED!', L.cx, L.cy - L.s * 0.75, 18 * L.k, '#FF6A6A');
  }
  for (const p of pops) {
    if (!p.on) continue;
    p.life -= dt / 0.9;
    if (p.life <= 0) { p.on = false; continue; }
    const yy = p.y - (1 - p.life) * 46;
    octx.globalAlpha = Math.min(1, p.life * 3);
    const size = (p.big ? 26 : 19) * L.k * (p.life > 0.85 ? 1 + (p.life - 0.85) * 2 : 1);
    outlined(p.text, p.x, yy, size, p.color);
    if (p.icon === 'gem') { const img = iconImg('gem'); if (img?.complete) octx.drawImage(img, p.x + octx.measureText(p.text).width / 2 + 4, yy - size * 0.55, size * 1.1, size * 1.1); }
    octx.globalAlpha = 1;
  }
  for (let k = flyers.length - 1; k >= 0; k--) {
    const f = flyers[k];
    f.t += dt;
    if (f.t < 0) continue;
    const u = Math.min(1, f.t / f.dur), v = 1 - u;
    const x = v * v * f.x0 + 2 * v * u * f.cx + u * u * f.x1;
    const y = v * v * f.y0 + 2 * v * u * f.cy + u * u * f.y1;
    const img = iconImg(f.kind === 'gems' ? 'gem' : 'coin');
    const size = 26 * (1 - 0.35 * u) * L.k;
    if (img?.complete) octx.drawImage(img, x - size / 2, y - size / 2, size, size);
    if (u >= 1) { flyers.splice(k, 1); G.UI?.bump(f.kind); if (f.kind === 'coins' && Math.random() < 0.5) G.Audio.sfx('coin'); }
  }
}
let heatShow = 0;

// ---------- flight between planets ----------
let space = null;
function buildSpace() {
  space = new THREE.Group();
  const n = 600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (frac(i * 3) - 0.5) * 140; pos[i * 3 + 1] = (frac(i * 3 + 1) - 0.5) * 80; pos[i * 3 + 2] = -10 - frac(i * 3 + 2) * 60; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.35, color: 0xffffff, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  space.add(stars); space.userData.stars = stars;
  space.visible = false;
  scene.add(space);
}
function planetBall(p) {
  const pl = G.planet(p);
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const c = [];
  const pa = geo.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const yy = pa.getY(i);
    const band = clamp(Math.floor((yy + 1) / 2 * 10), 0, 9);
    const cc = col(pl.layers[9 - band]);
    c.push(cc.r, cc.g, cc.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  return mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }), false);
}
function drawFlight(t, dt) {
  if (!space) buildSpace();
  if (!space.visible) {
    space.visible = true; world.visible = false;
    space.userData.from = planetBall(anim.from); space.userData.to = planetBall(anim.from + 1);
    space.userData.ship = buildDrill(skinId(), G.Look.look(S().lv));
    space.add(space.userData.from, space.userData.to, space.userData.ship);
    scene.background = new THREE.Color(0x070a1c);
  }
  const u = t / 2;
  const { from, to, ship, stars } = space.userData;
  stars.position.x = -t * 18;
  const ct = camTarget;
  const e = u * u * (3 - 2 * u);
  from.position.set(ct.x - 3.2 - 6 * e, ct.y - 0.5, -8);
  from.scale.setScalar(Math.max(0.01, 3.2 * (1 - 0.7 * e)));
  from.rotation.y += dt * 0.6;
  const nk = clamp((u - 0.25) / 0.75, 0, 1);
  to.visible = nk > 0;
  to.position.set(ct.x + 9 - 5.5 * nk, ct.y - 0.5, -8);
  to.scale.setScalar(0.4 + 2.8 * nk);
  to.rotation.y += dt * 0.4;
  ship.scale.setScalar(0.42);
  ship.position.set(ct.x - 3 + 5.6 * e, ct.y + 0.6 + Math.sin(u * Math.PI) * 1.2, 0);
  ship.rotation.set(0, 0, Math.PI / 2 + 0.25 * Math.cos(u * Math.PI));
  ship.userData.parts.spin.rotation.y += dt * 20;
  const back = new THREE.Vector3(0, ship.userData.height * 0.42, 0).applyEuler(ship.rotation).add(ship.position);
  for (let i = 0; i < 2; i++) sparkAt(back.x, back.y + (Math.random() - 0.5) * 0.3, 0.1, -6 - Math.random() * 5, (Math.random() - 0.5) * 1.5, 0, 0.45, Math.random() < 0.5 ? '#FFB347' : '#FFF2A8', 0);
}
function endFlight() {
  if (!space) return;
  const { from, to, ship } = space.userData;
  [from, to, ship].forEach(o => { if (o) { space.remove(o); o.traverse(m => m.geometry?.dispose()); } });
  space.visible = false; world.visible = true;
}

// ---------- frame ----------
let emitAcc = 0;
function frame(dt) {
  time += dt;
  if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeAmp = 0; }
  if (tipFlash > 0) tipFlash = Math.max(0, tipFlash - dt * 6);
  updateCamera(dt);
  const s = S(), rt = G.Game.rt, d = s.depth;
  refreshPalette();
  ensureDrill();
  if (!anim) {
    nodeTimer -= dt;
    if (nodeTimer <= 0) { nodeTimer = G.Game.nodeInterval(); spawnNode(); }
  }
  scrollU = rt.camB / 4 * U;
  const surfY = d * U;
  surfacePlane.constant = surfY;
  updateTiles(scrollU, d);
  for (const m of grooveParts) colorStrip(m, m.userData.ty, d, m.userData.dark);
  colorStrip(floorMesh, floorMesh.userData.ty, d, 0.3);
  // supports scroll with the rock above the drill
  for (const b of beams.children) {
    const step = 5.2;
    const y = ((Y0 + scrollU - b.userData.slot * step) % (step * 6) + step * 6) % (step * 6) - step * 6 + Y0;
    b.position.y = y;
    b.visible = y > drill.userData.height + 0.4 && y < surfY - 0.6;
  }
  surface.position.y = surfY;
  surface.visible = surfY < 40;
  if (surface.visible) {
    surface.userData.wheel.rotation.z += dt * (rt.moving ? 3 : 0.3);
    surface.userData.flag.rotation.y = Math.sin(time * 3) * 0.25;
    for (const o of surface.children) if (o.userData.drift) { o.position.x += o.userData.drift * dt; if (o.position.x > 40) o.position.x = -40; }
  }
  const base = planetOf().base;
  scene.background = surfY < 40 && !anim ? skyTexture(base) : new THREE.Color('#0E0A12');
  // light dims with depth; the drill carries its own lamps
  const li = G.layerAt(Math.min(G.CORE, d));
  const dark = [0.15, 0.25, 0.38, 0.46, 0.52, 0.44, 0.55, 0.42, 0.3, 0.1][li] * Math.min(1, d / 15);
  // very dark rock (volcanic planets) gets extra fill light so the mine never turns into a black screen
  const lum = layerCols[li].r * 0.3 + layerCols[li].g * 0.59 + layerCols[li].b * 0.11;
  const fill = clamp((0.12 - lum) * 9, 0, 1);
  hemi.intensity = lerp(1.5, 0.95, dark) + fill * 1.1;
  sun.intensity = lerp(2.7, 1.3, dark) + fill * 0.9;
  headLamp.intensity = lerp(6, 30, dark) * (1 + tipFlash * 0.5);
  tipLight.intensity = (7 + tipFlash * 24) * (rt.over > 0 ? 1.8 : 1);
  tipLight.color.set(rt.over > 0 ? 0xff6a2a : 0xffb060);
  // core glow
  coreGlow.visible = d > 7600;
  if (coreGlow.visible) {
    coreGlow.position.set(0, -(G.CORE - d) * U - 7.2, -4);
    coreGlow.scale.setScalar(1 + Math.sin(time * 4) * 0.03);
    coreLight.position.set(0, coreGlow.position.y + 5, 3);
    coreLight.intensity = 12 * clamp((d - 7600) / 2400, 0, 1);
  } else coreLight.intensity = 0;
  // drill animation
  const jammed = rt.enemy && G.Game.ENEMIES[rt.enemy.type].mul === 0;
  const working = (rt.moving || !!s.plate) && !jammed;
  const spin = working ? (rt.over > 0 ? 34 : s.turboLeft > 0 ? 24 : rt.enemy ? 6 : 15) : 0.6;
  const parts = drill.userData.parts;
  parts.spin.rotation.y += dt * spin;
  drill.position.x = working ? (Math.random() - 0.5) * 0.04 : jammed ? Math.sin(time * 40) * 0.05 : 0;
  if (parts.fan) parts.fan.rotation.y += dt * (working ? 26 : 3);
  for (const f of parts.flames) f.scale.y = 0.7 + Math.random() * 0.6;
  if (parts.reactor) parts.reactor.rotation.y += dt * 2;
  for (const a of parts.arms) a.position.x = Math.sin(time * 8) * 0.04;
  const heatGlow = rt.over > 0 ? 0.6 + 0.3 * Math.sin(time * 20) : drillFlash > 0 ? drillFlash : 0;
  if (drillFlash > 0) drillFlash = Math.max(0, drillFlash - dt);
  parts.cone.material.emissiveIntensity = 1;
  parts.cone.material.emissive.setHex(heatGlow > 0 ? (rt.over > 0 ? 0xff4a10 : 0xffffff) : (G.Look.look(s.lv).head >= 5 ? 0x8a1a80 : 0x000000)).multiplyScalar(heatGlow > 0 ? heatGlow : 1);
  // tip sparks and debris
  if (working || G.Game.atCore()) {
    emitAcc += dt * (G.Game.atCore() ? 14 : rt.over > 0 ? 90 : 42);
    const sc = skinOf(skinId()).spark, rainbow = ['#FF5A5A', '#FFD447', '#5AFF8A', '#5AC8FF', '#C59BFF'];
    const lc = layerHex();
    while (emitAcc >= 1) {
      emitAcc--;
      const side = Math.random() < 0.5 ? -1 : 1;
      if (Math.random() < 0.5) sparkAt(side * 0.15, 0.05, DRILL_Z + 0.8, side * (2 + Math.random() * 4), 2 + Math.random() * 4, 1 + Math.random() * 2, 0.3 + Math.random() * 0.3, rt.over > 0 ? rainbow[Math.floor(Math.random() * 5)] : sc, 9);
      else debrisAt(side * 0.3, 0.1, DRILL_Z + 0.9, side * (1 + Math.random() * 3), 2 + Math.random() * 3, 0.5 + Math.random() * 2, 0.6 + Math.random() * 0.4, 0.5 + Math.random() * 0.6, lc);
    }
    if (working && Math.random() < dt * 6) {
      const top = drill.userData.height;
      for (const sx of [-0.62, 0.62]) debrisAt(sx, top + 1, DRILL_Z - 0.25, (Math.random() - 0.5) * 0.4, 1.5, 0, 0.9, 0.9, rt.over > 0 ? '#FF8A3A' : '#8A8494');
    }
  }
  if (rt.over > 0 && Math.random() < dt * 30) sparkAt((Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4), -4 + Math.random() * 3, 0.6, 0, 22, 0, 0.25, '#FFD447', 0);
  // nodes
  for (let k = nodes.length - 1; k >= 0; k--) {
    const n = nodes[k];
    n.life -= dt; n.t += dt;
    const y = nodeWorldY(n);
    if (n.life <= 0 || y > bounds.y1 + 3) { removeNode(n); continue; }
    n.mesh.position.set(n.x, y + Math.sin(n.t * 3) * 0.08, 0.55);
    n.mesh.rotation.y = Math.sin(n.t * 1.6) * 0.5;
    n.mesh.visible = !(n.life < 2 && Math.floor(n.life * 8) % 2 === 0);
    const u = n.mesh.userData;
    u.halo.material.opacity = 0.35 + 0.25 * Math.sin(n.t * 5);
    if (u.ring) u.ring.rotation.x = n.t * 2;
    if (u.spark) u.spark.scale.setScalar(0.35 + Math.random() * 0.3);
    if (u.flame) u.flame.children[0].scale.y = 0.8 + Math.random() * 0.4;
  }
  ensurePlate();
  // cart on rails below the drill
  rails.visible = cart.visible = !!rt.cart && !anim;
  L.cart = null;
  if (rt.cart) {
    const railY = Math.max(bounds.y0 + 1.6, -9);
    const x0 = bounds.x0 - 3, x1 = bounds.x1 + 3;
    const x = lerp(x0, x1, rt.cart.t / 15);
    rails.position.set(0, railY - 0.62, 0.9);
    cart.position.set(x, railY, 0.9);
    for (const w of cart.userData.wheels) w.rotation.y += dt * 6;
    const c = toScreen(x, railY + 0.3, 0.9), r = Math.max(46, unitPx() * 1.5);
    L.cart = { x: c.x - r, y: c.y - r, w: r * 2, h: r * 2 };
  }
  updateEnemy(dt);
  updatePets(dt);
  updateParticles(dt);
  // screen-space anchors used by the UI
  const tip = toScreen(0, 0, DRILL_Z + 0.9), topP = toScreen(0, drill.userData.height, DRILL_Z);
  L.cx = tip.x; L.tipY = tip.y; L.cy = (tip.y + topP.y) / 2; L.s = Math.abs(tip.y - topP.y);
  const side = toScreen(1.9, drill.userData.height / 2, DRILL_Z);
  L.box = { x: 2 * tip.x - side.x, y: topP.y, w: 2 * (side.x - tip.x), h: tip.y - topP.y };
  if (anim) {
    anim.t += dt;
    if (anim.type === 'boom') {
      flash = Math.min(1, anim.t / 0.25);
      if (anim.t >= 0.5) { anim = { type: 'fly', t: 0, from: anim.from, onDone: anim.onDone }; G.Audio.sfx('whoosh'); }
    } else if (anim.type === 'fly') {
      flash = Math.max(0, 1 - anim.t / 0.35);
      drawFlight(anim.t, dt);
      if (anim.t >= 2) { const cb = anim.onDone; anim = null; flash = 0; endFlight(); cb && cb(); }
    }
  }
  renderer.render(scene, camera);
  drawOverlay(dt);
}

function hitCart(x, y) {
  const c = L.cart;
  return !!c && x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
}
const inScene = (x, y) => x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h;

// ---------- thumbnails for the shop ----------
let thumbR = null, thumbScene, thumbCam;
const thumbCache = new Map();
function thumbRender(obj, w, h, dist, ty) {
  if (!thumbR) {
    thumbR = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    thumbR.toneMapping = THREE.NeutralToneMapping;
    thumbScene = new THREE.Scene();
    thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 2.2));
    const dl = new THREE.DirectionalLight(0xffffff, 2.4); dl.position.set(3, 5, 6); thumbScene.add(dl);
    thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  }
  thumbR.setPixelRatio(1);
  thumbR.setSize(w, h, false);
  thumbCam.aspect = w / h; thumbCam.position.set(0, ty + dist * 0.25, dist); thumbCam.lookAt(0, ty, 0); thumbCam.updateProjectionMatrix();
  thumbScene.add(obj);
  thumbR.render(thumbScene, thumbCam);
  thumbScene.remove(obj);
  obj.traverse(o => o.geometry?.dispose());
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(thumbR.domElement, 0, 0);
  return c;
}
function drillPreview(canvas, id, lv) {
  const look = lv ? G.Look.look(lv) : { head: 0, engine: 0, grip: 0, sorter: 0, storage: 0 };
  const key = 'drill|' + id + JSON.stringify(look);
  let c = thumbCache.get(key);
  if (!c) {
    const d = buildDrill(id, look);
    d.rotation.y = -0.45;
    c = thumbRender(d, 160, 200, 9.5, 2.5);
    thumbCache.set(key, c);
  }
  canvas.width = c.width; canvas.height = c.height;
  canvas.getContext('2d').drawImage(c, 0, 0);
}
function petPreviewURL(id) {
  const key = 'pet|' + id;
  if (!thumbCache.has(key)) {
    const g = buildPet(id); world.remove(g);
    g.rotation.y = -0.4;
    thumbCache.set(key, thumbRender(g, 96, 96, id === 'golem' ? 6.5 : 4, id === 'golem' ? 0.9 : 0).toDataURL());
  }
  return thumbCache.get(key);
}

G.Render = {
  init, setScene, resize, measure, setViewScale, frame, tapFx, plateBroken, boom, busy, hitCart, hitNode, collect, hitEnemy, enemyFx, flashDrill, botFx, flyTo,
  inScene, drillPreview, petPreviewURL, shake, R, L, nodes, spawnNode, nodeScreen,
  get plateBottom() { return toScreen(0, -PLATE_T, 0.75).y; },
  get PX() { return unitPx() / 4; },
};
