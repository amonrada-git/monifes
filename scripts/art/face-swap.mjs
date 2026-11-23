// Usage: node scripts/art/face-swap.mjs <head.webp> <face.webp> <out.webp> <eyes.json> <head id> <face id> <body.webp>
// (body: the shared body drawing, whose neck and collar are used below the chin)
// Gives every hair style the same face: the face drawing's eyes, brows,
// cheeks and smile (and its neck, which sits cleanly on the shared body) are
// laid into the head drawing, scaled and placed by the eyes. The head
// drawing keeps its own hair on top — a fringe over the brow, a curl over a
// cheek — and the face drawing's own hair is never brought across.
import sharp from "sharp";
import { readFileSync } from "fs";

const [headFile, faceFile, out, eyesFile, headId, faceId, bodyFile] = process.argv.slice(2);
const all = JSON.parse(readFileSync(eyesFile, "utf8"));
const geo = ({ l: [lx, ly], r: [rx, ry] }) => ({ d: Math.hypot(rx - lx, ry - ly), mx: (lx + rx) / 2, my: (ly + ry) / 2 });
const V = geo(all[headId]), F = geo(all[faceId]);
const { d, mx, my } = V;

const load = async (f) => (await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
const Hd = await load(headFile), F0 = await load(faceFile), Bd = await load(bodyFile);
const { width: w, height: h } = Hd.info;
const bg = [0xec, 0xeb, 0xe6];

// the face drawing, scaled about its eyes to the head's eye spacing and moved onto them
const Fd = Buffer.alloc(w * h * 3);
const k = F.d / d;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const sx = F.mx + (x - mx) * k, sy = F.my + (y - my) * k;
  const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
  for (let c = 0; c < 3; c++) {
    const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= w || yy >= h ? bg[c] : F0.data[(yy * w + xx) * 3 + c]);
    Fd[(y * w + x) * 3 + c] = Math.round(
      at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy,
    );
  }
}

const lum = (b, i) => 0.3 * b[i] + 0.59 * b[i + 1] + 0.11 * b[i + 2];
const hair = (b, i) => {
  const max = Math.max(b[i], b[i + 1], b[i + 2]), min = Math.min(b[i], b[i + 1], b[i + 2]);
  const l = lum(b, i);
  return l < 80 || (l < 125 && max > 0 && (max - min) / max > 0.38);
};
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Below the chin, any hair counts — a curl's lighter strands too — and the
// face drawing's hair is kept away with a 2px margin (its soft outline would
// otherwise leave a dark squiggle).
const hairish = (b, i) => {
  const max = Math.max(b[i], b[i + 1], b[i + 2]), min = Math.min(b[i], b[i + 1], b[i + 2]);
  const l = lum(b, i);
  return l < 80 || (l < 150 && max > 0 && (max - min) / max > 0.25);
};
// The body is the same in both drawings, pixel for pixel, so below the chin
// (and the waving hand) come from the face drawing as it is — unscaled.
const B0 = F0.data;
const fNear = new Uint8Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (!hair(B0, (y * w + x) * 3)) continue;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const yy = y + dy, xx = x + dx;
    if (yy >= 0 && yy < h && xx >= 0 && xx < w) fNear[yy * w + xx] = 1;
  }
}

// the shared body's hair (the bun's strands), with the same 2px margin
const bNear = new Uint8Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (!hairish(Bd.data, (y * w + x) * 3)) continue;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const yy = y + dy, xx = x + dx;
    if (yy >= 0 && yy < h && xx >= 0 && xx < w) bNear[yy * w + xx] = 1;
  }
}

