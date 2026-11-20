// ─── The vocabulary of monifes ────────────────────────────────────────────────

/** The emotion behind a spend — the primary data. */
export type Feeling = "worth-it" | "joy" | "meh" | "impulse" | "regret";

/** The four plan buckets. Necessities=Need, Guilt-free=Want, the rest build wealth. */
export type Bucket = "necessities" | "guilt-free" | "investments" | "savings";

/** Which side of the Need:Want game a bucket plays on ("wealth" sits outside it). */
export type Side = "need" | "want" | "wealth";

/** Difficulty = the user's chosen Need:Want target. Their goal, not the app's rule. */
export type Difficulty = "easy" | "recommended" | "hard";

export interface Spend {
  id: string;
  /** Positive amount in the user's currency (whole units, e.g. yen). */
  amount: number;
  bucket: Bucket;
  feeling: Feeling;
  label?: string;
  /** ISO timestamp. */
  createdAt: string;
}

/** A monthly plan across the four buckets. Optional — spending comes first. */
export interface Budget {
  necessities: number;
  "guilt-free": number;
  investments: number;
  savings: number;
}

export interface Settings {
  currency: string; // ISO code, e.g. "JPY"
  difficulty: Difficulty;
}

export interface AppData {
  spends: Spend[];
  /** Dates (YYYY-MM-DD) explicitly marked as no-spend wins. */
  noSpendDays: string[];
  budget: Budget | null;
  /** Monthly take-home pay (after tax), from onboarding. */
  income: number | null;
  /** Where the money goes today, per bucket per month — the "now" to the plan. */
  baseline: Budget | null;
  settings: Settings;
}

// ─── Static descriptors ───────────────────────────────────────────────────────

export const FEELINGS: {
  key: Feeling;
  emoji: string;
  label: string;
  hint: string;
}[] = [
  { key: "worth-it", emoji: "😌", label: "Worth it", hint: "Aligned with what I value" },
  { key: "joy", emoji: "😊", label: "Joy", hint: "This genuinely made me happy" },
  { key: "meh", emoji: "😐", label: "Meh", hint: "Neutral, just needed it" },
  { key: "impulse", emoji: "😬", label: "Impulse", hint: "Didn't plan this" },
  { key: "regret", emoji: "😔", label: "Regret", hint: "Wish I hadn't" },
];

export const BUCKETS: {
  key: Bucket;
  emoji: string;
  label: string;
  side: Side;
  blurb: string;
}[] = [
  { key: "necessities", emoji: "🏠", label: "Necessities", side: "need", blurb: "Rent, food, bills" },
  { key: "guilt-free", emoji: "🎉", label: "Guilt-free", side: "want", blurb: "Fun, no shame" },
  { key: "investments", emoji: "📈", label: "Investments", side: "wealth", blurb: "Money that grows" },
  { key: "savings", emoji: "🎯", label: "Savings Goals", side: "wealth", blurb: "Set aside for dreams" },
];

/** Target = the share of *spending* (Need+Want) that should be Need. */
export const DIFFICULTIES: {
  key: Difficulty;
  needTarget: number;
  label: string;
  ratio: string;
  blurb: string;
}[] = [
  { key: "easy", needTarget: 0.6, label: "Easy", ratio: "60 : 40", blurb: "Build the habit, no pressure" },
  { key: "recommended", needTarget: 0.7, label: "Recommended", ratio: "70 : 30", blurb: "Where real change shows" },
  { key: "hard", needTarget: 0.8, label: "Hard", ratio: "80 : 20", blurb: "Serious about change" },
];

// Lookups fall back to the first entry rather than crashing — saved data from
// an older/newer app version must never brick the UI. (Load-time validation in
// the store filters unknown keys out before they get here.)
export const bucketOf = (k: Bucket) => BUCKETS.find((b) => b.key === k) ?? BUCKETS[0];
export const feelingOf = (k: Feeling) => FEELINGS.find((f) => f.key === k) ?? FEELINGS[0];
export const difficultyOf = (k: Difficulty) =>
  DIFFICULTIES.find((d) => d.key === k) ?? DIFFICULTIES[1];

export const isBucket = (v: unknown): v is Bucket => BUCKETS.some((b) => b.key === v);
export const isFeeling = (v: unknown): v is Feeling => FEELINGS.some((f) => f.key === v);
export const isDifficulty = (v: unknown): v is Difficulty =>
  DIFFICULTIES.some((d) => d.key === v);

/** A four-bucket record of non-negative numbers, or null. */
export function sanitizeBudget(b: unknown): Budget | null {
  if (!b || typeof b !== "object") return null;
  const r = b as Record<string, unknown>;
  const keys = ["necessities", "guilt-free", "investments", "savings"] as const;
  if (!keys.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]) && (r[k] as number) >= 0))
    return null;
  return Object.fromEntries(keys.map((k) => [k, r[k]])) as unknown as Budget;
}
