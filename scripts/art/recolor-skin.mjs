// Usage: node scripts/art/recolor-skin.mjs <light portrait.webp> <out.webp> <medium|deep> [lx ly rx ry]
// (the eyes, if given, let it take every skin-coloured pixel of the head —
// ears and the forehead under a fringe — which the smoothness test can miss)
// Makes another skin tone from one drawing, so the pose never changes: finds
// the skin by its warm, mid-saturated colour and re-tints it, keeping the
// clay's shading (each pixel's brightness relative to the lit skin tone).
import sharp from "sharp";
const [src, out, tone, ...rest] = process.argv.slice(2);
const debug = rest.includes("--mask"); // write the skin selection in red instead
const eyeArgs = rest.filter((a) => a !== "--mask");
const eyes = eyeArgs.length === 4 ? eyeArgs.map(Number) : null;
const LIT = [237, 194, 158]; // lit light skin, e.g. a forehead
const TONES = { medium: [214, 150, 104], deep: [150, 92, 60] };
const T = TONES[tone];
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
const Lref = lum(...LIT);
// Skin by hysteresis: start from pixels that are surely skin, then grow into
// neighbours that could be (shadows, highlights, blush) — but not across into
// hair (too dark) or the cream knit (too yellow, too grey).
const hsv = (i) => {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0;
  if (max !== min) hue = max === r ? (60 * (g - b)) / (max - min) : max === g ? 120 + (60 * (b - r)) / (max - min) : 240 + (60 * (r - g)) / (max - min);
  if (hue < 0) hue += 360;
  return [hue, max ? (max - min) / max : 0, max / 255];
};
// Clay skin is smooth; a knit is bumpy. Local brightness spread over 7×7.
const L = new Float32Array(w * h);
for (let p = 0; p < w * h; p++) L[p] = lum(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]);
const rough = new Float32Array(w * h);
for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
  let s = 0, s2 = 0;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const v = L[(y + dy) * w + x + dx]; s += v; s2 += v * v; }
  rough[y * w + x] = Math.sqrt(Math.max(0, s2 / 49 - (s / 49) ** 2));
}
const sure = (i) => { const [hh, ss, vv] = hsv(i); return hh > 16 && hh < 34 && ss > 0.24 && ss < 0.5 && vv > 0.6 && rough[i / 3] < 4.5; };
const maybe = (i) => { const [hh, ss, vv] = hsv(i); return (hh < 33 || hh > 340) && ss > 0.11 && ss < 0.72 && vv > 0.47 && rough[i / 3] < 14; };
// Growth stays close to sure skin (REACH px) and doesn't cross edges, so it
// can't creep along a sweater's shadows.
const REACH = 16, EDGE = 22;
const m = new Float32Array(w * h);
const dist = new Int16Array(w * h).fill(-1);
let frontier = [];
// Seeds: sure-skin patches big enough to be a face, ear or hand — a stray
// smooth fleck on a sweater is too small to count.
const isSure = new Uint8Array(w * h);
for (let p = 0; p < w * h; p++) if (sure(p * 3)) isSure[p] = 1;
const done = new Uint8Array(w * h);
for (let p0 = 0; p0 < w * h; p0++) {
  if (!isSure[p0] || done[p0]) continue;
  const blob = [], st = [p0];
  done[p0] = 1;
  while (st.length) {
    const p = st.pop(); blob.push(p);
    const x = p % w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w])
      if (q >= 0 && q < w * h && isSure[q] && !done[q]) { done[q] = 1; st.push(q); }
  }
  if (blob.length >= 350) for (const p of blob) { m[p] = 1; dist[p] = 0; frontier.push(p); }
}
const diff = (a, b) => Math.abs(data[a * 3] - data[b * 3]) + Math.abs(data[a * 3 + 1] - data[b * 3 + 1]) + Math.abs(data[a * 3 + 2] - data[b * 3 + 2]);
for (let step = 1; step <= REACH && frontier.length; step++) {
  const next = [];
  for (const p of frontier) {
    const x = p % w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
      if (q < 0 || q >= w * h || dist[q] !== -1) continue;
      if (maybe(q * 3) && diff(p, q) < EDGE) { m[q] = 1; dist[q] = step; next.push(q); }
    }
  }
  frontier = next;
}
// The head itself: inside a disc around the face there's no knit to confuse
// with skin, so every skin-coloured pixel there counts.
if (eyes) {
  const [lx, ly, rx, ry] = eyes;
  const d = Math.hypot(rx - lx, ry - ly), cx = (lx + rx) / 2, cy = (ly + ry) / 2 + 0.2 * d, R = 1.55 * d;
  const chin = (ly + ry) / 2 + 0.95 * d, collar = (ly + ry) / 2 + 1.2 * d;
  for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(h, collar); y++)
    for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(w, cx + R); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
      // below the chin, just the neck: narrow, and smooth (not the knit collar)
      if (y > chin) continue; // the neck is traced separately, below
      const [hh, ss, vv] = hsv((y * w + x) * 3);
      // bright enough to be skin, not brown hair; below the chin (the neck)
      // only clearly skin, not the knit collar
      if ((hh < 36 || hh > 340) && ss > 0.12 && ss < 0.72 && vv > 0.6 && L[y * w + x] > 145) m[y * w + x] = 1;
    }
}

