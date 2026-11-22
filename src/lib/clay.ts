// ─── The clay figure, in three.js ─────────────────────────────────────────────
// Only ever loaded with a dynamic import, so three stays out of the main bundle.
// Everything is soft primitives (balls, capsules, lathed bells) in a matte,
// faintly thumb-printed material under warm studio light, like a clay toy.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { HAIR_COLOR, SKIN, TOP_COLOR, type Look } from "./character";

type V3 = [number, number, number];

// ─── Materials ────────────────────────────────────────────────────────────────

let grain: THREE.Texture | null = null;

/** Fine, blotchy noise for the bump map: the uneven surface of pressed clay. */
function clayGrain() {
  if (grain) return grain;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 110 + Math.random() * 40;
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  grain = new THREE.CanvasTexture(c);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(3, 3);
  return grain;
}

const mats = new Map<string, THREE.MeshStandardMaterial>();

function clay(color: string, { gloss = false, side = THREE.FrontSide as THREE.Side } = {}) {
  const key = `${color}|${gloss}|${side}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: gloss ? 0.25 : 0.82,
      metalness: 0,
      bumpMap: gloss ? null : clayGrain(),
      bumpScale: 2.5,
      side,
    });
    mats.set(key, m);
  }
  return m;
}

// ─── Shapes ───────────────────────────────────────────────────────────────────

function ball(r: number, mat: THREE.Material, at: V3, scale: V3 = [1, 1, 1]) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), mat);
  m.position.set(...at);
  m.scale.set(...scale);
  return m;
}

function capsule(r: number, len: number, mat: THREE.Material, at: V3) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 10, 24), mat);
  m.position.set(...at);
  return m;
}

function rod(a: V3, b: V3, r: number, mat: THREE.Material) {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, from.distanceTo(to), 12), mat);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  return m;
}

/** A turned shape from a smooth radius-by-height profile. */
function lathe(profile: [number, number][], mat: THREE.Material) {
  const curve = new THREE.SplineCurve(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.Mesh(new THREE.LatheGeometry(curve.getPoints(48), 48), mat);
}

/** Part of a sphere shell: phi runs round the y axis (+z is π/2), theta down from the top. */
function shell(
  r: number,
  mat: THREE.Material,
  [phiStart, phiLen]: [number, number],
  [thetaStart, thetaLen]: [number, number],
) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 48, 32, phiStart, phiLen, thetaStart, thetaLen),
    mat,
  );
}

// ─── The head and where things sit on it ─────────────────────────────────────

const HEAD_Y = 1.5;
const HEAD_R = 0.6;

/** A point on (or just off) the head: lat up from the eyeline, lon round from the nose. */
function onHead(lat: number, lon: number, lift = 0) {
  const dir = new THREE.Vector3(
    Math.sin(lon) * Math.cos(lat),
    Math.sin(lat),
    Math.cos(lon) * Math.cos(lat),
  );
  const at = dir.clone().multiplyScalar(HEAD_R + lift).add(new THREE.Vector3(0, HEAD_Y, 0));
  return { at, dir };
}

/** Sit a mesh on the head, facing outward. */
function stick(mesh: THREE.Object3D, lat: number, lon: number, lift = 0) {
  const { at, dir } = onHead(lat, lon, lift);
  mesh.position.copy(at);
  mesh.lookAt(at.clone().add(dir));
  return mesh;
}

function face(g: THREE.Group, skin: THREE.Material, skinHex: string) {
  const eye = clay("#1f1a18", { gloss: true });
  const eyes: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const e = stick(ball(0.058, eye, [0, 0, 0], [1, 1.25, 0.55]), -0.02, s * 0.3, -0.01);
    e.name = "eye";
    eyes.push(e as THREE.Mesh);
    g.add(e);
    const blush = new THREE.Color(skinHex).lerp(new THREE.Color("#f08e86"), 0.45);
    g.add(stick(ball(0.095, clay(`#${blush.getHexString()}`), [0, 0, 0], [1, 0.62, 0.25]), -0.2, s * 0.52, -0.005));
    g.add(stick(ball(0.1, skin, [0, 0, 0], [0.6, 1, 0.45]), 0.02, s * 1.55, -0.02)); // ears
  }
  g.add(stick(ball(0.05, skin, [0, 0, 0], [1, 0.8, 0.7]), -0.13, 0, 0.0)); // nose

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.014, 10, 24, Math.PI),
    clay("#5a2f27"),
  );
  smile.rotation.z = Math.PI; // the lower half: a smile
  const mouth = stick(new THREE.Group(), -0.28, 0, 0.0);
  mouth.add(smile);
  g.add(mouth);
}

