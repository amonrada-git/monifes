// ─── Prompts for clay you ─────────────────────────────────────────────────────
// Server-only. The style block is the one the welcome art was made with, so a
// generated you sits in the same world as everything else.

import { describe, holding, type Look } from "./character";

export const SCENE_KEYS = ["family", "travel", "build", "abundant", "peaceful", "wealthier"] as const;
export type SceneKey = (typeof SCENE_KEYS)[number];

const STYLE =
  "3D clay render, soft matte plasticine look, cute minimal toy-figure style with smooth rounded forms and short, chunky toy proportions (the head about a third of the body height), simple black dot eyes, tiny curved smile, small rosy cheeks, no outlines.";

const FRAME =
  "Centered composition, full body, three-quarter view, gentle soft studio lighting from the upper left, soft contact shadow. Plain seamless warm off-white background (#ECEBE6), no floor line. Muted warm palette: cream, sage green, terracotta. No text, no letters, no logos.";

const SCENES: Record<SceneKey, (look: Look) => string> = {
  family: (look) =>
    look.age === "older"
      ? 'Scene "more time with family": an unhurried picnic on a round cream blanket — the character sits laughing with their grown-up daughter in a terracotta cardigan and a small grandchild in a mustard-yellow shirt hugging the character\'s arm; a wicker picnic basket, a plate of sliced fruit and a teapot between them. Warm, close, relaxed.'
      : 'Scene "more time with family": an unhurried picnic on a round cream blanket — the character sits laughing with their family: an older mother with a grey hair bun and a terracotta cardigan, and a small child in a mustard-yellow shirt hugging the character\'s arm; a wicker picnic basket, a plate of sliced fruit and a teapot between them. Warm, close, relaxed.',
  travel: () =>
    'Scene "free to travel": the character, now with a small straw sun hat and a sage canvas backpack, stands happily beside a rounded terracotta suitcase covered in a few blank round travel stickers, holding a little camera, looking out toward small clay landmarks behind them — soft rounded mountains with snowy tips, a tiny lighthouse, a little palm tree — and a small cream paper airplane floating above.',
  build: () =>
    'Scene "free to build your own thing": wearing a terracotta work apron, the character proudly sets up their own small shop — a cute wooden market stall with a striped cream-and-sage awning, shelves holding handmade ceramic cups, small potted plants and wrapped parcels; they place one last handmade cup on the counter; a little chalkboard stand beside the stall is blank.',
  abundant: () =>
    'Scene "living in abundance": the character smiles while carrying a big woven wicker basket overflowing with fresh produce — round oranges, green apples, a baguette, leafy greens and a small bunch of flowers — with a couple of oranges resting on the ground beside them.',
  peaceful: () =>
    'Scene "feeling at peace": the character sits relaxed and cross-legged on a big round cream floor cushion, eyes gently closed and content, holding a warm terracotta mug of tea with a little curl of steam; a leafy potted plant and a small stack of books sit beside them. Calm and unhurried.',
  wealthier: () =>
    'Scene "becoming wealthier": the character happily waters a small potted tree whose round leaves are shiny gold coins; a few coins rest in the terracotta pot and a glass jar full of coins stands beside it.',
};

/** The first picture: you, standing, holding your thing. */
export function portraitPrompt(look: Look) {
  const item = holding(look);
  return [
    STYLE,
    `An original character: ${describe(look)}${item ? `, holding ${item} at chest height` : ""}.`,
    "Character portrait: standing, relaxed and happy, nothing else in the scene.",
    FRAME,
  ].join(" ");
}

/** A moment from the album, drawn from your portrait so it stays you. */
export function scenePrompt(look: Look, scene: SceneKey) {
  return [
    STYLE,
    `The same character as in the reference image — keep their face, hair, skin tone, glasses and outfit exactly: ${describe(look)}.`,
    SCENES[scene](look),
    FRAME,
  ].join(" ");
}
