// Where each cast portrait's eyes sit, in 720px picture space — measured
// automatically when the portraits were lined up (eyes and feet aligned).
// Medium and deep are re-tints of the light drawing (scripts/art/recolor-skin.mjs),
// so they share its eyes. Dress-up items are placed from these.

const LIGHT: Record<string, { l: [number, number]; r: [number, number] }> = {
  "man-buzz": { l: [329, 181], r: [392, 172] },
  "man-curly": { l: [331, 182], r: [389, 171] },
  "man-short": { l: [332, 180], r: [388, 174] },
  "man-side": { l: [330, 181], r: [389, 172] },
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
