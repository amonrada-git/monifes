"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AppData,
  Budget,
  Bucket,
  Feeling,
  Settings,
  Spend,
  isBucket,
  isDifficulty,
  isFeeling,
} from "./types";
import { dayKey } from "./compute";
import { supabase } from "./supabase";
import { Op, applyOp, fetchAll, flush, isUuid } from "./sync";
import { makeId } from "./utils";

// Guest data (not signed in) lives here, exactly as before accounts existed.
const STORAGE_KEY = "monifes:data:v1";
// Signed in: a per-account cache (instant load, works offline) and the queue
// of changes not yet confirmed by the server.
const cacheKey = (uid: string) => `monifes:cache:${uid}`;
const queueKey = (uid: string) => `monifes:queue:${uid}`;

const DEFAULT_DATA: AppData = {
  spends: [],
  noSpendDays: [],
  budget: null,
  settings: { currency: "JPY", difficulty: "recommended" },
};

export interface Account {
  id: string;
  email: string;
}

/** saved = server has everything · saving = in flight · waiting = offline, will retry */
export type SyncState = "saved" | "saving" | "waiting";

interface StoreValue {
  data: AppData;
  ready: boolean;
  /** null while browsing as a guest. */
  account: Account | null;
  sync: SyncState;
  signOut: () => Promise<void>;
  addSpend: (input: { amount: number; bucket: Bucket; feeling: Feeling; label?: string }) => void;
  deleteSpend: (id: string) => void;
  markNoSpendDay: (day?: string) => void;
  unmarkNoSpendDay: (day: string) => void;
  setBudget: (budget: Budget | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Replace everything at once — used by the debug presets. */
  loadData: (data: AppData) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/**
 * Validate untrusted persisted data field-by-field. Saved data from a hand
 * edit or a different app version must degrade gracefully, never crash.
 */
function sanitize(parsed: Partial<AppData>): AppData {
  const spends: Spend[] = Array.isArray(parsed.spends)
    ? parsed.spends.filter(
        (s): s is Spend =>
          !!s &&
          typeof s === "object" &&
          typeof s.id === "string" &&
          typeof s.amount === "number" &&
          Number.isFinite(s.amount) &&
          s.amount > 0 &&
          isBucket(s.bucket) &&
          isFeeling(s.feeling) &&
          typeof s.createdAt === "string" &&
          !Number.isNaN(new Date(s.createdAt).getTime()),
      )
    : [];

  const noSpendDays = Array.isArray(parsed.noSpendDays)
    ? parsed.noSpendDays.filter((d): d is string => typeof d === "string")
    : [];

  const b = parsed.budget;
  const budget: Budget | null =
    b &&
    typeof b === "object" &&
    ["necessities", "guilt-free", "investments", "savings"].every(
      (k) => typeof (b as unknown as Record<string, unknown>)[k] === "number",
    )
      ? (b as Budget)
      : null;

  const s = parsed.settings;
  const settings: Settings = {
    currency:
      s && typeof s.currency === "string" ? s.currency : DEFAULT_DATA.settings.currency,
    difficulty:
      s && isDifficulty(s.difficulty) ? s.difficulty : DEFAULT_DATA.settings.difficulty,
  };

  return { spends, noSpendDays, budget, settings };
}

// ─── localStorage helpers (all failures are non-fatal) ────────────────────────

function read<T>(key: string, parse: (v: unknown) => T): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? parse(JSON.parse(raw)) : null;
  } catch {
    return null; // corrupt or unavailable storage
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

const loadGuest = () => read(STORAGE_KEY, (v) => sanitize(v as Partial<AppData>)) ?? DEFAULT_DATA;
const loadCache = (uid: string) => read(cacheKey(uid), (v) => sanitize(v as Partial<AppData>));
const loadQueue = (uid: string) =>
  read(queueKey(uid), (v) => (Array.isArray(v) ? (v as Op[]) : [])) ?? [];

function hasGuestData(g: AppData): boolean {
  return (
    g.spends.length > 0 ||
    g.noSpendDays.length > 0 ||
    g.budget !== null ||
    g.settings.currency !== DEFAULT_DATA.settings.currency ||
    g.settings.difficulty !== DEFAULT_DATA.settings.difficulty
  );
}

/**
 * Turn what a guest logged on this device into ops for their account. Spends
 * and no-spend days always carry over; settings and budget only when the
 * account is brand new, so signing in on a second phone never overwrites the
 * plan you already made on the first.
 */
function guestOps(g: AppData, adoptProfile: boolean): Op[] {
  const ops: Op[] = g.spends.map((s) => ({
    t: "spend.put",
    spend: isUuid(s.id) ? s : { ...s, id: makeId() },
  }));
  for (const day of g.noSpendDays) ops.push({ t: "day.add", day });
  if (adoptProfile) ops.push({ t: "profile", patch: { ...g.settings, budget: g.budget } });
  return ops;
}

const emptySubscribe = () => () => {};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(loadGuest);
  const [account, setAccount] = useState<Account | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);

