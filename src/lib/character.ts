// ─── You, in clay ─────────────────────────────────────────────────────────────
// People describe themselves with a few taps; the server turns the choices into
// a clay portrait (and their welcome album) in the same style as the app's art.
// Every option is a fixed key with a fixed phrase — nothing typed ever reaches
// the image model.

type Option<K extends string> = { key: K; label: string; phrase: string; hex?: string };

export const PEOPLE = [
  { key: "woman", label: "Woman", phrase: "woman" },
  { key: "man", label: "Man", phrase: "man" },
  { key: "person", label: "Just me", phrase: "person" },
] as const satisfies Option<string>[];

export const AGES = [
  { key: "young", label: "20s", phrase: "young adult" },
  { key: "middle", label: "30s–40s", phrase: "grown-up, around forty" },
  { key: "older", label: "50s+", phrase: "older, in their sixties" },
] as const satisfies Option<string>[];

export const SKINS = [
  { key: "fair", label: "Fair", phrase: "fair porcelain skin", hex: "#f6dfcb" },
  { key: "light", label: "Light", phrase: "light warm skin", hex: "#eccaa6" },
  { key: "tan", label: "Tan", phrase: "warm light-tan skin", hex: "#dbab80" },
  { key: "medium", label: "Medium", phrase: "warm medium-brown skin", hex: "#c08a5f" },
  { key: "brown", label: "Brown", phrase: "rich brown skin", hex: "#946240" },
  { key: "deep", label: "Deep", phrase: "deep dark-brown skin", hex: "#5f3c26" },
] as const satisfies Option<string>[];

export const HAIRS = [
  { key: "short", label: "Short", phrase: "short tousled hair" },
  { key: "bob", label: "Bob", phrase: "a short bob haircut" },
  { key: "long", label: "Long", phrase: "long straight hair past the shoulders" },
  { key: "curly", label: "Curly", phrase: "soft voluminous curly hair" },
  { key: "bun", label: "Bun", phrase: "hair in a neat bun" },
  { key: "ponytail", label: "Ponytail", phrase: "hair in a ponytail" },
  { key: "buzz", label: "Buzz cut", phrase: "a very short buzz cut" },
  { key: "bald", label: "Bald", phrase: "a smooth bald head" },
] as const satisfies Option<string>[];

export const HAIR_COLORS = [
  { key: "black", label: "Black", phrase: "black", hex: "#2a2421" },
  { key: "darkbrown", label: "Dark brown", phrase: "dark-brown", hex: "#4b2f21" },
  { key: "brown", label: "Brown", phrase: "chestnut-brown", hex: "#7c4a2a" },
  { key: "blonde", label: "Blonde", phrase: "honey-blonde", hex: "#d1a165" },
  { key: "grey", label: "Grey", phrase: "silver-grey", hex: "#bdb8b0" },
  { key: "pink", label: "Pink", phrase: "soft pastel-pink", hex: "#e3a3a6" },
] as const satisfies Option<string>[];

export const OUTFITS = [
  { key: "knit", label: "Knit", phrase: "a chunky knit sweater" },
  { key: "hoodie", label: "Hoodie", phrase: "a cosy hoodie" },
  { key: "shirt", label: "Shirt", phrase: "a relaxed button-up shirt" },
  { key: "tee", label: "T-shirt", phrase: "a loose t-shirt" },
  { key: "cardigan", label: "Cardigan", phrase: "a soft cardigan over a cream top" },
  { key: "dress", label: "Dress", phrase: "a simple long dress" },
] as const satisfies Option<string>[];

export const OUTFIT_COLORS = [
  { key: "cream", label: "Cream", phrase: "cream", hex: "#efe6d6" },
  { key: "sage", label: "Sage", phrase: "sage-green", hex: "#9fb08c" },
  { key: "terracotta", label: "Terracotta", phrase: "terracotta", hex: "#d68a68" },
  { key: "mustard", label: "Mustard", phrase: "mustard-yellow", hex: "#d9b552" },
  { key: "sky", label: "Sky", phrase: "soft sky-blue", hex: "#9cb8d0" },
  { key: "charcoal", label: "Charcoal", phrase: "charcoal", hex: "#45423f" },
] as const satisfies Option<string>[];

export const GLASSES = [
  { key: "none", label: "None", phrase: "" },
  { key: "round", label: "Round", phrase: "round black glasses" },
  { key: "square", label: "Square", phrase: "square tortoiseshell glasses" },
  { key: "sunnies", label: "Sunglasses", phrase: "little dark sunglasses" },
] as const satisfies Option<string>[];

export const ITEMS = [
  { key: "none", label: "Nothing", phrase: "" },
  { key: "coffee", label: "Coffee", phrase: "a takeaway coffee cup" },
  { key: "plant", label: "Plant", phrase: "a small potted plant in a terracotta pot" },
  { key: "camera", label: "Camera", phrase: "a small black camera" },
  { key: "book", label: "Book", phrase: "a favourite book" },
  { key: "cat", label: "Cat", phrase: "a small fluffy cat" },
] as const satisfies Option<string>[];

