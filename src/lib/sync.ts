import { supabase } from "./supabase";
import {
  AppData,
  Budget,
  Settings,
  Spend,
  isBucket,
  isDifficulty,
  isFeeling,
  sanitizeBudget,
} from "./types";

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
  | { t: "profile"; patch: ProfilePatch }
  /** Wipe and replace everything — debug presets / reset only. */
  | { t: "replace"; data: AppData };

export type ProfilePatch = Partial<Settings> & {
  budget?: Budget | null;
  income?: number | null;
  baseline?: Budget | null;
};

export function applyOp(d: AppData, op: Op): AppData {
  switch (op.t) {
    case "spend.put": {
      // Keep newest-first by inserting in place — no full re-sort per op, so
      // replaying a long queue stays cheap.
      const rest = d.spends.filter((s) => s.id !== op.spend.id);
      const at = rest.findIndex((s) => s.createdAt <= op.spend.createdAt);
      rest.splice(at === -1 ? rest.length : at, 0, op.spend);
      return { ...d, spends: rest };
    }
    case "spend.delete":
      return { ...d, spends: d.spends.filter((s) => s.id !== op.id) };
    case "day.add":
      return d.noSpendDays.includes(op.day) ? d : { ...d, noSpendDays: [...d.noSpendDays, op.day] };
    case "day.remove":
      return { ...d, noSpendDays: d.noSpendDays.filter((x) => x !== op.day) };
    case "profile": {
      const { budget, income, baseline, ...settings } = op.patch;
      return {
        ...d,
        settings: { ...d.settings, ...settings },
        budget: budget === undefined ? d.budget : budget,
        income: income === undefined ? d.income : income,
        baseline: baseline === undefined ? d.baseline : baseline,
      };
    }
    case "replace":
      return op.data;
    default:
      // An op from a newer/older app version — skip it rather than crash.
      return d;
  }
}

const OP_TYPES = new Set(["spend.put", "spend.delete", "day.add", "day.remove", "profile", "replace"]);

/** Shape-check an op read back from storage (the queue is untrusted input). */
export function isOp(v: unknown): v is Op {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.t !== "string" || !OP_TYPES.has(o.t)) return false;
  switch (o.t) {
    case "spend.put":
      return !!o.spend && typeof o.spend === "object";
    case "spend.delete":
      return typeof o.id === "string";
    case "day.add":
    case "day.remove":
      return typeof o.day === "string";
    case "profile":
      return !!o.patch && typeof o.patch === "object";
    case "replace":
      return !!o.data && typeof o.data === "object";
  }
  return false;
}

// ─── Server writes ────────────────────────────────────────────────────────────

function db() {
  if (!supabase) throw new Error("Supabase isn't configured");
  return supabase;
}

/**
 * A write the server will never accept (bad data, failed check). Retrying
 * can't help, so it's dropped instead of blocking everything queued behind it.
 */
class Rejected extends Error {}

type Result = { error: { message: string; code?: string } | null; status: number };

function check({ error, status }: Result) {
  if (!error) return;
  // 4xx means "this request is wrong" — except auth/timeouts/rate limits,
  // which clear up on their own and are worth retrying.
  const permanent = status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status);
  throw permanent ? new Rejected(`${error.code ?? status}: ${error.message}`) : error;
}

/** Throws on failure so the caller keeps the op queued for a retry. */
async function send(userId: string, op: Op): Promise<void> {
  const sb = db();
  switch (op.t) {
    case "spend.put":
      return check(await sb.from("spends").upsert(toSpendRow(userId, op.spend)));
    case "spend.delete":
      return check(await sb.from("spends").delete().eq("id", op.id));
    case "day.add":
      return check(
        await sb
          .from("no_spend_days")
          .upsert({ user_id: userId, day: op.day }, { ignoreDuplicates: true }),
      );
    case "day.remove":
      return check(
        await sb.from("no_spend_days").delete().eq("user_id", userId).eq("day", op.day),
      );
    case "profile":
      // Upsert only writes the columns in the patch, and creates the row if missing.
      return check(await sb.from("profiles").upsert({ id: userId, ...op.patch }));
    case "replace": {
      const { data } = op;
      check(await sb.from("spends").delete().eq("user_id", userId));
      check(await sb.from("no_spend_days").delete().eq("user_id", userId));
      check(
        await sb.from("profiles").upsert({
          id: userId,
          ...data.settings,
          budget: data.budget,
          income: data.income,
          baseline: data.baseline,
        }),
      );
      if (data.spends.length)
        check(await sb.from("spends").insert(data.spends.map((s) => toSpendRow(userId, s))));
      if (data.noSpendDays.length)
        check(
          await sb
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
 * Send queued ops in order, stopping at the first failure that might clear up
 * (later ops may depend on earlier ones). Returns how many ops are finished —
 * sent, or rejected for good and dropped.
 */
export async function flush(userId: string, queue: Op[]): Promise<number> {
  let i = 0;
  for (; i < queue.length; i++) {
    try {
      await send(userId, queue[i]);
    } catch (err) {
      if (err instanceof Rejected) {
        console.error("[monifes] server rejected a change, dropping it", err.message, queue[i]);
        continue;
      }
      console.warn("[monifes] sync paused, will retry", err);
      break;
    }
  }
  return i;
}

// ─── Server read ──────────────────────────────────────────────────────────────

const PAGE = 1000; // Supabase's default max rows per request

type SpendRow = {
  id: string;
  amount: number | string;
  bucket: string;
  feeling: string;
  label: string | null;
  created_at: string;
};

/** Read every row, page by page — a single request silently stops at 1000. */
async function fetchPaged<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Load everything for the signed-in person. Throws if offline / failing. */
export async function fetchAll(): Promise<AppData & { fresh: boolean }> {
  const sb = db();
  const [profile, spends, days] = await Promise.all([
    // "*" rather than a column list: an account whose database is missing a
    // newer column (income, baseline) still loads instead of failing outright.
    sb.from("profiles").select("*").maybeSingle(),
    fetchPaged<SpendRow>((from, to) =>
      sb
        .from("spends")
        .select("id, amount, bucket, feeling, label, created_at")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    fetchPaged<{ day: string }>((from, to) =>
      sb.from("no_spend_days").select("day").order("day").range(from, to),
    ),
  ]);
  if (profile.error) throw profile.error;

  const p = profile.data;
  return {
    settings: {
      currency: typeof p?.currency === "string" ? p.currency : "JPY",
      difficulty: isDifficulty(p?.difficulty) ? p.difficulty : "recommended",
    },
    budget: sanitizeBudget(p?.budget),
    income: typeof p?.income === "number" || typeof p?.income === "string" ? Number(p.income) || null : null,
    baseline: sanitizeBudget(p?.baseline),
    spends: spends
      .filter((r) => isBucket(r.bucket) && isFeeling(r.feeling))
      .map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        bucket: r.bucket as Spend["bucket"],
        feeling: r.feeling as Spend["feeling"],
        label: r.label ?? undefined,
        // Normalise to the same ISO shape the device writes, so string sorts agree.
        createdAt: new Date(r.created_at).toISOString(),
      })),
    noSpendDays: days.map((r) => r.day),
    // Nothing on the account yet: safe to adopt the guest's settings wholesale.
    fresh: !p && spends.length === 0 && days.length === 0,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);
