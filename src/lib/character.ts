// ─── You, in clay ─────────────────────────────────────────────────────────────
// A few taps pick your character: woman or man (which decides the four hair
// styles on offer), skin and hair (24 portraits in `public/people/`, all one
// body, one face, one pose — only the hair and skin change), then glasses
// layered on top (`public/dress/`). Everything was drawn once in the app's
// clay style (Figma AI, "monifes — clay art"), so there's no cost per person.

import { useMemo, useSyncExternalStore } from "react";
import { EYES } from "./cast-eyes";

export const PEOPLE = [
  { key: "woman", label: "Woman" },
  { key: "man", label: "Man" },
] as const;

export const SKINS = [
  { key: "light", label: "Light", hex: "#eccaa6" },
  { key: "medium", label: "Medium", hex: "#c08a5f" },
  { key: "deep", label: "Deep", hex: "#5f3c26" },
] as const;

export const HAIRS = {
  woman: [
    { key: "bob", label: "Bob" },
    { key: "ponytail", label: "Ponytail" },
    { key: "big-curls", label: "Big curls" },
    { key: "bun", label: "Bun" },
  ],
  man: [
    { key: "short", label: "Short" },
    { key: "side", label: "Side part" },
    { key: "buzz", label: "Buzz cut" },
    { key: "short-curls", label: "Short curls" },
  ],
} as const;

/** Square frames and sunglasses are drawn and placed too, but parked for now. */
export const GLASSES = [
  { key: "none", label: "None" },
  { key: "round", label: "Round" },
] as const;

/** Hats are parked for now (art and placement kept; not offered). */
export const HATS = [
  { key: "none", label: "None" },
  { key: "beanie", label: "Beanie" },
  { key: "sunhat", label: "Sun hat" },
  { key: "cap", label: "Cap" },
] as const;

type Person = (typeof PEOPLE)[number]["key"];
export type Hair = (typeof HAIRS)[Person][number]["key"];

export interface Look {
  person: Person;
  skin: (typeof SKINS)[number]["key"];
  hair: Hair;
  glasses: (typeof GLASSES)[number]["key"];
  hat: (typeof HATS)[number]["key"];
}

export const DEFAULT_LOOK: Look = {
  person: "woman",
  skin: "light",
  hair: "bob",
  glasses: "none",
  hat: "none",
};

/** Hair only comes in the styles offered to each; switching keeps it if it can. */
export function hairFor(person: Person, hair: string): Hair {
  return HAIRS[person].find((h) => h.key === hair)?.key ?? HAIRS[person][0].key;
}

// Older saved looks called both curly styles "curly".
const OLD_HAIR: Record<string, Hair> = { "woman-curly": "big-curls", "man-curly": "short-curls" };

const castId = (look: Pick<Look, "skin" | "hair">) => `${look.skin}-${look.hair}`;

// Bump the folder when the pictures change, so no cached old ones are shown.
// `cut`: the figure alone on transparency (same canvas), for standing in a scene.
export const castSrc = (look: Pick<Look, "skin" | "hair">, cut = false) =>
  `/people/v5/${cut ? "cut/" : ""}${castId(look)}.webp`;

// ─── Dress-up placement ──────────────────────────────────────────────────────
// Sizes are in eye-distances; `at` centres an item on the eyes, `bottom` puts
// its lower edge that far above (negative) the eye line. Tuned by eye on all
// 24 portraits. `aspect` is height ÷ width of the cut-out.

type Rule = { aspect: number; w: number; h?: number } & ({ at: number } | { bottom: number });

const DRESS: Record<string, Rule> = {
  round: { aspect: 379 / 922, w: 2.13, at: 0.02 },
  square: { aspect: 387 / 961, w: 1.98, at: 0.04 },
  sunnies: { aspect: 377 / 932, w: 2.0, at: 0.02 },
  beanie: { aspect: 834 / 742, w: 2.6, h: 1.94, bottom: -0.36 },
  sunhat: { aspect: 580 / 916, w: 3.5, bottom: -0.42 },
  cap: { aspect: 644 / 768, w: 2.75, bottom: -0.5 },
};

export type Placed = { src: string; left: number; top: number; width: number; height: number; rotate: number };

/** Where each worn item goes on a portrait, as fractions of the picture (0–1). */
export function dressOf(look: Look): Placed[] {
  const eyes = EYES[look.hair];
  if (!eyes) return [];
  const [[lx, ly], [rx, ry]] = [eyes.l, eyes.r];
  const d = Math.hypot(rx - lx, ry - ly);
  const ang = Math.atan2(ry - ly, rx - lx);
  const [mx, my] = [(lx + rx) / 2, (ly + ry) / 2];
  // Hat before glasses so frames sit over a brim's shadow, not under it.
  return [look.hat, look.glasses]
    .filter((k) => k !== "none")
    .map((k) => {
      const r = DRESS[k];
      const w = r.w * d;
      const h = r.h ? r.h * d : w * r.aspect;
      const off = "at" in r ? r.at * d : r.bottom * d - h / 2;
      // Along the head's tilt; the sign keeps hats over the crown of the turned head.
      const cx = mx + Math.sin(ang) * off;
      const cy = my + Math.cos(ang) * off;
      return {
        src: `/dress/${k}.webp`,
        left: cx / 720,
        top: cy / 720,
        width: w / 720,
        height: h / 720,
        rotate: (ang * 180) / Math.PI,
      };
    });
}

/** Unknown values (an older or newer app version) fall back to the default. */
function parseLook(v: unknown): Look {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const saved = String(r.hair);
  // a look saved without a person: whoever's list has that hair
  const person =
    PEOPLE.find((p) => p.key === r.person)?.key ??
    (HAIRS.man.some((h) => h.key === saved) ? "man" : DEFAULT_LOOK.person);
  return {
    person,
    skin: SKINS.find((s) => s.key === r.skin)?.key ?? DEFAULT_LOOK.skin,
    hair: hairFor(person, OLD_HAIR[`${person}-${saved}`] ?? saved),
    glasses: GLASSES.find((g) => g.key === r.glasses)?.key ?? "none",
    hat: "none", // hats are parked
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
      look: parseLook(raw?.look),
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

const noSubscribe = () => () => {};

/**
 * Who you are on this device, for showing (null until on the client, so the
 * server render and the first client render agree). Re-reads on each render,
 * so it's current after onboarding saves.
 */
export function useMe(): Me | null {
  const raw = useSyncExternalStore(
    noSubscribe,
    () => {
      try {
        return localStorage.getItem(ME_KEY) ?? "";
      } catch {
        return "";
      }
    },
    () => null,
  );
  return useMemo(() => (raw === null ? null : loadMe()), [raw]);
}
