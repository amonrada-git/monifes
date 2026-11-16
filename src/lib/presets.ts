import { AppData, Bucket, Feeling } from "./types";
import { dayKey } from "./compute";

export type PresetName = "empty" | "some" | "budget";

export const PRESET_LABELS: { key: PresetName; label: string; blurb: string }[] = [
  { key: "empty", label: "No data", blurb: "Fresh install — blank slate" },
  { key: "some", label: "Some data", blurb: "A week of spends & a no-spend win" },
  { key: "budget", label: "Data + budget", blurb: "Same, with the 4 buckets planned" },
];

function iso(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function ago(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return dayKey(d);
}

// [daysAgo, hour, amount, bucket, feeling, label]
const DEMO_SPENDS: [number, number, number, Bucket, Feeling, string][] = [
  [0, 8, 480, "guilt-free", "joy", "Morning coffee"],
  [0, 12, 3240, "necessities", "meh", "Groceries"],
  [1, 13, 980, "necessities", "worth-it", "Lunch"],
  [1, 21, 6800, "guilt-free", "impulse", "New game"],
  // daysAgo 2 is the no-spend win
  [3, 10, 85000, "necessities", "worth-it", "Rent"],
  [3, 22, 4500, "guilt-free", "regret", "Late-night drinks"],
  [4, 15, 1650, "guilt-free", "worth-it", "Book"],
  [4, 9, 10000, "investments", "worth-it", "Index fund"],
  [5, 9, 5000, "savings", "worth-it", "Trip fund"],
];

/** Build a full AppData snapshot for a debug preset (dates relative to today). */
export function makePreset(name: PresetName): AppData {
  const base: AppData = {
    spends: [],
    noSpendDays: [],
    budget: null,
    settings: { currency: "JPY", difficulty: "recommended" },
  };
  if (name === "empty") return base;

  const spends = DEMO_SPENDS.map(([daysAgo, hour, amount, bucket, feeling, label], i) => ({
    id: `demo-${i}`,
    amount,
    bucket,
    feeling,
    label,
    createdAt: iso(daysAgo, hour),
  }));

  const withData: AppData = { ...base, spends, noSpendDays: [ago(2)] };
  if (name === "some") return withData;

  return {
    ...withData,
    budget: {
      necessities: 120000,
      "guilt-free": 50000,
      investments: 30000,
      savings: 20000,
    },
  };
}