// The neck, traced: from the middle of the throat, flood through pixels that
// are skin-coloured (warm, saturated — the knit is pale and grey-ish) and
// smooth, staying between the chin and the collar. Its true outline, so no
// blocky edges and no tinted collar.
const neck = new Uint8Array(w * h);
if (eyes) {
  const [lx, ly, rx, ry] = eyes;
  const d = Math.hypot(rx - lx, ry - ly), cx = (lx + rx) / 2, my = (ly + ry) / 2;
  const top = my + 0.75 * d, bottom = my + 1.45 * d;
  const isNeck = (p) => {
    const [hh, ss, vv] = hsv(p * 3);
    return (hh < 34 || hh > 340) && ss > 0.22 && vv > 0.5 && rough[p] < 7;
  };
  const st = [];
  for (let y = Math.round(my + 1.0 * d); y < my + 1.15 * d; y++) st.push(y * w + Math.round(cx));
  while (st.length) {
    const p = st.pop();
    if (p < 0 || p >= w * h || neck[p] || !isNeck(p)) continue;
    const x = p % w, y = (p / w) | 0;
    if (y < top || y > bottom || Math.abs(x - cx) > 0.65 * d) continue;
    neck[p] = 1;
    st.push(p - 1, p + 1, p - w, p + w);
  }
  for (let p = 0; p < w * h; p++) if (neck[p]) m[p] = 1;
}

// Hands: whole patches of clearly skin-coloured pixels below the face — warm
// and richly coloured on average, which the cream knit and its shadows aren't.
{
  // smooth, warm and bright: a hand (pale fingertips too), never the bumpy knit
  const cand = (p) => { const [hh, ss, vv] = hsv(p * 3); return (hh < 33 || hh > 340) && ss > 0.08 && ss < 0.75 && vv > 0.55 && L[p] > 130 && rough[p] < 6; };
  const mid = eyes ? (eyes[0] + eyes[2]) / 2 : w / 2;
  const dEye = eyes ? Math.hypot(eyes[2] - eyes[0], eyes[3] - eyes[1]) : 64;
  const seen = new Uint8Array(w * h);
  const top = eyes ? (eyes[1] + eyes[3]) / 2 + 0.6 * Math.hypot(eyes[2] - eyes[0], eyes[3] - eyes[1]) : 0;
  for (let p0 = Math.floor(top) * w; p0 < w * h; p0++) {
    if (seen[p0] || !cand(p0)) continue;
    const blob = [], q = [p0];
    seen[p0] = 1;
    let satSum = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    while (q.length) {
      const p = q.pop(); blob.push(p); satSum += hsv(p * 3)[1];
      const bx = p % w, by = (p / w) | 0;
      x0 = Math.min(x0, bx); x1 = Math.max(x1, bx); y0 = Math.min(y0, by); y1 = Math.max(y1, by);
      const x = p % w;
      for (const n of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w])
        if (n >= top * w && n < w * h && !seen[n] && cand(n)) { seen[n] = 1; q.push(n); }
    }
    const handSized = x1 - x0 < 1.5 * dEye && y1 - y0 < 1.7 * dEye;
    // hands are out to the sides — never the collar under the chin
    const aside = Math.abs((x0 + x1) / 2 - mid) > 0.7 * dEye;
    if (handSized && aside && blob.length >= 60 && satSum / blob.length > 0.3) {
      for (const p of blob) m[p] = 1;
      // the pale highlight on a fingertip is still hand — looking only toward
      // the fingertips (up for the wave, down for the hand at the side), never
      // toward the cuff
      const waving = eyes && (y0 + y1) / 2 < (eyes[1] + eyes[3]) / 2 + 1.6 * dEye;
      const ya = waving ? y0 - 6 : y0, yb = waving ? y1 : y1 + 6;
      for (let y = Math.max(0, ya); y <= Math.min(h - 1, yb); y++)
        for (let x = Math.max(0, x0 - 6); x <= Math.min(w - 1, x1 + 6); x++) {
          const q = y * w + x;
          const [hh, ss] = hsv(q * 3);
          const off = Math.abs(data[q * 3] - 0xec) + Math.abs(data[q * 3 + 1] - 0xeb) + Math.abs(data[q * 3 + 2] - 0xe6);
          if (!m[q] && hh < 45 && ss > 0.04 && off > 18 && rough[q] < 9) m[q] = 1;
        }
    }
  }
}

