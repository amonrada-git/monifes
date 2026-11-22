// Usage: node scripts/art/head-swap.mjs <body.webp> <head.webp> <out.webp> <eyes.json> <body id> <head id>
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
const [bodyFile, headFile, out, eyesFile, bodyId, headId] = process.argv.slice(2);
const all = JSON.parse(readFileSync(eyesFile, "utf8"));
if (bodyId === headId) {
  // the body's own hair: nothing to swap
  await sharp(bodyFile).toFile(out);
  const e = all[bodyId];
  console.log(JSON.stringify({ [out]: e }));
  process.exit(0);
}
const geo = ({ l: [lx, ly], r: [rx, ry] }) => ({
  d: Math.hypot(rx - lx, ry - ly), mx: (lx + rx) / 2, my: (ly + ry) / 2, ang: Math.atan2(ry - ly, rx - lx),
});
const body = geo(all[bodyId]), head = geo(all[headId]);
const { d, mx, my } = body;
const NECK = Math.round(my + 0.98 * d); // through the neck, between chin and collar
const BAND = 6;

const load = async (f) => (await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
const B = await load(bodyFile), H0 = await load(headFile);
const { width: w, height: h } = B.info;
const bg = [0xec, 0xeb, 0xe6];

// Tilt the head to match the body's own head, turning it about the eyes —
// a head leaning the other way reads as a different pose.
const turn = body.ang - head.ang;
const H = { data: Buffer.alloc(w * h * 3) };
{
  const cos = Math.cos(-turn), sin = Math.sin(-turn);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // where this pixel came from in the head drawing (bilinear)
    const dx = x - mx, dy = y - my;
    const sx = head.mx + dx * cos - dy * sin, sy = head.my + dx * sin + dy * cos;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    const o = (y * w + x) * 3;
    for (let c = 0; c < 3; c++) {
      const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= w || yy >= h ? bg[c] : H0.data[(yy * w + xx) * 3 + c]);
      H.data[o + c] = Math.round(
        at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy,
      );
    }
  }
}
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
  // bright, too: these are the light-skin drawings, and hair highlights are darker
  return (hue < 38 || hue > 340) && sat > 0.14 && sat < 0.62 && 0.3 * r + 0.59 * g + 0.11 * b > 150;
};
function hands(buf) {
  // The face, roughly: an oval round the eyes. Skin out to the left of it and
  // below the eyes is the waving hand — even where a drawing's fingers touch
  // the cheek or hair.
  // (wide at the ears, narrowing to the chin)
  // The left ear sits just outside it, at eye height: never a hand.
  const face = (x, y) => {
    const cy = my + 0.25 * d;
    const ear = x > mx - 1.32 * d && y > my - 0.3 * d && y < my + 0.45 * d;
    return ear || ((x - mx) / (1.12 * d)) ** 2 + ((y - cy) / ((y < cy ? 1.05 : 0.75) * d)) ** 2 <= 1;
  };
  const hand = new Uint8Array(w * h);
  for (let y = Math.round(my - 0.2 * d); y < NECK + 90; y++)
    for (let x = 0; x < mx; x++) {
      const p = y * w + x;
      if (!face(x, y) && skin(buf, p * 3)) hand[p] = 1;
    }
  // grow to take in the fingertips and the pale outline (3px into anything,
  // a few more into pale pixels — a hand's soft edge against the face)
  for (let pass = 0; pass < 7; pass++) {
    const more = [];
    for (let p = w; p < w * h - w; p++) {
      const x = p % w, y = (p / w) | 0;
      if (hand[p] || x >= mx || face(x, y)) continue;
      if (!(hand[p - 1] || hand[p + 1] || hand[p - w] || hand[p + w]) || isBg(buf, p * 3)) continue;
      if (pass < 3 || lum(buf, p * 3) > 165) more.push(p);
    }
    for (const p of more) hand[p] = 1;
  }
  return hand;
}
// Keep only real hands: big patches. Thin slivers round an ear or jaw that
// fall outside the face oval aren't hands, and putting them back on top would
// draw the body's own ear and jaw line over the new head.
function bigOnly(mask, min) {
  const seen = new Uint8Array(w * h);
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!mask[p0] || seen[p0]) continue;
    const blob = [], st = [p0];
    seen[p0] = 1;
    while (st.length) {
      const p = st.pop(); blob.push(p);
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w])
        if (q >= 0 && q < w * h && mask[q] && !seen[q]) { seen[q] = 1; st.push(q); }
    }
    if (blob.length < min) for (const p of blob) mask[p] = 0;
  }
  return mask;
}
const bodyHand = bigOnly(hands(B.data), 900), headHand = hands(H.data);

