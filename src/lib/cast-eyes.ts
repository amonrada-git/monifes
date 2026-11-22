// Where each hair style's eyes sit, in 720px picture space. Every portrait is
// one body and one face (the bob drawing's), with a hair style's head set on
// (scripts/art/head-swap.mjs, then scripts/art/face-swap.mjs); medium and deep
// skin are re-tints of the light picture (scripts/art/recolor-skin.mjs), so
// every skin shares its eyes. Glasses are placed from these.

export const EYES: Record<string, { l: [number, number]; r: [number, number] }> = {
  "bob": { l: [328, 172], r: [391, 181] },
  "ponytail": { l: [328, 172], r: [391, 181] },
  "big-curls": { l: [329, 172], r: [390, 181] },
  "bun": { l: [327, 172], r: [392, 181] },
  "short": { l: [327, 172], r: [392, 181] },
  "side": { l: [328, 172], r: [391, 181] },
  "buzz": { l: [328, 172], r: [391, 181] },
  "short-curls": { l: [331, 173], r: [388, 180] },
};
