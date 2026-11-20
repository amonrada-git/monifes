"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { BUCKETS, difficultyOf } from "@/lib/types";
import { formatMoney } from "@/lib/currencies";
import { bucketTotals, spendsInMonth } from "@/lib/compute";
import { planDots, totalOf, wealthOf } from "@/lib/plan";
import { Card, SectionLabel } from "@/components/ui";
import { DotSwatch, PlanDots } from "@/components/plan-dots";
import { Onboarding } from "@/components/onboarding";

export default function GoalsPage() {
  const { data, ready } = useStore();
  const [planning, setPlanning] = useState(false);

  const month = useMemo(() => {
    const now = new Date();
    return {
      name: now.toLocaleString("en-US", { month: "long" }),
      totals: bucketTotals(spendsInMonth(data.spends, now)),
    };
  }, [data.spends]);

  if (!ready) {
    return (
      <div className="px-5 pt-5">
        <div className="h-8 w-24 rounded-lg bg-card" />
        <div className="mt-5 h-80 rounded-[var(--radius-card)] bg-card" />
      </div>
    );
  }

  const { budget: plan, baseline, settings } = data;
  const currency = settings.currency;
  const income = data.income ?? (plan ? totalOf(plan) : 0);

  return (
    <div className="px-5 pb-8 pt-5">
      <h1 className="text-2xl font-medium">Goals</h1>

      {!plan ? (
        <Card className="mt-5">
          <PlanDots dots={Array(100).fill("open")} className="px-1" />
          <p className="mt-6 text-[17px] font-medium">Make a plan from one number</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Tell monifes what you take home each month and it suggests how much to spend, invest
            and save — then shows how far today is from there.
          </p>
          <button
            onClick={() => setPlanning(true)}
            className="mt-5 h-12 w-full rounded-2xl bg-accent text-[15px] font-medium text-white transition active:scale-[0.98]"
          >
            Make my plan
          </button>
        </Card>
      ) : (
        <>
          {/* The plan — income as 100 dots */}
          <Card className="mt-5">
            <div className="flex items-baseline justify-between">
              <SectionLabel>Monthly plan</SectionLabel>
              <span className="tnum text-xs text-muted">
                {formatMoney(income, currency)} · {difficultyOf(settings.difficulty).ratio}
              </span>
            </div>
            <p className="mt-2 text-xl font-medium">
              Build <span className="tnum">{formatMoney(wealthOf(plan), currency)}</span> a month
            </p>
            <PlanDots dots={planDots(plan, income)} className="mt-5 px-1" />
            <ul className="mt-5 flex flex-col gap-2.5">
              {BUCKETS.map((b) => (
                <li key={b.key} className="flex items-center gap-3">
                  <DotSwatch kind={b.key} />
                  <span className="flex-1 text-[15px] font-medium">{b.label}</span>
                  <span className="tnum text-[15px] font-medium">
                    {formatMoney(plan[b.key], currency)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* This month against the plan — the windshield, live */}
          <Card className="mt-4">
            <SectionLabel>{month.name} so far</SectionLabel>
            <ul className="mt-4 flex flex-col gap-4">
              {BUCKETS.map((b) => {
                const spent = month.totals[b.key];
                const target = plan[b.key];
                const pct = target > 0 ? Math.min(1, spent / target) : 0;
                return (
                  <li key={b.key}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{b.label}</span>
                      <span className="tnum text-muted">
                        <span className="text-foreground">{formatMoney(spent, currency)}</span> of{" "}
                        {formatMoney(target, currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-px w-full bg-border/50">
                      <div
                        className="h-px bg-foreground transition-[width] duration-500"
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Investments and savings count when you log them as a spend to that bucket.
            </p>
          </Card>

          {/* Where you started */}
          {baseline && (
            <Card className="mt-4">
              <SectionLabel>Where you started → the plan</SectionLabel>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <PlanDots dots={planDots(baseline, income)} size="sm" />
                <PlanDots dots={planDots(plan, income)} size="sm" />
              </div>
              <div className="mt-4 flex items-baseline justify-between text-sm">
                <span className="text-muted">Building each month</span>
                <span className="tnum font-medium">
                  {formatMoney(wealthOf(baseline), currency)}
                  <span className="text-muted"> → </span>
                  {formatMoney(wealthOf(plan), currency)}
                </span>
              </div>
            </Card>
          )}

          <button
            onClick={() => setPlanning(true)}
            className="mt-5 h-11 w-full rounded-2xl border border-border text-[15px] transition active:scale-[0.98]"
          >
            Redo my plan
          </button>
        </>
      )}

      {planning && <Onboarding startAt="income" onDone={() => setPlanning(false)} />}
    </div>
  );
}