  // Refs mirror the async-facing state so callbacks never act on a stale account.
  const accountRef = useRef<Account | null>(null);
  const queueRef = useRef<Op[]>([]);
  const flushingRef = useRef(false);

  // false during server render & hydration, true right after — keeps the
  // server-rendered skeleton and the first client paint in agreement.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  // Also wait for the saved session, so a signed-in person never sees a flash
  // of the empty guest state.
  const ready = hydrated && authReady;

  // Persist on change — to the account cache when signed in, else guest storage.
  useEffect(() => {
    if (!ready) return;
    write(account ? cacheKey(account.id) : STORAGE_KEY, data);
  }, [data, ready, account]);

  const setQueue = useCallback((uid: string, q: Op[]) => {
    queueRef.current = q;
    if (q.length) write(queueKey(uid), q);
    else remove(queueKey(uid));
    setPending(q.length);
  }, []);

  /** Send everything queued. Safe to call any time; concurrent calls coalesce. */
  const runFlush = useCallback(async () => {
    const acct = accountRef.current;
    if (!acct || flushingRef.current || !queueRef.current.length) return;
    flushingRef.current = true;
    setFlushing(true);
    try {
      while (queueRef.current.length) {
        const batch = queueRef.current;
        const rest = await flush(acct.id, batch);
        if (accountRef.current?.id !== acct.id) return; // signed out mid-flight
        // Ops added while this batch was in flight stay queued behind it.
        setQueue(acct.id, queueRef.current.slice(batch.length - rest.length));
        if (rest.length) break; // offline or failing — retry later
      }
    } finally {
      flushingRef.current = false;
      setFlushing(false);
    }
  }, [setQueue]);

  /** Switch the whole app to an account (or back to guest). */
  const enter = useCallback(
    async (next: Account | null) => {
      accountRef.current = next;

      if (!next) {
        queueRef.current = [];
        setPending(0);
        setAccount(null);
        setData(loadGuest());
        setAuthReady(true);
        return;
      }

      const uid = next.id;
      queueRef.current = loadQueue(uid);
      setPending(queueRef.current.length);
      setAccount(next);
      // Show the cached copy right away; the server copy replaces it below.
      setData(queueRef.current.reduce(applyOp, loadCache(uid) ?? DEFAULT_DATA));
      setAuthReady(true);

      await runFlush();

      let remote: (AppData & { fresh: boolean }) | null = null;
      try {
        remote = await fetchAll();
      } catch (err) {
        console.warn("[monifes] couldn't load account, using this device's copy", err);
      }
      if (accountRef.current?.id !== uid) return;

      // Bring over anything logged as a guest on this device, then clear it —
      // the ops are safely in the account's queue before the guest copy goes.
      const guest = loadGuest();
      if (hasGuestData(guest)) {
        const ops = guestOps(guest, remote?.fresh ?? false);
        setQueue(uid, [...queueRef.current, ...ops]);
        remove(STORAGE_KEY);
        if (!remote) setData((d) => ops.reduce(applyOp, d));
      }

      // Server truth plus whatever hasn't reached the server yet.
      if (remote) setData(queueRef.current.reduce(applyOp, remote as AppData));
      await runFlush();
    },
    [runFlush, setQueue],
  );