// A last veto below the face: the knit's warm shadows (hue 32+, softer
// colour) are never skin; skin is either richly coloured, or warm-hued.
if (eyes) {
  const [lx, ly, rx, ry] = eyes;
  const d = Math.hypot(rx - lx, ry - ly), cx = (lx + rx) / 2, cy = (ly + ry) / 2 + 0.2 * d, R = 1.55 * d;
  const chinLine = (ly + ry) / 2 + 0.95 * d;
  for (let p = 0; p < w * h; p++) {
    if (!m[p]) continue;
    const x = p % w, y = (p / w) | 0;
    if ((x - cx) ** 2 + (y - cy) ** 2 <= R * R && y < chinLine) continue; // the face: already careful
    if (neck[p]) continue;
    const [hh, ss] = hsv(p * 3);
    const warm = hh < 30 || hh > 340;
    if (!(ss > 0.33 || (warm && ss > 0.15))) m[p] = 0;
  }
}

// Fill holes inside the skin (around eyes and mouth, where it's too detailed to
// pass as smooth) — leaving very dark bits (eyes, mouth) and glints alone —
// then creep 6px onto the edges so no light rim is left.
const outside = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
while (stack.length) {
  const p = stack.pop();
  if (p < 0 || p >= w * h || outside[p] || m[p]) continue;
  outside[p] = 1;
  const x = p % w;
  if (x > 0) stack.push(p - 1);
  if (x < w - 1) stack.push(p + 1);
  stack.push(p - w, p + w);
}
for (let p = 0; p < w * h; p++) if (!outside[p] && !m[p]) { const [, , vv] = hsv(p * 3); if (vv >= 0.45 && vv <= 0.97) m[p] = 1; }
for (let pass = 0; pass < 6; pass++) {
  const grow = [];
  for (let p = w; p < w * h - w; p++) {
    if (m[p]) continue;
    const x = p % w;
    if (x === 0 || x === w - 1) continue;
    if (!(m[p - 1] || m[p + 1] || m[p - w] || m[p + w])) continue;
    const [hh, ss, vv] = hsv(p * 3);
    // edges of brows and hairline too (warm, not too dark); the shading keeps them dark
    if (vv > 0.3 && (ss < 0.15 ? ss > 0.06 : hh < 45 || hh > 340)) grow.push(p);
  }
  for (const p of grow) m[p] = 1;
}

// soften the mask edge a touch
const soft = new Float32Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  let s = 0, n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) { s += m[yy * w + xx]; n++; } }
  soft[y * w + x] = Math.max(m[y * w + x], s / n);
}
const o = Buffer.alloc(w * h * 3);
// An edge pixel is part skin, part background: separate the two, tint only
// the skin part, and mix them back — or the edge glows as bright skin.
const BG = [0xec, 0xeb, 0xe6];
const span = Math.hypot(LIT[0] - BG[0], LIT[1] - BG[1], LIT[2] - BG[2]);
for (let i = 0, p = 0; p < w * h; i += 3, p++) {
  const px = [data[i], data[i + 1], data[i + 2]];
  const k = soft[p];
  if (!k) { o[i] = px[0]; o[i + 1] = px[1]; o[i + 2] = px[2]; continue; }
  // only the true outline (touching the backdrop) is part backdrop; inside,
  // even a pale highlight is skin
  const nearBg = [-2, -1, 1, 2].some((k) =>
    [p + k, p + k * w].some(
      (q) => q >= 0 && q < w * h && Math.abs(data[q * 3] - BG[0]) + Math.abs(data[q * 3 + 1] - BG[1]) + Math.abs(data[q * 3 + 2] - BG[2]) < 14,
    ),
  );
  const a = nearBg ? Math.min(1, Math.hypot(px[0] - BG[0], px[1] - BG[1], px[2] - BG[2]) / span) : 1;
  const skinPart = a > 0.05 ? px.map((v, c) => BG[c] + (v - BG[c]) / a) : px;
  const shade = Math.min(1.25, lum(...skinPart) / Lref);
  for (let c = 0; c < 3; c++) {
    const tinted = BG[c] * (1 - a) + Math.min(255, T[c] * shade) * a;
    o[i + c] = Math.round(px[c] * (1 - k) + tinted * k);
  }
}
if (debug) for (let p = 0; p < w * h; p++) if (soft[p] > 0.5) { o[p * 3] = 230; o[p * 3 + 1] = 30; o[p * 3 + 2] = 30; }
await sharp(o, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 82 }).toFile(out);
console.log(out);
