import { supabase } from "./supabase";
import { AppData, Budget, Settings, Spend, isBucket, isDifficulty, isFeeling } from "./types";

// ─── Ops: every change to the data, as a small idempotent record ──────────────
//
// The same op is (1) applied to in-memory state immediately, so the UI never
// waits on the network, and (2) queued for the server when signed in. Ops are
// idempotent (upserts / deletes by key), so retrying after a dropped
// connection can never double-log a spend.

export type Op =
  | { t: "spend.put"; spend: Spend }
  | { t: "spend.delete"; id: string }
  | { t: "day.add"; day: string }
  | { t: "day.remove"; day: string }
  | { t: "profile"; patch: Partial<Settings> & { budget?: Budget | null } }
  /** Wipe and replace everything — debug presets / reset only. */
  | { t: "replace"; data: AppData };

export function applyOp(d: AppData, op: Op): AppData {
  switch (op.t) {
    case "spend.put":
      return {
        ...d,
        spends: [op.spend, ...d.spends.filter((s) => s.id !== op.spend.id)].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      };
    case "spend.delete":
      return { ...d, spends: d.spends.filter((s) => s.id !== op.id) };
    case "day.add":
      return d.noSpendDays.includes(op.day) ? d : { ...d, noSpendDays: [...d.noSpendDays, op.day] };
    case "day.remove":
      return { ...d, noSpendDays: d.noSpendDays.filter((x) => x !== op.day) };
    case "profile": {
      const { budget, ...settings } = op.patch;
      return {
        ...d,
        settings: { ...d.settings, ...settings },
        budget: budget === undefined ? d.budget : budget,
      };
    }
    case "replace":
      return op.data;
  }
}

// ─── Server writes ────────────────────────────────────────────────────────────

/** Throws on failure so the caller keeps the op queued for a retry. */
async function send(userId: string, op: Op): Promise<void> {
  const check = ({ error }: { error: unknown }) => {
    if (error) throw error;
  };

  switch (op.t) {
    case "spend.put":
      return check(await supabase.from("spends").upsert(toSpendRow(userId, op.spend)));
    case "spend.delete":
      return check(await supabase.from("spends").delete().eq("id", op.id));
    case "day.add":
      return check(
        await supabase
          .from("no_spend_days")
          .upsert({ user_id: userId, day: op.day }, { ignoreDuplicates: true }),
      );
    case "day.remove":
      return check(
        await supabase.from("no_spend_days").delete().eq("user_id", userId).eq("day", op.day),
      );
    case "profile":
      // Upsert only writes the columns in the patch, and creates the row if missing.
      return check(await supabase.from("profiles").upsert({ id: userId, ...op.patch }));
    case "replace": {
      const { data } = op;
      check(await supabase.from("spends").delete().eq("user_id", userId));
      check(await supabase.from("no_spend_days").delete().eq("user_id", userId));
      check(
        await supabase
          .from("profiles")
          .upsert({ id: userId, ...data.settings, budget: data.budget }),
      );
      if (data.spends.length)
        check(await supabase.from("spends").insert(data.spends.map((s) => toSpendRow(userId, s))));
      if (data.noSpendDays.length)
        check(
          await supabase
            .from("no_spend_days")
            .insert(data.noSpendDays.map((day) => ({ user_id: userId, day }))),
        );
      return;
    }
  }
}

function toSpendRow(userId: string, s: Spend) {
  return {
    id: s.id,
    user_id: userId,
    amount: s.amount,
    bucket: s.bucket,
    feeling: s.feeling,
    label: s.label ?? null,
    created_at: s.createdAt,
  };
}

/**
 * Send queued ops in order, stopping at the first failure (later ops may
 * depend on earlier ones). Returns the ops still waiting.
 */
export async function flush(userId: string, queue: Op[]): Promise<Op[]> {
  let i = 0;
  try {
    for (; i < queue.length; i++) await send(userId, queue[i]);
  } catch (err) {
    console.warn("[monifes] sync paused, will retry", err);
  }
  return queue.slice(i);
}

// ─── Server read ──────────────────────────────────────────────────────────────

/** Load everything for the signed-in person. Throws if offline / failing. */
export async function fetchAll(): Promise<AppData & { fresh: boolean }> {
  const [profile, spends, days] = await Promise.all([
    supabase.from("profiles").select("currency, difficulty, budget").maybeSingle(),
    supabase
      .from("spends")
      .select("id, amount, bucket, feeling, label, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("no_spend_days").select("day"),
  ]);
  if (profile.error) throw profile.error;
  if (spends.error) throw spends.error;
  if (days.error) throw days.error;

  const p = profile.data;
  return {
    settings: {
      currency: typeof p?.currency === "string" ? p.currency : "JPY",
      difficulty: isDifficulty(p?.difficulty) ? p.difficulty : "recommended",
    },
    budget: (p?.budget as Budget | null) ?? null,
    spends: spends.data
      .filter((r) => isBucket(r.bucket) && isFeeling(r.feeling))
      .map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        bucket: r.bucket,
        feeling: r.feeling,
        label: r.label ?? undefined,
        // Normalise to the same ISO shape the device writes, so string sorts agree.
        createdAt: new Date(r.created_at).toISOString(),
      })),
    noSpendDays: days.data.map((r) => r.day as string),
    // Nothing on the account yet: safe to adopt the guest's settings wholesale.
    fresh: !p && spends.data.length === 0 && days.data.length === 0,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);