  // Follow the sign-in state. Supabase fires INITIAL_SESSION once on start.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      const next = u ? { id: u.id, email: u.email ?? "" } : null;
      // Token refreshes re-fire with the same person — nothing to switch.
      if ((next?.id ?? null) === (accountRef.current?.id ?? null)) {
        setAuthReady(true);
        return;
      }
      // Supabase calls must not run inside this callback (it holds an auth
      // lock), so step out of it first.
      setTimeout(() => void enter(next), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [enter]);

  // Retry waiting changes when the connection or the app comes back.
  useEffect(() => {
    if (!pending) return;
    const retry = () => void runFlush();
    const onVisible = () => document.visibilityState === "visible" && retry();
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(retry, 30_000);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [pending, runFlush]);

  /** Every change goes through here: apply now, queue for the server if signed in. */
  const commit = useCallback(
    (op: Op) => {
      setData((d) => applyOp(d, op));
      const acct = accountRef.current;
      if (!acct) return;
      setQueue(acct.id, [...queueRef.current, op]);
      void runFlush();
    },
    [runFlush, setQueue],
  );

  const signOut = useCallback(async () => {
    const acct = accountRef.current;
    if (!acct) return;
    await runFlush(); // best effort: get the last changes up first
    await supabase.auth.signOut({ scope: "local" });
    // Don't leave someone's spending history readable on a shared phone. Any
    // still-unsent changes stay queued and go up next time they sign in here.
    remove(cacheKey(acct.id));
  }, [runFlush]);

  const addSpend = useCallback<StoreValue["addSpend"]>(
    (input) => {
      // Note: any "no-spend" mark for today is deliberately kept. The compute
      // layer already ignores it while a spend exists, so if the spend is later
      // deleted the day gracefully becomes a no-spend win again.
      commit({
        t: "spend.put",
        spend: {
          id: makeId(),
          amount: input.amount,
          bucket: input.bucket,
          feeling: input.feeling,
          label: input.label?.trim() || undefined,
          createdAt: new Date().toISOString(),
        },
      });
    },
    [commit],
  );

  const deleteSpend = useCallback<StoreValue["deleteSpend"]>(
    (id) => commit({ t: "spend.delete", id }),
    [commit],
  );

  const markNoSpendDay = useCallback<StoreValue["markNoSpendDay"]>(
    (day) => commit({ t: "day.add", day: day ?? dayKey(new Date()) }),
    [commit],
  );

  const unmarkNoSpendDay = useCallback<StoreValue["unmarkNoSpendDay"]>(
    (day) => commit({ t: "day.remove", day }),
    [commit],
  );

  const setBudget = useCallback<StoreValue["setBudget"]>(
    (budget) => commit({ t: "profile", patch: { budget } }),
    [commit],
  );

  const updateSettings = useCallback<StoreValue["updateSettings"]>(
    (patch) => commit({ t: "profile", patch }),
    [commit],
  );

  const loadData = useCallback((next: AppData) => commit({ t: "replace", data: next }), [commit]);

  const reset = useCallback(() => commit({ t: "replace", data: DEFAULT_DATA }), [commit]);

  const sync: SyncState = pending === 0 ? "saved" : flushing ? "saving" : "waiting";

  return (
    <StoreContext.Provider
      value={{
        data,
        ready,
        account,
        sync,
        signOut,
        addSpend,
        deleteSpend,
        markNoSpendDay,
        unmarkNoSpendDay,
        setBudget,
        updateSettings,
        loadData,
        reset,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
