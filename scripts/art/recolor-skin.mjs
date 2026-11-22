// Usage: node scripts/art/recolor-skin.mjs <light portrait.webp> <out.webp> <medium|deep>
// Makes another skin tone from one drawing, so the pose never changes: finds
// the skin by its warm, mid-saturated colour and re-tints it, keeping the
// clay's shading (each pixel's brightness relative to the lit skin tone).
import sharp from "sharp";
const [src, out, tone] = process.argv.slice(2);
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
for (let i = 0, p = 0; p < w * h; i += 3, p++) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  const k = soft[p];
  const shade = lum(r, g, b) / Lref;
  for (let c = 0; c < 3; c++) {
    const tinted = Math.min(255, T[c] * shade);
    o[i + c] = Math.round(data[i + c] * (1 - k) + tinted * k);
  }
}
await sharp(o, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 82 }).toFile(out);
console.log(out);
