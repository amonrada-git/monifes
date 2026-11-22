// Usage: node scripts/art/cut-out.mjs <accessory on magenta>.png <out>.png
// Then resize to 400px WebP into public/dress/ and add a placement rule in
// src/lib/character.ts (DRESS).
// Cut an accessory out of its magenta backdrop: soft alpha by distance from
// magenta, with the pink fringe pulled out of the edges.
import sharp from "sharp";
const [src, out] = process.argv.slice(2);
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const o = Buffer.alloc(info.width * info.height * 4);
let minX = 1e9, minY = 1e9, maxX = 0, maxY = 0;
for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
  let [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  const d = Math.hypot(r - 255, g, b - 255);
  const a = Math.max(0, Math.min(1, (d - 90) / 90));
  const spill = Math.min(r, b) - g;
  if (spill > 0 && a < 1) { r -= spill * (1 - a * 0.5); b -= spill * (1 - a * 0.5); }
  o[j] = r; o[j + 1] = g; o[j + 2] = b; o[j + 3] = Math.round(a * 255);
  if (a > 0.5) { const p = j / 4, x = p % info.width, y = (p / info.width) | 0; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
}
await sharp(o, { raw: { width: info.width, height: info.height, channels: 4 } })
  .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }).png().toFile(out);
console.log(out, { w: maxX - minX + 1, h: maxY - minY + 1 });
