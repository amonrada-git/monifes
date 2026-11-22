"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { BUCKETS, difficultyOf } from "@/lib/types";
import { formatMoney } from "@/lib/currencies";
import { bucketTotals, spendsInMonth } from "@/lib/compute";
import { planParts, totalOf, wealthOf } from "@/lib/plan";
import { Card, SectionLabel } from "@/components/ui";
import { PlanRing, RingKey, Swatch, WealthShare } from "@/components/plan-ring";
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
          <PlanRing parts={[]} size="sm" label="An empty ring, waiting for your plan" className="mt-2" />
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
          {/* The plan — income as one ring */}
          <Card className="mt-5">
            <div className="flex items-baseline justify-between">
              <SectionLabel>Monthly plan</SectionLabel>
              <span className="tnum text-xs text-muted">
                {formatMoney(income, currency)} · {difficultyOf(settings.difficulty).ratio}
              </span>
            </div>
            <p className="mt-2 text-xl font-medium">
              Build <span className="tnum">{formatMoney(wealthOf(plan), currency)}</span> of wealth a month
            </p>
            <p className="tnum mt-1 text-xs text-muted">
              {formatMoney(plan.investments, currency)} invested · {formatMoney(plan.savings, currency)}{" "}
              saved for goals
            </p>
            <PlanRing
              parts={planParts(plan, income)}
              label={`Your take-home pay of ${formatMoney(income, currency)} split into four buckets`}
              className="mt-5"
            >
              <span className="tnum text-xl font-medium">{formatMoney(income, currency)}</span>
              <span className="mt-0.5 text-xs text-muted">take-home</span>
            </PlanRing>
            <ul className="mt-5 flex flex-col gap-2.5">
              {BUCKETS.map((b) => (
                <li key={b.key} className="flex items-center gap-3">
                  <Swatch kind={b.key} />
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
                <figure>
                  <figcaption className="mb-3 text-center text-[13px] text-muted">Started</figcaption>
                  <PlanRing parts={planParts(baseline, income)} size="sm" label="Where your money went when you started">
                    <WealthShare budget={baseline} income={income} />
                  </PlanRing>
                </figure>
                <figure>
                  <figcaption className="mb-3 text-center text-[13px] text-muted">Plan</figcaption>
                  <PlanRing parts={planParts(plan, income)} size="sm" label="Where your money goes on the plan">
                    <WealthShare budget={plan} income={income} />
                  </PlanRing>
                </figure>
              </div>
              <RingKey className="mt-5" />
              <div className="mt-4 flex items-baseline justify-between text-sm">
                <span className="text-muted">Wealth built each month</span>
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
