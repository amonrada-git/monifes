// ─── You, in ink ──────────────────────────────────────────────────────────────
// The little character people make of themselves at the start: simple line
// drawings in the app's one ink, stacked as layers. Options are keys so saved
// looks survive changes to the drawings.

export type Hair =
  | "bob"
  | "short"
  | "curly"
  | "long"
  | "bun"
  | "ponytail"
  | "crop"
  | "beanie"
  | "bald";
export type HairTone = "dark" | "light";
export type Eyes = "dots" | "happy" | "lashes" | "big" | "sleepy";
export type Extra = "none" | "blush" | "freckles" | "mustache" | "beard";
export type Top = "tee" | "shirt" | "hoodie" | "knit" | "turtleneck" | "overalls";
export type Glasses = "none" | "round" | "square" | "sunnies";
export type Item = "none" | "coffee" | "plant" | "cat" | "book" | "camera";

export interface Look {
  hair: Hair;
  hairTone: HairTone;
  eyes: Eyes;
  extra: Extra;
  top: Top;
  glasses: Glasses;
  item: Item;
}

export interface Me {
  name: string;
  look: Look;
}

type Options<K extends string> = { key: K; label: string }[];

export const HAIRS: Options<Hair> = [
  { key: "bob", label: "Bob" },
  { key: "short", label: "Short" },
  { key: "curly", label: "Curly" },
  { key: "long", label: "Long" },
  { key: "bun", label: "Bun" },
  { key: "ponytail", label: "Ponytail" },
  { key: "crop", label: "Crop" },
  { key: "beanie", label: "Beanie" },
  { key: "bald", label: "Bald" },
];

export const HAIR_TONES: Options<HairTone> = [
  { key: "dark", label: "Dark" },
  { key: "light", label: "Light" },
];

export const EYES: Options<Eyes> = [
  { key: "dots", label: "Dots" },
  { key: "happy", label: "Happy" },
  { key: "lashes", label: "Lashes" },
  { key: "big", label: "Big" },
  { key: "sleepy", label: "Sleepy" },
];

export const EXTRAS: Options<Extra> = [
  { key: "none", label: "None" },
  { key: "blush", label: "Blush" },
  { key: "freckles", label: "Freckles" },
  { key: "mustache", label: "Mustache" },
  { key: "beard", label: "Beard" },
];

export const TOPS: Options<Top> = [
  { key: "tee", label: "Tee" },
  { key: "shirt", label: "Shirt" },
  { key: "hoodie", label: "Hoodie" },
  { key: "knit", label: "Black knit" },
  { key: "turtleneck", label: "Turtleneck" },
  { key: "overalls", label: "Overalls" },
];

export const GLASSES: Options<Glasses> = [
  { key: "none", label: "None" },
  { key: "round", label: "Round" },
  { key: "square", label: "Square" },
  { key: "sunnies", label: "Sunnies" },
];

export const ITEMS: Options<Item> = [
  { key: "none", label: "None" },
  { key: "coffee", label: "Coffee" },
  { key: "plant", label: "Plant" },
  { key: "cat", label: "Cat" },
  { key: "book", label: "Book" },
  { key: "camera", label: "Camera" },
];

export const DEFAULT_LOOK: Look = {
  hair: "bob",
  hairTone: "dark",
  eyes: "dots",
  extra: "none",
  top: "tee",
  glasses: "none",
  item: "none",
};

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** A fresh, random you, for "Surprise me". */
export function randomLook(): Look {
  return {
    hair: pick(HAIRS).key,
    hairTone: Math.random() < 0.8 ? "dark" : "light",
    eyes: pick(EYES).key,
    extra: Math.random() < 0.5 ? "none" : pick(EXTRAS).key,
    top: pick(TOPS).key,
    glasses: Math.random() < 0.6 ? "none" : pick(GLASSES).key,
    item: Math.random() < 0.3 ? "none" : pick(ITEMS).key,
  };
}

// Unknown keys (an older or newer app version) fall back to the default.
function sanitizeLook(v: unknown): Look {
  const r = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof Look, unknown>>;
  const one = <K extends string>(x: unknown, ok: Options<K>, d: K): K =>
    ok.some((o) => o.key === x) ? (x as K) : d;
  return {
    hair: one(r.hair, HAIRS, DEFAULT_LOOK.hair),
    hairTone: one(r.hairTone, HAIR_TONES, DEFAULT_LOOK.hairTone),
    eyes: one(r.eyes, EYES, DEFAULT_LOOK.eyes),
    extra: one(r.extra, EXTRAS, DEFAULT_LOOK.extra),
    top: one(r.top, TOPS, DEFAULT_LOOK.top),
    glasses: one(r.glasses, GLASSES, DEFAULT_LOOK.glasses),
    item: one(r.item, ITEMS, DEFAULT_LOOK.item),
  };
}

const ME_KEY = "monifes:me:v1";

/** Who you are on this device. (Local only for now; joins the account later.) */
export function loadMe(): Me {
  try {
    const raw = JSON.parse(localStorage.getItem(ME_KEY) ?? "null");
    return {
      name: typeof raw?.name === "string" ? raw.name.slice(0, 24) : "",
      look: sanitizeLook(raw?.look),
    };
  } catch {
    return { name: "", look: DEFAULT_LOOK };
  }
}

export function saveMe(me: Me) {
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(me));
  } catch {}
}