type KeyOf<T extends readonly { key: string }[]> = T[number]["key"];

export interface Look {
  person: KeyOf<typeof PEOPLE>;
  age: KeyOf<typeof AGES>;
  skin: KeyOf<typeof SKINS>;
  hair: KeyOf<typeof HAIRS>;
  hairColor: KeyOf<typeof HAIR_COLORS>;
  outfit: KeyOf<typeof OUTFITS>;
  outfitColor: KeyOf<typeof OUTFIT_COLORS>;
  glasses: KeyOf<typeof GLASSES>;
  item: KeyOf<typeof ITEMS>;
}

export const LOOK_OPTIONS = {
  person: PEOPLE,
  age: AGES,
  skin: SKINS,
  hair: HAIRS,
  hairColor: HAIR_COLORS,
  outfit: OUTFITS,
  outfitColor: OUTFIT_COLORS,
  glasses: GLASSES,
  item: ITEMS,
} as const satisfies Record<keyof Look, readonly Option<string>[]>;

export const DEFAULT_LOOK: Look = {
  person: "woman",
  age: "young",
  skin: "light",
  hair: "bob",
  hairColor: "darkbrown",
  outfit: "knit",
  outfitColor: "cream",
  glasses: "none",
  item: "none",
};

const optionOf = <F extends keyof Look>(field: F, key: Look[F]) =>
  (LOOK_OPTIONS[field] as readonly Option<string>[]).find((o) => o.key === key)!;

/** A strict check: every field present and a known key, or null. For untrusted input. */
export function parseLook(v: unknown): Look | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const out: Partial<Record<keyof Look, string>> = {};
  for (const field of Object.keys(LOOK_OPTIONS) as (keyof Look)[]) {
    const ok = (LOOK_OPTIONS[field] as readonly Option<string>[]).some((o) => o.key === r[field]);
    if (!ok) return null;
    out[field] = r[field] as string;
  }
  return out as Look;
}

/** The figure in words — the one sentence every image of you is drawn from. */
export function describe(look: Look) {
  const o = <F extends keyof Look>(f: F) => optionOf(f, look[f]).phrase;
  const who = `${o("age")} ${o("person")}`;
  const hair =
    look.hair === "bald" ? o("hair") : `${o("hair")} in ${o("hairColor")}`;
  const top = `${o("outfitColor")} ${o("outfit").replace(/^a |^an /, "")}`;
  const bottoms =
    look.outfit === "dress"
      ? ""
      : `, ${look.outfitColor === "charcoal" ? "cream" : "charcoal"} wide trousers`;
  const glasses = look.glasses === "none" ? "" : `, ${o("glasses")}`;
  return `a ${who} with ${hair}, a round friendly face, ${o("skin")}${glasses}, wearing a ${top}${bottoms} and soft white sneakers`;
}

/** Holding something, for the portrait. */
export function holding(look: Look) {
  return look.item === "none" ? "" : optionOf("item", look.item).phrase;
}

/** A short line for the card while you choose: "A young woman · dark-brown bob · cream knit". */
export function summary(look: Look) {
  const label = <F extends keyof Look>(f: F) => optionOf(f, look[f]).label.toLowerCase();
  const parts = [
    `${optionOf("age", look.age).label} ${label("person") === "just me" ? "" : label("person")}`.trim(),
    look.hair === "bald" ? "bald" : `${label("hairColor")} ${label("hair")}`,
    `${label("outfitColor")} ${label("outfit")}`,
    look.glasses === "none" ? "" : `${label("glasses")} glasses`.replace("sunglasses glasses", "sunglasses"),
    look.item === "none" ? "" : `with a ${label("item")}`,
  ];
  return parts.filter(Boolean).join(" · ");
}

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** A fresh, random you, for "Surprise me". */
export function randomLook(): Look {
  return {
    person: pick(PEOPLE).key,
    age: pick(AGES).key,
    skin: pick(SKINS).key,
    hair: pick(HAIRS).key,
    hairColor: pick(HAIR_COLORS).key,
    outfit: pick(OUTFITS).key,
    outfitColor: pick(OUTFIT_COLORS).key,
    glasses: Math.random() < 0.6 ? "none" : pick(GLASSES).key,
    item: pick(ITEMS).key,
  };
}

// ─── On this device ──────────────────────────────────────────────────────────

export interface Me {
  name: string;
  look: Look;
}

const ME_KEY = "monifes:me:v1";

/** Who you are on this device. (Local only for now; joins the account later.) */
export function loadMe(): Me {
  try {
    const raw = JSON.parse(localStorage.getItem(ME_KEY) ?? "null");
    return {
      name: typeof raw?.name === "string" ? raw.name.slice(0, 24) : "",
      look: parseLook(raw?.look) ?? DEFAULT_LOOK,
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
