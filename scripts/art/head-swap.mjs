// Usage: node scripts/art/head-swap.mjs <body.webp> <head.webp> <out.webp> <eyes.json id of body>
// Puts the head (and hair) of one lined-up portrait onto the body of another,
// so every hair style wears exactly the same body, outfit and wave. Both must
// already be lined up by scripts/art/line-up-cast.mjs (same eye line, same feet).
//
//   above the neck  → the head drawing (fading over a few px through the neck)
//   the waving hand → the body drawing's (the head drawing's own hand is left out)
//   below the neck  → the body drawing, plus any hair that falls lower
//                     (a ponytail over the shoulder)
import sharp from "sharp";
import { readFileSync } from "fs";
const [bodyFile, headFile, out, eyesFile, bodyId] = process.argv.slice(2);
const eyes = JSON.parse(readFileSync(eyesFile, "utf8"))[bodyId];
const [lx, ly] = eyes.l, [rx, ry] = eyes.r;
const d = Math.hypot(rx - lx, ry - ly), mx = (lx + rx) / 2, my = (ly + ry) / 2;
const NECK = Math.round(my + 0.98 * d); // through the neck, between chin and collar
const BAND = 6;

const load = async (f) => (await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
const B = await load(bodyFile), H = await load(headFile);
const { width: w, height: h } = B.info;
const bg = [0xec, 0xeb, 0xe6];
const isBg = (buf, i) => Math.abs(buf[i] - bg[0]) + Math.abs(buf[i + 1] - bg[1]) + Math.abs(buf[i + 2] - bg[2]) < 28;
const lum = (buf, i) => 0.3 * buf[i] + 0.59 * buf[i + 1] + 0.11 * buf[i + 2];
// hair: very dark, or dark and richly coloured — not a cream knit's crease
const hair = (buf, i) => {
  const max = Math.max(buf[i], buf[i + 1], buf[i + 2]), min = Math.min(buf[i], buf[i + 1], buf[i + 2]);
  const l = lum(buf, i);
  return l < 80 || (l < 125 && max > 0 && (max - min) / max > 0.38);
};

// Skin that isn't joined to the face is a hand. Each drawing's waving hand is
// found that way: the body's is kept, the head drawing's is ignored.
const skin = (buf, i) => {
  const [r, g, b] = [buf[i], buf[i + 1], buf[i + 2]];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return false;
  let hue = max === r ? (60 * (g - b)) / (max - min) : max === g ? 120 + (60 * (b - r)) / (max - min) : 240 + (60 * (r - g)) / (max - min);
  if (hue < 0) hue += 360;
  const sat = (max - min) / max;
  return (hue < 38 || hue > 340) && sat > 0.14 && sat < 0.62 && max > 120;
};
function hands(buf) {
  const face = new Uint8Array(w * h);
  const start = Math.round(my + 0.3 * d) * w + Math.round(mx);
  const st = [start];
  while (st.length) {
    const p = st.pop();
    if (p < 0 || p >= w * h || face[p] || !skin(buf, p * 3)) continue;
    face[p] = 1;
    const x = p % w;
    if (x > 0) st.push(p - 1);
    if (x < w - 1) st.push(p + 1);
    st.push(p - w, p + w);
  }
  // loose skin to the left: a hand reaches down past the neck; an ear doesn't
  const loose = new Uint8Array(w * h);
  for (let y = 0; y < NECK + 90; y++) for (let x = 0; x < mx - 0.6 * d; x++) {
    const p = y * w + x;
    if (!face[p] && skin(buf, p * 3)) loose[p] = 1;
  }
  const hand = new Uint8Array(w * h), seen = new Uint8Array(w * h);
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!loose[p0] || seen[p0]) continue;
    const blob = [], q = [p0];
    seen[p0] = 1;
    let maxY = 0;
    while (q.length) {
      const p = q.pop(); blob.push(p); maxY = Math.max(maxY, (p / w) | 0);
      const x = p % w;
      for (const n of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w])
        if (n >= 0 && n < w * h && loose[n] && !seen[n]) { seen[n] = 1; q.push(n); }
    }
    if (blob.length > 200 && maxY > NECK - 5) for (const p of blob) hand[p] = 1;
  }
  // grow 2px to take in the outline of the hand
  for (let pass = 0; pass < 2; pass++) {
    const more = [];
    for (let p = w; p < w * h - w; p++) if (!hand[p] && (hand[p - 1] || hand[p + 1] || hand[p - w] || hand[p + w]) && !isBg(buf, p * 3) && !face[p]) more.push(p);
    for (const p of more) hand[p] = 1;
  }
  return hand;
}
const bodyHand = hands(B.data), headHand = hands(H.data);

// Hair below the neck counts only if it hangs from the hair above it (a
// ponytail, long curls) — not a dark crease in the head drawing's sweater.
const fall = new Uint8Array(w * h);
const st = [];
for (let x = 0; x < w; x++) { const p = (NECK - BAND) * w + x; if (hair(H.data, p * 3)) st.push(p); }
while (st.length) {
  const p = st.pop();
  if (p < 0 || p >= w * h || fall[p] || !hair(H.data, p * 3)) continue;
  const y = (p / w) | 0, x = p % w;
  if (y < NECK - BAND || y > NECK + 260 || Math.abs(x - mx) < 0.45 * d) continue;
  fall[p] = 1;
  if (x > 0) st.push(p - 1);
  if (x < w - 1) st.push(p + 1);
  st.push(p - w, p + w);
}

const o = Buffer.alloc(w * h * 3);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const p = y * w + x, i = p * 3;
  let t; // how much of the head drawing to show (0–1)
  if (bodyHand[p] || headHand[p]) t = 0;
  else if (y < NECK - BAND) t = 1;
  else if (y < NECK + BAND) t = (NECK + BAND - y) / (2 * BAND);
  else t = 0;
  // hair that falls below the neck (ponytails, long curls) still comes along
  if (t < 1 && !bodyHand[p] && fall[p]) t = 1;
  for (let c = 0; c < 3; c++) o[i + c] = Math.round(B.data[i + c] * (1 - t) + H.data[i + c] * t);
}
await sharp(o, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 82 }).toFile(out);
console.log(out);