// Hair below the neck counts only if it hangs from the hair above it (a
// ponytail, long curls) — not a dark crease in the head drawing's sweater.
// Once inside the hair, its lighter curls and highlights count too (anything
// not background and richly coloured); a stray bit of the head drawing's own
// sweater coming along is harmless, as the sweaters match.
const hairish = (i) => {
  if (isBg(H.data, i)) return false;
  const max = Math.max(H.data[i], H.data[i + 1], H.data[i + 2]), min = Math.min(H.data[i], H.data[i + 1], H.data[i + 2]);
  const l = lum(H.data, i);
  return l < 120 || (l < 185 && max > 0 && (max - min) / max > 0.3);
};
const fall = new Uint8Array(w * h);
const st = [];
for (let x = 0; x < w; x++) { const p = (NECK - BAND) * w + x; if (hair(H.data, p * 3)) st.push(p); }
while (st.length) {
  const p = st.pop();
  if (p < 0 || p >= w * h || fall[p] || !hairish(p * 3)) continue;
  const y = (p / w) | 0, x = p % w;
  if (y < NECK - BAND || y > NECK + 260 || Math.abs(x - mx) < 0.3 * d) continue;
  if (x < mx - 0.9 * d && y > NECK + BAND) continue; // the waving arm's side: the body's own sleeve
  fall[p] = 1;
  if (x > 0) st.push(p - 1);
  if (x < w - 1) st.push(p + 1);
  st.push(p - w, p + w);
}
// close small gaps (glints between curls) and take in the soft outer edge
for (let pass = 0; pass < 2; pass++) {
  const add = [];
  for (let y = NECK - BAND; y < Math.min(h - 1, NECK + 262); y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    if (fall[p] || Math.abs(x - mx) < 0.3 * d || (x < mx - 0.9 * d && y > NECK + BAND)) continue;
    let n = 0;
    for (const q of [p - 1, p + 1, p - w, p + w, p - w - 1, p - w + 1, p + w - 1, p + w + 1]) n += fall[q];
    if (n >= (pass === 0 ? 3 : 5) && !isBg(H.data, p * 3)) add.push(p);
  }
  for (const p of add) fall[p] = 1;
}

const o = Buffer.alloc(w * h * 3);
// Where the head drawing's own hand covered its hair, ear or cheek, removing
// the hand leaves a hole; fill it from what's around it (a soft diffusion),
// so the head reads as whole behind the body's hand.
{
  const hole = [];
  const known = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const y = (p / w) | 0;
    if (!headHand[p] || bodyHand[p] || y >= NECK) continue;
    // only where head is around it: hair or skin within 14px in at least
    // three of eight directions (so a hand beside the head, not on it, stays open)
    const x = p % w;
    let around = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let k = 1; k <= 14; k++) {
        const xx = x + dx * k, yy = y + dy * k;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) break;
        const q = yy * w + xx;
        if (!headHand[q] && (hair(H.data, q * 3) || skin(H.data, q * 3))) { around++; break; }
      }
    }
    if (around >= 3) hole.push(p);
  }
  const inHole = new Uint8Array(w * h);
  for (const p of hole) inHole[p] = 1;
  for (let p = 0; p < w * h; p++) known[p] = inHole[p] ? 0 : 1;
  for (let it = 0; it < 40; it++) {
    for (const p of hole) {
      let n = 0, sum = [0, 0, 0];
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= w * h || !known[q]) continue;
        n++;
        for (let c = 0; c < 3; c++) sum[c] += H.data[q * 3 + c];
      }
      if (n) { for (let c = 0; c < 3; c++) H.data[p * 3 + c] = Math.round(sum[c] / n); known[p] = 1; }
    }
  }
  for (const p of hole) headHand[p] = 0; // now head: show it
}