function hair(g: THREE.Group, look: Look) {
  const mat = clay(HAIR_COLOR[look.hairColor], {
    side: THREE.DoubleSide,
  });
  const cap = (r: number, theta: number, tilt: number) => {
    const m = shell(r, mat, [0, Math.PI * 2], [0, theta]);
    m.position.y = HEAD_Y;
    m.rotation.x = -tilt; // back of the head lower than the hairline
    g.add(m);
  };
  const fringe = (n: number, lat: number, spread: number, r: number) => {
    for (let i = 0; i < n; i++) {
      const lon = -spread + (2 * spread * i) / (n - 1);
      g.add(stick(ball(r, mat, [0, 0, 0], [1.15, 0.8, 0.55]), lat - Math.abs(lon) * 0.12, lon, 0.02));
    }
  };
  // Side and back fall: a shell open at the face, down to `to` (radians from the top).
  const fall = (to: number, open = 1.9) => {
    const m = shell(0.665, mat, [Math.PI / 2 + open / 2, Math.PI * 2 - open], [0.2 * Math.PI, to]);
    m.position.y = HEAD_Y;
    g.add(m);
  };

  switch (look.hair) {
    case "short":
      cap(0.64, 0.5 * Math.PI, 0.32);
      fringe(5, 0.5, 0.65, 0.13);
      break;
    case "buzz":
      cap(0.618, 0.46 * Math.PI, 0.38);
      break;
    case "bob":
      cap(0.655, 0.45 * Math.PI, 0.15);
      fall(0.48 * Math.PI);
      fringe(6, 0.4, 0.62, 0.12);
      break;
    case "long":
      cap(0.655, 0.45 * Math.PI, 0.15);
      fall(0.6 * Math.PI, 1.75);
      g.add(ball(0.45, mat, [0, 1.02, -0.3], [1.12, 1.35, 0.5]));
      fringe(6, 0.42, 0.6, 0.12);
      break;
    case "bun": {
      cap(0.64, 0.5 * Math.PI, 0.3);
      const { at } = onHead(1.15, Math.PI, 0.1);
      g.add(ball(0.21, mat, [at.x, at.y, at.z]));
      fringe(3, 0.62, 0.35, 0.11);
      break;
    }
    case "curly": {
      // Fibonacci-spread curls over the crown, clear of the face.
      const n = 120;
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 1.25;
        const rr = Math.sqrt(Math.max(0, 1 - y * y));
        const a = i * 2.39996;
        const p = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
        if (p.y < -0.25) continue;
        if (p.z > 0.25 && p.y < 0.45 && Math.abs(p.x) < 0.75) continue;
        g.add(ball(0.13 + (i % 3) * 0.015, mat, [p.x * 0.62, HEAD_Y + p.y * 0.62, p.z * 0.62]));
      }
      break;
    }
  }
}

function glasses(g: THREE.Group, kind: Look["glasses"]) {
  if (kind === "none") return;
  const frame = clay("#2c2826", { gloss: true });
  const lens = clay("#1b1d22", { gloss: true });
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(
      kind === "square"
        ? new THREE.TorusGeometry(0.135, 0.02, 10, 4)
        : new THREE.TorusGeometry(0.125, 0.02, 10, 32),
      frame,
    );
    if (kind === "square") ring.rotation.z = Math.PI / 4;
    const holder = stick(new THREE.Group(), -0.02, s * 0.31, 0.07);
    holder.add(ring);
    if (kind === "sunnies") {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), lens);
      holder.add(disc);
    }
    g.add(holder);
    const { at } = onHead(-0.02, s * 0.53, 0.06);
    const { at: ear } = onHead(0.0, s * 1.45, 0.02);
    g.add(rod([at.x, at.y, at.z], [ear.x, ear.y, ear.z], 0.014, frame));
  }
  const l = onHead(0.0, -0.1, 0.075).at;
  const r = onHead(0.0, 0.1, 0.075).at;
  g.add(rod([l.x, l.y, l.z], [r.x, r.y, r.z], 0.016, frame));
}

// ─── Body ─────────────────────────────────────────────────────────────────────

