// ─── You, in clay ─────────────────────────────────────────────────────────────
// Two quick answers pick your character from a cast of six, drawn once in the
// app's clay style (Figma AI, "monifes — clay art"). Each has a portrait and
// the six welcome moments, in `public/cast/<id>/`.

export const PEOPLE = [
  { key: "woman", label: "Woman" },
  { key: "man", label: "Man" },
] as const;

export const SKINS = [
  { key: "light", label: "Light", hex: "#eccaa6" },
  { key: "medium", label: "Medium", hex: "#c08a5f" },
  { key: "deep", label: "Deep", hex: "#5f3c26" },
] as const;

export interface Look {
  person: (typeof PEOPLE)[number]["key"];
  skin: (typeof SKINS)[number]["key"];
}

export const DEFAULT_LOOK: Look = { person: "woman", skin: "light" };

/** One of the six characters' pictures: their portrait or a welcome moment. */
export const castSrc = (look: Look, pic: string) => `/cast/${look.person}-${look.skin}/${pic}.webp`;

/** Unknown values (an older or newer app version) fall back to the default. */
function parseLook(v: unknown): Look {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    person: PEOPLE.find((p) => p.key === r.person)?.key ?? DEFAULT_LOOK.person,
    skin: SKINS.find((s) => s.key === r.skin)?.key ?? DEFAULT_LOOK.skin,
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
