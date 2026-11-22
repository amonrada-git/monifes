// ─── You, in clay ─────────────────────────────────────────────────────────────
// The little figure people make of themselves at the start. Options are keys
// into the palettes below so saved looks survive palette tweaks.

export type HairStyle = "short" | "buzz" | "bob" | "long" | "bun" | "curly";
export type TopStyle = "tee" | "hoodie" | "shirt" | "dress";
export type Glasses = "none" | "round" | "square" | "sunnies";
export type Item = "none" | "coffee" | "plant" | "camera" | "book";

export interface Look {
  hair: HairStyle;
  hairColor: string;
  skin: string;
  top: TopStyle;
  topColor: string;
  glasses: Glasses;
  item: Item;
}

export interface Me {
  name: string;
  look: Look;
}

/** Clay tones, lightest to deepest. */
export const SKIN: Record<string, string> = {
  porcelain: "#f7dfca",
  light: "#efc9a4",
  warm: "#dfab80",
  tan: "#c68b5e",
  brown: "#9f6841",
  deep: "#6b4329",
};

export const HAIR_COLOR: Record<string, string> = {
  black: "#2a2421",
  espresso: "#4b2f21",
  chestnut: "#7c4a2a",
  honey: "#c8915a",
  silver: "#bdb8b0",
  rose: "#e3a3a6",
};

export const TOP_COLOR: Record<string, string> = {
  cream: "#efe6d6",
  sage: "#9fb08c",
  sky: "#9cb8d0",
  butter: "#ecd27f",
  terracotta: "#d68a68",
  lilac: "#b6a7d0",
  charcoal: "#3f3c3a",
};

export const HAIR_STYLES: { key: HairStyle; label: string }[] = [
  { key: "short", label: "Short" },
  { key: "buzz", label: "Buzz" },
  { key: "bob", label: "Bob" },
  { key: "long", label: "Long" },
  { key: "bun", label: "Bun" },
  { key: "curly", label: "Curly" },
];

export const TOP_STYLES: { key: TopStyle; label: string }[] = [
  { key: "tee", label: "Tee" },
  { key: "hoodie", label: "Hoodie" },
  { key: "shirt", label: "Shirt" },
  { key: "dress", label: "Dress" },
];

export const GLASSES: { key: Glasses; label: string }[] = [
  { key: "none", label: "None" },
  { key: "round", label: "Round" },
  { key: "square", label: "Square" },
  { key: "sunnies", label: "Sunnies" },
];

export const ITEMS: { key: Item; label: string }[] = [
  { key: "none", label: "None" },
  { key: "coffee", label: "Coffee" },
  { key: "plant", label: "Plant" },
  { key: "camera", label: "Camera" },
  { key: "book", label: "Book" },
];

export const DEFAULT_LOOK: Look = {
  hair: "short",
  hairColor: "black",
  skin: "light",
  top: "tee",
  topColor: "cream",
  glasses: "none",
  item: "none",
};

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** A fresh, random you, for "Surprise me". */
export function randomLook(): Look {
  return {
    hair: pick(HAIR_STYLES).key,
    hairColor: pick(Object.keys(HAIR_COLOR)),
    skin: pick(Object.keys(SKIN)),
    top: pick(TOP_STYLES).key,
    topColor: pick(Object.keys(TOP_COLOR)),
    glasses: Math.random() < 0.6 ? "none" : pick(GLASSES).key,
    item: pick(ITEMS).key,
  };
}

// Unknown keys (an older or newer app version) fall back to the default.
function sanitizeLook(v: unknown): Look {
  const r = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof Look, unknown>>;
  const one = <T extends string>(x: unknown, ok: readonly T[], d: T): T =>
    ok.includes(x as T) ? (x as T) : d;
  return {
    hair: one(r.hair, HAIR_STYLES.map((x) => x.key), DEFAULT_LOOK.hair),
    hairColor: one(r.hairColor, Object.keys(HAIR_COLOR), DEFAULT_LOOK.hairColor),
    skin: one(r.skin, Object.keys(SKIN), DEFAULT_LOOK.skin),
    top: one(r.top, TOP_STYLES.map((x) => x.key), DEFAULT_LOOK.top),
    topColor: one(r.topColor, Object.keys(TOP_COLOR), DEFAULT_LOOK.topColor),
    glasses: one(r.glasses, GLASSES.map((x) => x.key), DEFAULT_LOOK.glasses),
    item: one(r.item, ITEMS.map((x) => x.key), DEFAULT_LOOK.item),
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
