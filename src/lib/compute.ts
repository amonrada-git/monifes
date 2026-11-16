import { AppData, BUCKETS, Spend, bucketOf, difficultyOf } from "./types";

// ─── Dates (local-time, YYYY-MM-DD) ───────────────────────────────────────────

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthKey(d: Date): string {
  return dayKey(d).slice(0, 7); // YYYY-MM
}

// ─── Need : Want ──────────────────────────────────────────────────────────────

export interface NeedWant {
  need: number; // amount
  want: number; // amount
  total: number;
  needPct: number; // 0..1 (of need+want)
  wantPct: number;
}

/** The Need:Want split of *spending* (Necessities + Guilt-free). Wealth sits outside. */
export function needWant(spends: Spend[]): NeedWant {
  let need = 0;
  let want = 0;
  for (const s of spends) {
    const side = bucketOf(s.bucket).side;
    if (side === "need") need += s.amount;
    else if (side === "want") want += s.amount;
  }
  const total = need + want;
  return {
    need,
    want,
    total,
    // With nothing logged, both read 0% — an honest blank slate.
    needPct: total ? need / total : 0,
    wantPct: total ? want / total : 0,
  };
}

/** Totals per bucket, e.g. for the plan / insights. */
export function bucketTotals(spends: Spend[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of BUCKETS) out[b.key] = 0;
  for (const s of spends) out[s.bucket] += s.amount;
  return out;
}

export function spendsInMonth(spends: Spend[], ref: Date): Spend[] {
  const mk = monthKey(ref);
  return spends.filter((s) => monthKey(new Date(s.createdAt)) === mk);
}

/**
 * Progress toward the chosen target, 0..1.
 * You start wherever you are and climb; hitting the target reads as 100%.
 * Distance is measured against a soft floor (everything is Want = 0%).
 */
export function targetProgress(nw: NeedWant, difficulty: AppData["settings"]["difficulty"]): number {
  const target = difficultyOf(difficulty).needTarget;
  if (nw.total === 0) return 0;
  if (nw.needPct >= target) return 1;
  return Math.max(0, Math.min(1, nw.needPct / target));
}

// ─── Check-ins, streak & the plant ────────────────────────────────────────────

/** Every distinct day you either logged a spend or marked a no-spend win. */
export function checkedInDays(data: AppData): Set<string> {
  const days = new Set<string>(data.noSpendDays);
  for (const s of data.spends) days.add(dayKey(new Date(s.createdAt)));
  return days;
}

export function hasCheckedInToday(data: AppData, today = new Date()): boolean {
  return checkedInDays(data).has(dayKey(today));
}

export function isNoSpendDay(data: AppData, day: string): boolean {
  return data.noSpendDays.includes(day) && !data.spends.some((s) => dayKey(new Date(s.createdAt)) === day);
}

/** Consecutive days with a check-in, counting back from today (or yesterday). */
export function streak(data: AppData, today = new Date()): number {
  const days = checkedInDays(data);
  let count = 0;
  const cursor = new Date(today);
  // Allow the streak to stand if today isn't done yet but yesterday was.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

// ─── The month as dots ────────────────────────────────────────────────────────

export type DayDot = "spent" | "no-spend" | "quiet" | "future";

/** One dot per day of the month: filled = spent, ring = no-spend win, faint = quiet. */
export function monthDots(data: AppData, now = new Date()): DayDot[] {
  const todayDate = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mk = monthKey(now);
  const spendDaySet = new Set(data.spends.map((s) => dayKey(new Date(s.createdAt))));
  const noSpendSet = new Set(data.noSpendDays);
  return Array.from({ length: daysInMonth }, (_, i) => {
    const key = `${mk}-${String(i + 1).padStart(2, "0")}`;
    if (i + 1 > todayDate) return "future";
    if (spendDaySet.has(key)) return "spent";
    if (noSpendSet.has(key)) return "no-spend";
    return "quiet";
  });
}

export interface PlantState {
  /** 0..5 visual growth stage. */
  stage: number;
  /** Growth points accumulated. */
  points: number;
  label: string;
}

const PLANT_LABELS = ["Seed", "Sprout", "Seedling", "Growing", "Blooming", "Flourishing"];

/**
 * The plant grows from check-ins. A normal check-in = 1 drop; a no-spend day = 2
 * (not spending is how wealth is built — worth celebrating extra).
 */
export function plant(data: AppData): PlantState {
  const noSpend = new Set(data.noSpendDays);
  const spendDays = new Set(data.spends.map((s) => dayKey(new Date(s.createdAt))));
  let points = 0;
  for (const d of checkedInDays(data)) {
    points += noSpend.has(d) && !spendDays.has(d) ? 2 : 1;
  }
  // Gentle curve: each stage a little further than the last.
  const thresholds = [0, 1, 4, 9, 16, 30];
  let stage = 0;
  for (let i = 0; i < thresholds.length; i++) if (points >= thresholds[i]) stage = i;
  return { stage, points, label: PLANT_LABELS[stage] };
}
