// Usage: node scripts/art/smooth-backdrop.mjs <portrait.webp> [more…]   (in place)
// The line-up stretches each picture's edge to fill the frame, which leaves
// faint streaks in the empty backdrop. Replace the backdrop above the floor
// shadow with a softly blurred version of itself; the figure (and a margin
// round it) and the shadow are left alone.
import sharp from "sharp";

const BG = [0xec, 0xeb, 0xe6];
for (const file of process.argv.slice(2)) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const off = (i) => Math.abs(data[i] - BG[0]) + Math.abs(data[i + 1] - BG[1]) + Math.abs(data[i + 2] - BG[2]);

  // the figure, grown by a margin
  const fig = new Uint8Array(w * h);
  let feet = 0;
  for (let p = 0; p < w * h; p++) if (off(p * 3) > 40) { fig[p] = 1; feet = Math.max(feet, (p / w) | 0); }
  const R = 14;
  const near = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!fig[y * w + x]) continue;
    for (let dy = -R; dy <= R; dy += 2) for (let dx = -R; dx <= R; dx += 2) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < h && xx >= 0 && xx < w) near[yy * w + xx] = 1;
    }
  }

  // the backdrop alone (figure painted over in the backdrop tone), blurred
  const plain = Buffer.from(data);
  for (let p = 0; p < w * h; p++) if (near[p]) for (let c = 0; c < 3; c++) plain[p * 3 + c] = BG[c];
  const soft = await sharp(plain, { raw: { width: w, height: h, channels: 3 } }).blur(24).raw().toBuffer();

  // swap it in above the shadow, fading over 12px at the figure's margin
  const out = Buffer.from(data);
  const shadowTop = feet - 70;
  for (let y = 0; y < Math.min(h, shadowTop); y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (near[p]) continue;
    const k = Math.min(1, (shadowTop - y) / 12);
    for (let c = 0; c < 3; c++) out[p * 3 + c] = Math.round(data[p * 3 + c] * (1 - k) + soft[p * 3 + c] * k);
  }
  await sharp(out, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 82 }).toFile(file + ".tmp.webp");
  const { renameSync } = await import("fs");
  renameSync(file + ".tmp.webp", file);
  console.log(file);
}