function body(g: THREE.Group, look: Look, skin: THREE.Material) {
  const top = clay(TOP_COLOR[look.topColor]);
  const trim = clay(new THREE.Color(TOP_COLOR[look.topColor]).multiplyScalar(0.86).getStyle());
  const pants = clay("#4c505c");
  const shoe = clay("#f3efe8");
  const dress = look.top === "dress";

  // Legs and shoes
  for (const s of [-1, 1]) {
    g.add(capsule(0.105, 0.2, dress ? skin : pants, [s * 0.15, 0.27, 0]));
    g.add(ball(0.13, shoe, [s * 0.15, 0.08, 0.05], [1, 0.62, 1.35]));
  }

  // Torso: a soft bell; a dress flares down over the legs.
  const torso = lathe(
    dress
      ? [[0.01, 0.22], [0.5, 0.24], [0.44, 0.45], [0.38, 0.7], [0.34, 0.88], [0.22, 0.98], [0.01, 1.0]]
      : [[0.01, 0.38], [0.37, 0.4], [0.42, 0.55], [0.4, 0.74], [0.35, 0.89], [0.22, 0.98], [0.01, 1.0]],
    top,
  );
  g.add(torso);

  // Arms: pivot at the shoulder. The right one lifts to hold an item.
  const holding = look.item !== "none";
  const sleeveShort = look.top === "tee" || dress;
  let hand = new THREE.Vector3();
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.31, 0.9, 0);
    const lift = holding && s === 1;
    pivot.rotation.set(lift ? -0.95 : 0, 0, lift ? 0.18 : s * 0.32);
    pivot.add(capsule(0.09, 0.26, sleeveShort ? skin : top, [0, -0.2, 0]));
    if (sleeveShort) pivot.add(capsule(0.105, 0.07, top, [0, -0.07, 0]));
    pivot.add(ball(0.1, skin, [0, -0.4, 0]));
    g.add(pivot);
    if (lift) {
      pivot.updateMatrixWorld(true);
      hand = new THREE.Vector3(0, -0.4, 0).applyMatrix4(pivot.matrix);
    }
  }

  // Details by style
  if (look.top === "hoodie") {
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.1, 16, 40), top);
    hood.position.set(0, 0.99, -0.06);
    hood.rotation.x = Math.PI / 2 - 0.35;
    g.add(hood);
    const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.16, 0.06, 4, 0.03), trim);
    pocket.position.set(0, 0.58, 0.39);
    pocket.rotation.x = -0.12;
    g.add(pocket);
    for (const s of [-1, 1]) g.add(capsule(0.016, 0.12, clay("#f3efe8"), [s * 0.08, 0.86, 0.33]));
  } else if (look.top === "shirt") {
    for (const s of [-1, 1]) {
      const flap = ball(0.1, clay("#f7f3ec"), [s * 0.09, 0.95, 0.2], [1.1, 0.45, 0.6]);
      flap.rotation.set(-0.5, 0, s * -0.6);
      g.add(flap);
    }
    for (const y of [0.82, 0.68, 0.54]) {
      const z = y > 0.75 ? 0.36 : 0.415;
      g.add(ball(0.025, trim, [0, y, z]));
    }
  } else {
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 10, 32), trim);
    neck.position.set(0, 0.975, 0.02);
    neck.rotation.x = Math.PI / 2 - 0.15;
    g.add(neck);
  }

  return hand;
}

function item(g: THREE.Group, kind: Look["item"], hand: THREE.Vector3) {
  if (kind === "none") return;
  const it = new THREE.Group();
  if (kind === "coffee") {
    it.add(lathe([[0.01, -0.09], [0.08, -0.09], [0.1, 0.09], [0.01, 0.095]], clay("#f3ece0")));
    const sleeve = lathe([[0.091, -0.035], [0.1, 0.035]], clay("#c97b5d"));
    it.add(sleeve);
    it.add(ball(0.1, clay("#3d3431"), [0, 0.1, 0], [1.05, 0.28, 1.05]));
  } else if (kind === "plant") {
    it.add(lathe([[0.01, -0.1], [0.09, -0.1], [0.12, 0.05], [0.13, 0.06], [0.01, 0.06]], clay("#c97b5d")));
    const leaf = clay("#7ea36a");
    for (const [x, rz] of [[-0.06, 0.55], [0, 0], [0.06, -0.55]] as const) {
      const l = ball(0.075, leaf, [x, 0.19, 0], [0.75, 1.6, 0.4]);
      l.rotation.z = rz;
      it.add(l);
    }
  } else if (kind === "camera") {
    it.add(new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.19, 0.13, 4, 0.04), clay("#3a3735")));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.08, 28), clay("#24211f"));
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.09;
    it.add(lens);
    it.add(ball(0.045, clay("#4b5d70", { gloss: true }), [0, 0, 0.12], [1, 1, 0.3]));
    it.add(ball(0.025, clay("#e8e2d8"), [0.1, 0.1, 0]));
  } else if (kind === "book") {
    const cover = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.3, 0.07, 3, 0.02), clay("#cf735c"));
    it.add(cover);
    const pages = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.28, 0.05, 2, 0.01), clay("#f6f0e4"));
    pages.position.x = 0.015;
    it.add(pages);
    it.rotation.y = -0.4;
  }
  it.position.copy(hand).add(new THREE.Vector3(-0.02, 0.06, 0.1));
  g.add(it);
}