// the body's waving hand: warm skin out to the left of the face, below the eyes
const handOf = new Uint8Array(w * h);
for (let y = Math.round(my + 0.3 * d); y < Math.round(my + 0.95 * d) + 1; y++)
  for (let x = 0; x < mx - 1.0 * d; x++) {
    const i = (y * w + x) * 3;
    const max = Math.max(B0[i], B0[i + 1], B0[i + 2]), min = Math.min(B0[i], B0[i + 1], B0[i + 2]);
    if (lum(B0, i) > 150 && max > 0 && (max - min) / max > 0.14) handOf[y * w + x] = 1;
  }
for (let pass = 0; pass < 3; pass++) {
  const add = [];
  for (let p = w; p < w * h - w; p++)
    if (!handOf[p] && !fNear[p] && lum(B0, p * 3) > 120 && (handOf[p - 1] || handOf[p + 1] || handOf[p - w] || handOf[p + w])) add.push(p);
  for (const p of add) handOf[p] = 1;
}

// the head drawing's hair — real hair, not a stray tendril (small pieces are
// dropped) — with a 2px margin, so soft strand edges stay with it
const vHairMask = new Uint8Array(w * h);
for (let p = 0; p < w * h; p++) vHairMask[p] = hairish(Hd.data, p * 3) ? 1 : 0;
{
  const seen = new Uint8Array(w * h);
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!vHairMask[p0] || seen[p0]) continue;
    const blob = [], st = [p0];
    seen[p0] = 1;
    while (st.length) {
      const p = st.pop(); blob.push(p);
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w])
        if (q >= 0 && q < w * h && vHairMask[q] && !seen[q]) { seen[q] = 1; st.push(q); }
    }
    if (blob.length < 300) for (const p of blob) vHairMask[p] = 0;
  }
}
const vNear = new Uint8Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (!vHairMask[y * w + x]) continue;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const yy = y + dy, xx = x + dx;
    if (yy >= 0 && yy < h && xx >= 0 && xx < w) vNear[yy * w + xx] = 1;
  }
}

// Each drawing's chin line, column by column: the lowest face-skin pixel
// joined straight down from the eyes. Below the chin means below *both*
// chins, so neither drawing's jaw shadow lands on the other's face.
const skinish = (b, i) => {
  const max = Math.max(b[i], b[i + 1], b[i + 2]), min = Math.min(b[i], b[i + 1], b[i + 2]);
  return lum(b, i) > 140 && max > 0 && (max - min) / max > 0.12 && (max - min) / max < 0.62;
};
const chinOf = (b) => {
  const out = new Int32Array(w).fill(-1);
  for (let x = Math.round(mx - 0.9 * d); x <= Math.round(mx + 0.9 * d); x++) {
    let y = Math.round(my + 0.3 * d), last = -1;
    for (; y < my + 1.4 * d; y++) {
      if (skinish(b, (y * w + x) * 3)) last = y;
      else if (last > 0 && y - last > 14) break; // (steps over the mouth and cheeks' blush)
    }
    if (last > my + 0.55 * d) out[x] = last;
  }
  return out;
};
const chinV = chinOf(Hd.data), chinB = chinOf(B0);
// (following the jaw's curve: at the sides it's higher than under the chin;
// where neither drawing has jaw in a column, a line just under the chin)
const chinAt = (x) => {
  const found = x >= 0 && x < w ? Math.max(chinV[x], chinB[x]) : -1;
  return found > 0 ? found + 3 : Math.round(my + 0.95 * d) + 3;
};

// Match the face drawing's skin to the head's: the average colour just
// inside the oval's rim, in each, and shift the face by the difference.
const shift = [0, 0, 0];
{
  const sum = [[0, 0, 0], [0, 0, 0]];
  let n = 0;
  for (let y = Math.round(my - 0.2 * d); y < my + 0.8 * d; y++) for (let x = Math.round(mx - 0.9 * d); x < mx + 0.9 * d; x++) {
    const ex = (x - mx) / (0.9 * d), ey = (y - (my + 0.2 * d)) / (0.62 * d);
    const r = Math.sqrt(ex * ex + ey * ey);
    if (r < 0.7 || r > 0.95) continue;
    const i = (y * w + x) * 3;
    if (!skinish(Hd.data, i) || !skinish(Fd, i)) continue;
    for (let c = 0; c < 3; c++) { sum[0][c] += Hd.data[i + c]; sum[1][c] += Fd[i + c]; }
    n++;
  }
  if (n) for (let c = 0; c < 3; c++) shift[c] = (sum[0][c] - sum[1][c]) / n;
}

