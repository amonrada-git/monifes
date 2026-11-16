"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

const STORAGE_KEY = "monifes:data:v1";

const DEFAULT_DATA: AppData = {
  spends: [],
  noSpendDays: [],
  budget: null,
  settings: { currency: "JPY", difficulty: "recommended" },
};

interface StoreValue {
  data: AppData;
  ready: boolean;
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

function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Very old browsers only — random enough for a personal on-device log.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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

/** Read saved data synchronously on the client; defaults on the server. */
function loadInitial(): AppData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw) as Partial<AppData>);
  } catch {
    // Corrupt or unavailable storage — fall back to defaults.
  }
  return DEFAULT_DATA;
}

const emptySubscribe = () => () => {};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(loadInitial);
  // false during server render & hydration, true right after — keeps the
  // server-rendered skeleton and the first client paint in agreement.
  const ready = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Persist on change.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota / private-mode errors.
    }
  }, [data, ready]);

  const addSpend = useCallback<StoreValue["addSpend"]>((input) => {
    const spend: Spend = {
      id: makeId(),
      amount: input.amount,
      bucket: input.bucket,
      feeling: input.feeling,
      label: input.label?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    // Note: any "no-spend" mark for today is deliberately kept. The compute
    // layer already ignores it while a spend exists, so if the spend is later
    // deleted the day gracefully becomes a no-spend win again.
    setData((d) => ({ ...d, spends: [spend, ...d.spends] }));
  }, []);

  const deleteSpend = useCallback<StoreValue["deleteSpend"]>((id) => {
    setData((d) => ({ ...d, spends: d.spends.filter((s) => s.id !== id) }));
  }, []);

  const markNoSpendDay = useCallback<StoreValue["markNoSpendDay"]>((day) => {
    const key = day ?? dayKey(new Date());
    setData((d) =>
      d.noSpendDays.includes(key) ? d : { ...d, noSpendDays: [...d.noSpendDays, key] },
    );
  }, []);

  const unmarkNoSpendDay = useCallback<StoreValue["unmarkNoSpendDay"]>((day) => {
    setData((d) => ({ ...d, noSpendDays: d.noSpendDays.filter((x) => x !== day) }));
  }, []);

  const setBudget = useCallback<StoreValue["setBudget"]>((budget) => {
    setData((d) => ({ ...d, budget }));
  }, []);

  const updateSettings = useCallback<StoreValue["updateSettings"]>((patch) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const loadData = useCallback((next: AppData) => setData(next), []);

  const reset = useCallback(() => setData(DEFAULT_DATA), []);

  return (
    <StoreContext.Provider
      value={{
        data,
        ready,
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
