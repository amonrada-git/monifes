"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileUp, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  needWant,
  spendsInMonth,
  hasCheckedInToday,
  isNoSpendDay,
  streak,
  plant,
  dayKey,
} from "@/lib/compute";
import { bucketOf, feelingOf } from "@/lib/types";
import { formatMoney } from "@/lib/currencies";
import { Card, SectionLabel } from "@/components/ui";
import { Plant } from "@/components/plant";
import { NeedWantDonut, EmptyDonut } from "@/components/need-want-donut";
import { CaptureSheet } from "@/components/capture-sheet";
import { ImportSheet } from "@/components/import-sheet";
import { Onboarding, onboardingSeen } from "@/components/onboarding";

export default function HomePage() {
  const { data, ready } = useStore();
  const [capture, setCapture] = useState(false);
  const [importing, setImporting] = useState(false);
  // idle → open (first run detected) → done. Once open it stays open until
  // finished: the flow saves the plan midway, which ends "first run".
  const [onboarding, setOnboarding] = useState<"idle" | "open" | "done">("idle");

  // Tracks the calendar day so the screen refreshes if the tab sits open
  // across midnight (updated whenever the app regains focus).
  const [todayKey, setTodayKey] = useState(() => dayKey(new Date()));
  useEffect(() => {
    const refresh = () => setTodayKey(dayKey(new Date()));
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // Derive everything once per data/day change, not five times per render.
  const derived = useMemo(() => {
    const now = new Date();
    const nw = needWant(spendsInMonth(data.spends, now));
    return {
      nw,
      checkedIn: hasCheckedInToday(data, now),
      todayNoSpend: isNoSpendDay(data, dayKey(now)),
      streakDays: streak(data, now),
      p: plant(data),
    };
  }, [data, todayKey]); // eslint-disable-line react-hooks/exhaustive-deps -- todayKey re-derives on day change

  if (!ready) return <HomeSkeleton />;

  const { nw, checkedIn, todayNoSpend, streakDays, p } = derived;
  // First run on this device, nothing logged or planned yet: start with the
  // plan reveal. Anyone who already has data (e.g. signing in on a new phone)
  // goes straight to Home.
  if (
    onboarding === "idle" &&
    !data.budget &&
    data.income === null &&
    data.spends.length === 0 &&
    !onboardingSeen()
  ) {
    setOnboarding("open");
  }
  const currency = data.settings.currency;
  const recent = data.spends.slice(0, 8);

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-5">
      {/* Top bar: plant + streak · add */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Plant stage={p.stage} size={30} />
          <span className="text-sm font-medium tnum">{streakDays}</span>
        </div>
      </header>

      {/* Budget setup prompt — gentle, dashed */}
      {!data.budget && (
        <Link href="/goals" className="mt-5 block">
          <div className="rounded-[var(--radius-card)] border border-dashed border-accent/70 p-5">
            <p className="text-[13px] font-medium text-accent">Budget</p>
            <p className="mt-1 text-[15px] font-medium leading-snug text-accent">
              Let&apos;s set up buckets for your financial health!
            </p>
          </div>
        </Link>
      )}

      {/* Recent activity — the heart of the screen; stretches to fill it.
          The daily ask lives here as a slim row until today is answered. */}
      <Card className="mt-4 flex flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>Recent activity</SectionLabel>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setImporting(true)}
              className="flex items-center gap-1 text-sm font-medium text-muted transition active:scale-95"
            >
              <FileUp size={15} strokeWidth={2} />
              Import
            </button>
            <button
              onClick={() => setCapture(true)}
              className="flex items-center gap-1 text-sm font-medium transition active:scale-95"
            >
              <Plus size={16} strokeWidth={2} />
              Add
            </button>
          </div>
        </div>

        {!checkedIn && (
          <div className="mb-4 rounded-[var(--radius-card)] bg-accent-tint px-4 py-4">
            <p className="text-sm font-medium">Any spending today?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Import your card statement and tag each purchase, or record a spend yourself.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setImporting(true)}
                className="h-9 rounded-[6px] bg-accent px-4 text-xs font-medium text-white transition active:scale-95"
              >
                Import statement
              </button>
              <button
                onClick={() => setCapture(true)}
                className="h-9 rounded-[6px] border border-foreground px-4 text-xs font-medium transition active:scale-95"
              >
                Record manually
              </button>
            </div>
          </div>
        )}

        {recent.length === 0 && !todayNoSpend ? null : (
          <ul className="flex flex-col gap-3.5">
            {/* today's no-spend win reads as a natural entry: ¥0 */}
            {todayNoSpend && (
              <li className="flex items-center gap-3">
                <span className="text-xl">🎉</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">No-spend day</span>
                  <span className="text-xs text-muted">That&apos;s how wealth grows</span>
                </span>
                <span className="tnum text-[15px] font-medium">
                  {formatMoney(0, currency)}
                </span>
              </li>
            )}
            {recent.map((s) => {
              const b = bucketOf(s.bucket);
              const f = feelingOf(s.feeling);
              return (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="text-xl">{f.emoji}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">
                      {s.label || b.label}
                    </span>
                    <span className="text-xs text-muted">
                      {b.emoji} {b.label}
                    </span>
                  </span>
                  <span className="tnum text-[15px] font-medium">
                    {formatMoney(s.amount, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Spending type balance — the Need:Want donut */}
      <Card className="mt-4">
        <SectionLabel>Spending type balance</SectionLabel>
        <div className="mt-4 flex items-center gap-6">
          {nw.total === 0 ? <EmptyDonut /> : <NeedWantDonut needPct={nw.needPct} />}

          <div className="flex-1">
            <BalanceRow
              filled={false}
              label="Need"
              pct={nw.total === 0 ? 0 : nw.needPct}
              amount={formatMoney(nw.need, currency)}
            />
            <div className="my-3 h-px bg-border" />
            <BalanceRow
              filled
              label="Want"
              pct={nw.total === 0 ? 0 : nw.wantPct}
              amount={formatMoney(nw.want, currency)}
            />
          </div>
        </div>
      </Card>

      {capture && <CaptureSheet onClose={() => setCapture(false)} />}
      {importing && <ImportSheet onClose={() => setImporting(false)} />}
      {onboarding === "open" && <Onboarding onDone={() => setOnboarding("done")} />}
    </div>
  );
}

function BalanceRow({
  filled,
  label,
  pct,
  amount,
}: {
  filled: boolean; // matches the ring: filled = Want, open = Need
  label: string;
  pct: number;
  amount: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          filled
            ? "h-2.5 w-2.5 rounded-full bg-foreground"
            : "h-2.5 w-2.5 rounded-full border border-foreground"
        }
      />
      <span className="text-[15px] font-medium">{label}</span>
      <span className="ml-auto tnum text-sm font-medium text-muted">
        {Math.round(pct * 100)}%
      </span>
      <span className="tnum w-20 text-right text-[15px] font-medium">{amount}</span>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-center justify-between">
        <div className="h-10 w-24 rounded-full bg-card" />
        <div className="h-11 w-11 rounded-full bg-card" />
      </div>
      <div className="mt-5 h-48 rounded-[var(--radius-card)] bg-card" />
      <div className="mt-4 h-32 rounded-[var(--radius-card)] bg-card" />
      <div className="mt-4 h-40 rounded-[var(--radius-card)] bg-card" />
    </div>
  );
}
