// Where each cast portrait's eyes sit, in 720px picture space — measured
// automatically when the portraits were lined up (eyes and feet aligned).
// Dress-up items are placed from these.

export const EYES: Record<string, { l: [number, number]; r: [number, number] }> = {
  "man-deep-buzz": { l: [326, 170], r: [394, 182] },
  "man-deep-curly": { l: [323, 171], r: [397, 183] },
  "man-deep-short": { l: [327, 182], r: [393, 171] },
  "man-deep-side": { l: [327, 182], r: [393, 172] },
  "man-light-buzz": { l: [329, 181], r: [392, 172] },
  "man-light-curly": { l: [331, 182], r: [389, 171] },
  "man-light-short": { l: [332, 180], r: [388, 174] },
  "man-light-side": { l: [330, 181], r: [389, 172] },
  "man-medium-buzz": { l: [332, 182], r: [388, 172] },
  "man-medium-curly": { l: [329, 181], r: [391, 171] },
  "man-medium-short": { l: [330, 182], r: [390, 172] },
  "man-medium-side": { l: [331, 182], r: [389, 171] },
  "woman-deep-bob": { l: [329, 181], r: [391, 172] },
  "woman-deep-bun": { l: [326, 182], r: [393, 170] },
  "woman-deep-curly": { l: [325, 171], r: [396, 183] },
  "woman-deep-ponytail": { l: [329, 172], r: [390, 181] },
  "woman-light-bob": { l: [328, 173], r: [391, 180] },
  "woman-light-bun": { l: [327, 172], r: [392, 181] },
  "woman-light-curly": { l: [331, 182], r: [389, 171] },
  "woman-light-ponytail": { l: [329, 172], r: [392, 180] },
  "woman-medium-bob": { l: [331, 181], r: [390, 172] },
  "woman-medium-bun": { l: [328, 172], r: [392, 182] },
  "woman-medium-curly": { l: [330, 171], r: [391, 181] },
  "woman-medium-ponytail": { l: [326, 170], r: [394, 182] },
};
