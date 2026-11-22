// Usage: node scripts/art/cut-figure.mjs <portrait.webp> <out.webp>
// The figure alone, on transparency, for standing in a scene: alpha from how
// far each pixel is from the backdrop tone. Same 720px canvas as the portrait,
// so glasses placed for the portrait still fit. (The floor shadow goes; the
// scene draws its own.)
import sharp from "sharp";

const [src, out] = process.argv.slice(2);
const BG = [0xec, 0xeb, 0xe6];
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const o = Buffer.alloc(w * h * 4);
for (let p = 0; p < w * h; p++) {
  const i = p * 3;
  const d = Math.abs(data[i] - BG[0]) + Math.abs(data[i + 1] - BG[1]) + Math.abs(data[i + 2] - BG[2]);
  const a = Math.max(0, Math.min(1, (d - 12) / 28));
  // take the backdrop out of soft edge pixels so they don't glow on a new scene
  for (let c = 0; c < 3; c++) o[p * 4 + c] = a > 0.05 ? Math.max(0, Math.min(255, Math.round(BG[c] + (data[i + c] - BG[c]) / Math.max(a, 0.35)))) : data[i + c];
  o[p * 4 + 3] = Math.round(a * 255);
}
await sharp(o, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 85, alphaQuality: 90 }).toFile(out);
console.log(out);
