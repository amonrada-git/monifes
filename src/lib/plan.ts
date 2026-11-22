import { Budget, BUCKETS, Bucket, Difficulty, difficultyOf } from "./types";

// ─── The suggested plan ───────────────────────────────────────────────────────
//
// From one number — monthly take-home pay — to a four-bucket plan. Spending
// (Necessities + Guilt-free) takes most of it and is split by the person's
// Need:Want target; what's left builds wealth, half invested, half saved
// toward goals. A harder target spends a little less overall, so each level
// also builds more.

/** Share of income for spending (Necessities + Guilt-free), by difficulty. */
const SPEND_SHARE: Record<Difficulty, number> = {
  easy: 0.85,
  recommended: 0.8,
  hard: 0.75,
};

/** Round plan amounts to numbers a person would actually set aside. */
function roundingStep(currency: string): number {
  if (currency === "JPY") return 1000;
  if (currency === "THB") return 100;
  return 10;
}

export function suggestPlan(income: number, difficulty: Difficulty, currency: string): Budget {
  const step = roundingStep(currency);
  const round = (n: number) => Math.round(n / step) * step;
  const spend = income * SPEND_SHARE[difficulty];
  const need = difficultyOf(difficulty).needTarget;

  const necessities = round(spend * need);
  const guiltFree = round(spend * (1 - need));
  const investments = round((income - spend) / 2);
  // Savings takes the rounding remainder, so the plan always adds up to income.
  const savings = Math.max(0, income - necessities - guiltFree - investments);
  return { necessities, "guilt-free": guiltFree, investments, savings };
}

export const wealthOf = (b: Budget) => b.investments + b.savings;
export const spendingOf = (b: Budget) => b.necessities + b["guilt-free"];
export const totalOf = (b: Budget) => spendingOf(b) + wealthOf(b);

// ─── The ring: income as one circle ───────────────────────────────────────────

export type PlanKind = Bucket;
export type PlanPart = { kind: PlanKind; share: number };

/**
 * Each bucket's share of the ring, in bucket order. Whatever they leave of
 * income stays as the bare track. When the buckets add up to more than income
 * (spending more than you earn) the ring shows their shares of that larger
 * total, so it never laps itself.
 */
export function planParts(b: Budget, income: number): PlanPart[] {
  const total = Math.max(income, totalOf(b), 1);
  return BUCKETS.map((x) => ({ kind: x.key, share: Math.max(0, b[x.key]) / total }));
}

/** Need share of spending (0..1), or null when nothing is spent. */
export function needShare(b: Budget): number | null {
  const s = spendingOf(b);
  return s > 0 ? b.necessities / s : null;
}
