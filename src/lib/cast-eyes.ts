// Where each cast portrait's eyes sit, in 720px picture space — measured
// automatically when the portraits were lined up (eyes and feet aligned).
// Each hair style's head sits on one shared body per person, tilted to match
// it (scripts/art/head-swap.mjs); medium and deep are re-tints of the light
// drawing (scripts/art/recolor-skin.mjs), so they share its eyes. Dress-up items are placed from these.

const LIGHT: Record<string, { l: [number, number]; r: [number, number] }> = {
  "man-buzz": { l: [328, 181], r: [392, 172] },
  "man-curly": { l: [332, 180], r: [388, 173] },
  "man-short": { l: [328, 181], r: [392, 172] },
  "man-side": { l: [329, 181], r: [391, 172] },
  "woman-bob": { l: [328, 172], r: [391, 181] },
  "woman-bun": { l: [327, 172], r: [392, 181] },
  "woman-curly": { l: [329, 172], r: [390, 181] },
  "woman-ponytail": { l: [328, 172], r: [391, 181] },
};

export const EYES: Record<string, { l: [number, number]; r: [number, number] }> = Object.fromEntries(
  Object.entries(LIGHT).flatMap(([id, eyes]) => {
    const [person, hair] = id.split("-");
    return ["light", "medium", "deep"].map((skin) => [`${person}-${skin}-${hair}`, eyes]);
  }),
);