/** The whole figure, standing on y = 0, about 2.1 tall. */
export function buildFigure(look: Look) {
  const g = new THREE.Group();
  const skinHex = SKIN[look.skin];
  const skin = clay(skinHex);
  const hand = body(g, look, skin);
  g.add(ball(HEAD_R, skin, [0, HEAD_Y, 0]));
  face(g, skin, skinHex);
  hair(g, look);
  glasses(g, look.glasses);
  item(g, look.item, hand);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function disposeFigure(g: THREE.Object3D) {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose(); // materials are shared and cached
  });
}

// ─── Studio ──────────────────────────────────────────────────────────────────

function studio(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight("#fffaf2", "#d8cfc2", 1.1));
  const key = new THREE.DirectionalLight("#fff3e3", 2.1);
  key.position.set(2.2, 4.2, 3.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -1.6;
  key.shadow.camera.right = key.shadow.camera.top = 1.6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#eef2ff", 0.5);
  fill.position.set(-3, 1.5, 2);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.ShadowMaterial({ opacity: 0.16 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return scene;
}

function makeRenderer(canvas?: HTMLCanvasElement, preserve = false) {
  const r = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: preserve,
  });
  r.setClearColor(0x000000, 0);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

const sameLook = (a: Look, b: Look) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A live figure in `host`: sways and blinks on its own, turns when dragged,
 * pops a little when the look changes. Still under reduced motion.
 */
export function mountStage(host: HTMLElement, first: Look) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = makeRenderer();
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  const canvas = renderer.domElement;
  canvas.style.cssText = "width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab";
  host.appendChild(canvas);

  const scene = studio(renderer);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 1.25, 5.6);
  camera.lookAt(0, 1.02, 0);

  const turntable = new THREE.Group();
  scene.add(turntable);
  let look = first;
  let figure = buildFigure(look);
  turntable.add(figure);

  const fit = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  fit();

  // Drag to turn; let go and it drifts back to its idle sway.
  let dragging = false;
  let lastX = 0;
  let spin = 0;
  const down = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    spin += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  };
  const up = () => {
    dragging = false;
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  let pop = 0;
  let nextBlink = 2;
  let frame = 0;
  const clock = new THREE.Clock();
  const tick = () => {
    frame = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    if (!dragging) spin *= 0.92;
    const sway = still ? 0 : Math.sin(t * 0.7) * 0.22;
    turntable.rotation.y = sway + spin;
    turntable.position.y = still ? 0 : Math.abs(Math.sin(t * 1.6)) * 0.025;
    pop = Math.max(0, pop - 0.06);
    const s = 1 + Math.sin(pop * Math.PI) * 0.05;
    turntable.scale.set(s, s, s);
    if (!still) {
      const blinking = t > nextBlink && t < nextBlink + 0.12;
      if (t > nextBlink + 0.12) nextBlink = t + 2.5 + Math.random() * 3;
      figure.traverse((o) => {
        if (o.name === "eye") o.scale.y = blinking ? 0.15 : 1.25;
      });
    }
    renderer.render(scene, camera);
  };
  tick();

  return {
    setLook(next: Look) {
      if (sameLook(next, look)) return;
      look = next;
      turntable.remove(figure);
      disposeFigure(figure);
      figure = buildFigure(look);
      turntable.add(figure);
      pop = still ? 0 : 1;
    },
    dispose() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      disposeFigure(figure);
      renderer.dispose();
      canvas.remove();
    },
  };
}

// ─── Thumbnails for the option tiles ─────────────────────────────────────────

let thumbRenderer: THREE.WebGLRenderer | null = null;
let thumbScene: THREE.Scene | null = null;

export type Framing = "head" | "body";

/** Render each look to a small transparent PNG, sharing one offscreen renderer. */
export function renderThumbs(looks: Look[], framing: Framing, px = 168): string[] {
  if (!thumbRenderer) {
    thumbRenderer = makeRenderer(undefined, true);
    thumbScene = studio(thumbRenderer);
  }
  const r = thumbRenderer;
  const scene = thumbScene!;
  r.setPixelRatio(1);
  r.setSize(px, px, false);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  if (framing === "head") {
    cam.position.set(0.9, 1.65, 3.4);
    cam.lookAt(0, 1.42, 0);
  } else {
    cam.position.set(0.7, 1.3, 4.8);
    cam.lookAt(0, 1.08, 0);
  }
  return looks.map((look) => {
    const fig = buildFigure(look);
    scene.add(fig);
    r.render(scene, cam);
    const url = r.domElement.toDataURL("image/png");
    scene.remove(fig);
    disposeFigure(fig);
    return url;
  });
}
