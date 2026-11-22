// Where each cast portrait's eyes sit, in 720px picture space — measured
// automatically when the portraits were lined up (eyes and feet aligned).
// Each hair style's head sits on one shared body per person
// (scripts/art/head-swap.mjs); medium and deep are re-tints of the light drawing
// (scripts/art/recolor-skin.mjs), so they share its eyes. Dress-up items are placed from these.

const LIGHT: Record<string, { l: [number, number]; r: [number, number] }> = {
  "man-buzz": { l: [329, 182], r: [392, 171] },
  "man-curly": { l: [332, 181], r: [388, 172] },
  "man-short": { l: [328, 181], r: [392, 172] },
  "man-side": { l: [328, 174], r: [391, 179] },
  "woman-bob": { l: [328, 173], r: [391, 180] },
  "woman-bun": { l: [327, 172], r: [392, 181] },
  "woman-curly": { l: [331, 182], r: [389, 171] },
  "woman-ponytail": { l: [329, 172], r: [392, 180] },
};

export const EYES: Record<string, { l: [number, number]; r: [number, number] }> = Object.fromEntries(
  Object.entries(LIGHT).flatMap(([id, eyes]) => {
    const [person, hair] = id.split("-");
    return ["light", "medium", "deep"].map((skin) => [`${person}-${skin}-${hair}`, eyes]);
  }),
);