const o = Buffer.from(Hd.data);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y * w + x) * 3;
  const vHair = hair(Hd.data, i), fHair = hair(Fd, i);
  let wgt = 0;
  if (y > chinAt(x)) {
    // under the chin: the face drawing's neck and collar (the same body, cleanly
    // joined); the head drawing keeps hair that falls this low
    if (vNear[y * w + x]) continue; // the head's own hair falling this low
    // the shared body's own neck and collar — clean; where its own hair
    // strands hang, the face drawing's; where both have hair, backdrop
    const src = !bNear[y * w + x] ? Bd.data : !fNear[y * w + x] ? B0 : null;
    for (let c = 0; c < 3; c++) o[i + c] = src ? src[i + c] : bg[c];
    continue;
  } else if (x < mx - 1.0 * d && y > my + 0.3 * d && handOf[y * w + x]) {
    // the waving hand, beside the face: the body's own, as it is
    for (let c = 0; c < 3; c++) o[i + c] = B0[i + c];
    continue;
  } else if (x < mx - 1.42 * d && y > my - 0.1 * d && !vNear[y * w + x]) {
    // out past the ear, by the wave: hair, the hand, or backdrop — nothing else
    for (let c = 0; c < 3; c++) o[i + c] = bg[c];
    continue;
  } else {
    // the features: an oval from the brows to the chin, feathered at its rim
    // (stopping short of the jaw: each head keeps its own jaw and chin)
    const ex = (x - mx) / (0.9 * d), ey = (y - (my + 0.2 * d)) / (0.62 * d);
    wgt = smooth((1 - Math.sqrt(ex * ex + ey * ey)) / 0.32);
    if (!wgt) continue;
    if (y > my - 0.3 * d) {
      // eyes and smile: always the face drawing's (dark, but not hair)
    } else if (vHair) {
      wgt = 0; // a fringe over the brow stays
    } else if (fHair && lum(Fd, i) > 60) {
      wgt = 0; // the face drawing's own fringe isn't brought across (its brows are)
    }
  }
  if (!wgt) continue;
  // (the face's own colour, shifted to the head's skin — only on skin, not the eyes)
  const tone = skinish(Fd, i) ? shift : [0, 0, 0];
  for (let c = 0; c < 3; c++) o[i + c] = Math.round(Hd.data[i + c] * (1 - wgt) + Math.max(0, Math.min(255, Fd[i + c] + tone[c])) * wgt);
}
// Last, sweep away specks: small bits not joined to the figure (a stray
// fingertip edge left over from a head drawing) become backdrop.
{
  const on = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 3;
    on[p] = Math.abs(o[i] - bg[0]) + Math.abs(o[i + 1] - bg[1]) + Math.abs(o[i + 2] - bg[2]) > 18 ? 1 : 0;
  }
  const seen = new Uint8Array(w * h);
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!on[p0] || seen[p0]) continue;
    const blob = [], st = [p0];
    seen[p0] = 1;
    while (st.length) {
      const p = st.pop(); blob.push(p);
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w, p - w - 1, p - w + 1, p + w - 1, p + w + 1])
        if (q >= 0 && q < w * h && on[q] && !seen[q]) { seen[q] = 1; st.push(q); }
    }
    if (blob.length < 600) for (const p of blob) for (let c = 0; c < 3; c++) o[p * 3 + c] = bg[c];
  }
}
await sharp(o, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 82 }).toFile(out);
console.log(out);
