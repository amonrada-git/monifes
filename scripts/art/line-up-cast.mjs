// Usage: node scripts/art/line-up-cast.mjs <folder of 1024px PNGs> <out folder> <eyes.json>
// Then regenerate src/lib/cast-eyes.ts from the JSON it writes.
// Line up the cast by their eyes and feet (not hair height), so every hair
// option of one person is the same size; report where the eyes land.
import sharp from "sharp";
import { readdirSync, writeFileSync } from "fs";
const [src, out, report] = process.argv.slice(2);
const SIZE = 720, FEET = 0.93 * SIZE, EYE_Y = 0.245 * SIZE, TARGET = [0xec, 0xeb, 0xe6];
const anchors = {};
for (const id of readdirSync(src).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4)).sort()) {
  const { data, info } = await sharp(`${src}/${id}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x, y) => { const i = (y * w + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const bg = [0, 0, 0]; let n = 0;
  for (const [x0, y0] of [[0, 0], [w - 24, 0], [0, h - 24], [w - 24, h - 24]])
    for (let y = y0; y < y0 + 24; y++) for (let x = x0; x < x0 + 24; x++) { const p = px(x, y); bg[0] += p[0]; bg[1] += p[1]; bg[2] += p[2]; n++; }
  bg.forEach((v, i) => (bg[i] = v / n));
  let top = h, bottom = 0;
  for (let y = 0; y < h; y++) { let c = 0; for (let x = 0; x < w; x += 2) { const p = px(x, y); if (Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]) > 40) c++; } if (c >= 3) { top = Math.min(top, y); bottom = Math.max(bottom, y); } }
  // Eyes: small, round, near-black, neutral blobs in the head region.
  const y0 = top, y1 = Math.round(top + (bottom - top) * 0.42);
  const dark = (x, y) => { const p = px(x, y); const l = 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]; return l < 62 && Math.max(...p) - Math.min(...p) < 70; };
  const seen = new Uint8Array(w * h), blobs = [];
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    if (seen[y * w + x] || !dark(x, y)) continue;
    const q = [[x, y]]; seen[y * w + x] = 1; let a = 0, sx = 0, sy = 0, mx = x, Mx = x, my = y, My = y;
    while (q.length) { const [cx, cy] = q.pop(); a++; sx += cx; sy += cy; mx = Math.min(mx, cx); Mx = Math.max(Mx, cx); my = Math.min(my, cy); My = Math.max(My, cy);
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) if (nx >= 0 && nx < w && ny >= y0 && ny < y1 && !seen[ny * w + nx] && dark(nx, ny)) { seen[ny * w + nx] = 1; q.push([nx, ny]); } }
    const bw = Mx - mx + 1, bh = My - my + 1;
    if (a >= 100 && a <= 3500 && bw <= 75 && bh <= 75 && bw / bh > 0.45 && bw / bh < 2 && a / (bw * bh) > 0.45) blobs.push({ x: sx / a, y: sy / a, a });
  }
  let best = null;
  for (let i = 0; i < blobs.length; i++) for (let j = 0; j < blobs.length; j++) {
    const [l, r] = [blobs[i], blobs[j]];
    const dx = r.x - l.x, dy = Math.abs(r.y - l.y);
    if (dx < 60 || dx > 190 || dy > 35) continue;
    const score = Math.abs(l.a - r.a) / Math.max(l.a, r.a) + dy / 60 - (l.y + r.y) / 2 / h; // similar, level, lowest
    if (!best || score < best.score) best = { l, r, score };
  }
  if (!best) { console.log(id, "NO EYES", blobs.length); continue; }
  const eyeMidY = (best.l.y + best.r.y) / 2, eyeMidX = (best.l.x + best.r.x) / 2;
  const scale = (FEET - EYE_Y) / (bottom - eyeMidY);
  const S2 = Math.round(w * scale), P = 300;
  const ox = Math.round(SIZE / 2 - eyeMidX * scale), oy = Math.round(FEET - bottom * scale);
  const padded = await sharp(`${src}/${id}.png`).removeAlpha().linear(TARGET.map((t, i) => t / bg[i]), [0, 0, 0])
    .resize(S2, S2).extend({ top: P, bottom: P, left: P, right: P, extendWith: "copy" }).png().toBuffer();
  await sharp(padded).extract({ left: P - ox, top: P - oy, width: SIZE, height: SIZE }).webp({ quality: 82 }).toFile(`${out}/${id}.webp`);
  const t = (p) => [Math.round(p.x * scale + ox), Math.round(p.y * scale + oy)];
  anchors[id] = { l: t(best.l), r: t(best.r) };
  console.log(id, anchors[id], "blobs", blobs.length);
}
writeFileSync(report, JSON.stringify(anchors, null, 1));