// Compose in three layers:
//   1. the body drawing with its own head wiped to background (so no second
//      jaw or ear can peek out behind a slightly smaller head),
//   2. the head drawing's head — everything not background above the neck,
//      minus its own hand, plus hair that falls lower — with soft edges,
//   3. the body's waving hand back on top (hair sits behind the hand).
const span = 45; // how far from background a pixel must be to count as fully drawn
const solid = (buf, i) =>
  Math.min(1, (Math.abs(buf[i] - bg[0]) + Math.abs(buf[i + 1] - bg[1]) + Math.abs(buf[i + 2] - bg[2])) / span);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const p = y * w + x, i = p * 3;
  // 1. the body, its head gone (above the chin; and from the chin to the
  // neck line, wherever the new head has background — the body's own jaw
  // sits a little lower and would show as a pale strip)
  const underChin = y >= my + 0.9 * d && y < NECK + BAND && solid(H.data, i) < 0.5 && skin(B.data, i) && !bodyHand[p];
  if (underChin && Math.abs(x - mx) < 0.4 * d) {
    // within the neck's width, the new neck is a touch narrower: widen it with
    // its own colour from the nearest neck pixel toward the middle, rather than
    // leave a gap (further out it's the body's jaw: that becomes background)
    const step = x < mx ? 1 : -1;
    let filled = false;
    for (let k = 1; k <= 30; k++) {
      const q = i + step * k * 3;
      if (skin(H.data, q) && solid(H.data, q) > 0.9) {
        for (let c = 0; c < 3; c++) o[i + c] = H.data[q + c];
        filled = true;
        break;
      }
    }
    if (filled) continue;
  }
  const bodyHead = (y < my + 0.9 * d || underChin) && !bodyHand[p];
  const base = bodyHead ? bg : [B.data[i], B.data[i + 1], B.data[i + 2]];
  // 2. the new head over it
  let a = 0;
  if (!headHand[p]) {
    if (y < NECK - BAND) a = solid(H.data, i);
    else if (y < NECK + BAND) a = solid(H.data, i) * ((NECK + BAND - y) / (2 * BAND));
    // below the chin, the new head brings its neck and hair, not its collar;
    // out past the ear, only hair (no stray fingertip of its own hand)
    if (y > my + 0.9 * d && !skin(H.data, i) && !hair(H.data, i)) a = 0;
    // the chin's pale soft edge would lie over the body's neck as a light line
    if (y > my + 0.85 * d && y < NECK + BAND && lum(H.data, i) > 200 && !bodyHead) a = 0;
    if (x < mx - 1.1 * d && y > my + 0.5 * d && !hair(H.data, i)) a = 0;
    if (fall[p]) a = Math.max(a, solid(H.data, i));
  }
  for (let c = 0; c < 3; c++) o[i + c] = Math.round(base[c] * (1 - a) + H.data[i + c] * a);
  // 3. the body's hand in front
  if (bodyHand[p]) for (let c = 0; c < 3; c++) o[i + c] = B.data[i + c];
}
if (process.env.SWAP_DEBUG) {
  // the masks, for checking: the head drawing's hand red, the body's blue,
  // falling hair yellow
  const dbg = Buffer.from(o);
  for (let p = 0; p < w * h; p++) {
    const tint = headHand[p] ? [230, 40, 40] : bodyHand[p] ? [40, 80, 230] : fall[p] ? [230, 200, 0] : null;
    if (tint) for (let c = 0; c < 3; c++) dbg[p * 3 + c] = Math.round(dbg[p * 3 + c] * 0.4 + tint[c] * 0.6);
  }
  await sharp(dbg, { raw: { width: w, height: h, channels: 3 } }).png().toFile(process.env.SWAP_DEBUG);
}
await sharp(o, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 82 }).toFile(out);
// where the eyes ended up: the head's spacing, the body's tilt and place
const half = head.d / 2, c = Math.cos(body.ang), sn = Math.sin(body.ang);
console.log(JSON.stringify({ [out]: { l: [Math.round(mx - half * c), Math.round(my - half * sn)], r: [Math.round(mx + half * c), Math.round(my + half * sn)] } }));
