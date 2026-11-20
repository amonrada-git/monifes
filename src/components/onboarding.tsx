"use client";

import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { BUCKETS, Budget, Bucket, DIFFICULTIES, Difficulty } from "@/lib/types";
import { CURRENCIES, currencyOf, formatMoney } from "@/lib/currencies";
import { needShare, planDots, spendingOf, suggestPlan, totalOf, wealthOf } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { AmountDisplay, Keypad, useAmountInput } from "./keypad";
import { DotSwatch, PlanDots, useCountUp } from "./plan-dots";

type Step = "welcome" | "income" | "plan" | "now" | "compare";
const STEPS: Step[] = ["income", "plan", "now", "compare"];

const SEEN_KEY = "monifes:onboarding:seen";

/** Whether this device has already been through (or skipped) onboarding. */
export function onboardingSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // storage blocked — don't trap anyone in a loop
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

/**
 * The first-run "magic moment": one number — take-home pay — becomes a
 * four-bucket plan drawn as 100 dots, then sits next to where the money goes
 * today. Each step saves as it goes, so leaving early keeps what's done.
 */
export function Onboarding({
  startAt = "welcome",
  onDone,
}: {
  startAt?: Step;
  onDone: () => void;
}) {
  const { data, setBudget, setFinances, updateSettings } = useStore();

  const [step, setStep] = useState<Step>(startAt);
  const [currencyCode, setCurrencyCode] = useState(data.settings.currency);
  const [difficulty, setDifficulty] = useState<Difficulty>(data.settings.difficulty);
  const currency = currencyOf(currencyCode);
  const pay = useAmountInput(currency.decimals, data.income ? String(data.income) : "");
  const [now, setNow] = useState<Record<Bucket, string>>(() => {
    const b = data.baseline;
    return {
      necessities: b ? String(b.necessities) : "",
      "guilt-free": b ? String(b["guilt-free"]) : "",
      investments: b ? String(b.investments) : "",
      savings: b ? String(b.savings) : "",
    };
  });

  const income = pay.amount;
  const plan = useMemo(
    () => suggestPlan(income, difficulty, currencyCode),
    [income, difficulty, currencyCode],
  );
  const baseline: Budget = {
    necessities: Number(now.necessities) || 0,
    "guilt-free": Number(now["guilt-free"]) || 0,
    investments: Number(now.investments) || 0,
    savings: Number(now.savings) || 0,
  };

  function finish() {
    markSeen();
    onDone();
  }

  function acceptPlan() {
    updateSettings({ currency: currencyCode, difficulty });
    setBudget(plan);
    setFinances({ income });
    setStep("now");
  }

  function showComparison() {
    setFinances({ baseline });
    setStep("compare");
  }

  const back: Partial<Record<Step, Step>> = {
    income: startAt === "welcome" ? "welcome" : undefined,
    plan: "income",
    now: "plan",
    compare: "now",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {step !== "welcome" && (
        <header className="flex items-center justify-between px-3 pb-1 pt-4">
          <button
            onClick={() => {
              const prev = back[step];
              if (prev) setStep(prev);
            }}
            aria-label="Back"
            className={cn("rounded-full p-2 text-muted", !back[step] && "invisible")}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((s) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  STEPS.indexOf(s) <= STEPS.indexOf(step) ? "bg-foreground" : "bg-border/60",
                )}
              />
            ))}
          </div>
          <button
            onClick={finish}
            className={cn("px-2 py-2 text-sm text-muted", step === "compare" && "invisible")}
          >
            Skip
          </button>
        </header>
      )}

      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-6 pb-8">
        {step === "welcome" && (
          <Welcome onBegin={() => setStep("income")} onSkip={finish} />
        )}

        {step === "income" && (
          <div key="income" className="rise flex flex-1 flex-col pt-4">
            <h1 className="text-[28px] font-medium leading-tight">
              What lands in your account each month?
            </h1>
            <p className="mt-2 text-sm text-muted">Your take-home pay, after tax.</p>

            <div className="mt-5 flex gap-1.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrencyCode(c.code);
                    pay.setValue("");
                  }}
                  className={cn(
                    "h-8 rounded-full px-3.5 text-xs transition",
                    c.code === currencyCode ? "bg-foreground text-background" : "bg-card text-muted",
                  )}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <AmountDisplay symbol={currency.symbol} value={pay.value} />
              <div className="mt-8">
                <Keypad allowDecimal={currency.decimals > 0} onPress={pay.press} />
              </div>
              <PrimaryButton disabled={income <= 0} onClick={() => setStep("plan")}>
                Show me
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === "plan" && (
          <PlanReveal
            income={income}
            plan={plan}
            currency={currencyCode}
            difficulty={difficulty}
            onDifficulty={setDifficulty}
            onAccept={acceptPlan}
          />
        )}

        {step === "now" && (
          <div key="now" className="rise flex flex-1 flex-col pt-4">
            <h1 className="text-[28px] font-medium leading-tight">And today, roughly?</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              What goes to each in a usual month. A guess is fine — this is only your starting
              point, not a test.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              {BUCKETS.map((b) => (
                <label
                  key={b.key}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] bg-card px-4 py-3"
                >
                  <DotSwatch kind={b.key} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-medium">{b.label}</span>
                    <span className="text-xs text-muted">
                      Plan {formatMoney(plan[b.key], currencyCode)}
                    </span>
                  </span>
                  <span className="text-muted">{currency.symbol}</span>
                  <input
                    inputMode="numeric"
                    placeholder="0"
                    value={now[b.key] ? Number(now[b.key]).toLocaleString("en-US") : ""}
                    onChange={(e) =>
                      setNow((n) => ({ ...n, [b.key]: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                    }
                    className="tnum w-28 bg-transparent text-right text-lg font-medium placeholder:text-muted-2 focus:outline-none"
                  />
                </label>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <PrimaryButton disabled={totalOf(baseline) <= 0} onClick={showComparison}>
                See where I’m headed
              </PrimaryButton>
              <button
                onClick={finish}
                className="mt-3 w-full text-center text-sm text-muted"
              >
                I’ll do this later
              </button>
            </div>
          </div>
        )}

        {step === "compare" && (
          <Compare
            income={income}
            plan={plan}
            baseline={baseline}
            currency={currencyCode}
            difficulty={difficulty}
            onDone={finish}
          />
        )}
      </div>
    </div>
  );
}

function Welcome({ onBegin, onSkip }: { onBegin: () => void; onSkip: () => void }) {
  // A quiet field of 100 dots — the plan-to-be, before it has a shape.
  const field = useMemo(() => Array<"open">(100).fill("open"), []);
  return (
    <div className="rise flex flex-1 flex-col pt-14">
      <p className="text-sm text-muted">monifes</p>
      <h1 className="mt-3 text-[32px] font-medium leading-[1.15]">
        Let’s see where your money could go.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        One number to start: what you take home each month. Only you can see it.
      </p>
      <PlanDots dots={field} className="mt-10 px-2" />
      <div className="mt-auto pt-10">
        <PrimaryButton onClick={onBegin}>Begin</PrimaryButton>
        <button onClick={onSkip} className="mt-3 w-full text-center text-sm text-muted">
          Skip for now
        </button>
      </div>
    </div>
  );
}

function PlanReveal({
  income,
  plan,
  currency,
  difficulty,
  onDifficulty,
  onAccept,
}: {
  income: number;
  plan: Budget;
  currency: string;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onAccept: () => void;
}) {
  const dots = planDots(plan, income);
  const wealth = useCountUp(wealthOf(plan));

  return (
    <div key="plan" className="rise flex flex-1 flex-col pt-4">
      <p className="text-sm text-muted">Your plan for {formatMoney(income, currency)}</p>
      <h1 className="mt-1 text-[28px] font-medium leading-tight">
        Build <span className="tnum">{formatMoney(wealth, currency)}</span> every month.
      </h1>

      <PlanDots dots={dots} className="mt-7 px-2" />

      <ul className="mt-7 flex flex-col gap-3">
        {BUCKETS.map((b) => (
          <PlanRow
            key={b.key}
            bucket={b.key}
            label={b.label}
            amount={plan[b.key]}
            share={plan[b.key] / income}
            currency={currency}
          />
        ))}
      </ul>

      <div className="mt-7">
        <p className="text-[13px] font-medium text-muted">Need : Want target</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.key}
              onClick={() => onDifficulty(d.key)}
              className={cn(
                "flex flex-col items-center rounded-[var(--radius-card)] py-2.5 transition",
                d.key === difficulty ? "bg-foreground text-background" : "bg-card",
              )}
            >
              <span className="tnum text-[15px] font-medium">{d.ratio}</span>
              <span className={cn("text-[11px]", d.key === difficulty ? "opacity-70" : "text-muted")}>
                {d.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Pinned, so the choice is always in reach while the dots play out. */}
      <div className="sticky bottom-0 -mx-6 mt-auto bg-linear-to-t from-background from-70% to-transparent px-6 pt-8">
        <PrimaryButton onClick={onAccept}>Use this plan</PrimaryButton>
        <p className="mt-3 text-center text-xs text-muted">You can change it any time in Goals.</p>
      </div>
    </div>
  );
}

function PlanRow({
  bucket,
  label,
  amount,
  share,
  currency,
}: {
  bucket: Bucket;
  label: string;
  amount: number;
  share: number;
  currency: string;
}) {
  const shown = useCountUp(amount);
  return (
    <li className="flex items-center gap-3">
      <DotSwatch kind={bucket} />
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <span className="tnum w-10 text-right text-sm text-muted">{Math.round(share * 100)}%</span>
      <span className="tnum w-28 text-right text-[15px] font-medium">
        {formatMoney(shown, currency)}
      </span>
    </li>
  );
}

function Compare({
  income,
  plan,
  baseline,
  currency,
  difficulty,
  onDone,
}: {
  income: number;
  plan: Budget;
  baseline: Budget;
  currency: string;
  difficulty: Difficulty;
  onDone: () => void;
}) {
  const nowWealth = wealthOf(baseline);
  const planWealth = wealthOf(plan);
  const yearMore = (planWealth - nowWealth) * 12;
  const gap = income - totalOf(baseline); // > 0 unaccounted, < 0 overspending
  const nowNeed = needShare(baseline);
  const target = DIFFICULTIES.find((d) => d.key === difficulty)!;
  const pct = (n: number) => Math.round(n * 100);

  return (
    <div key="compare" className="rise flex flex-1 flex-col pt-4">
      <h1 className="text-[28px] font-medium leading-tight">Where you are, where you’re going.</h1>

      <div className="mt-7 grid grid-cols-2 gap-4">
        <figure>
          <figcaption className="mb-2.5 text-[13px] font-medium text-muted">Now</figcaption>
          <PlanDots dots={planDots(baseline, income)} size="sm" />
        </figure>
        <figure>
          <figcaption className="mb-2.5 text-[13px] font-medium text-muted">Plan</figcaption>
          <PlanDots dots={planDots(plan, income)} size="sm" />
        </figure>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <Line label="You build each month">
          <span className="tnum">{formatMoney(nowWealth, currency)}</span>
          <span className="text-muted"> → </span>
          <span className="tnum">{formatMoney(planWealth, currency)}</span>
        </Line>
        {nowNeed !== null && spendingOf(baseline) > 0 && (
          <Line label="Need : Want">
            <span className="tnum">
              {pct(nowNeed)}:{100 - pct(nowNeed)}
            </span>
            <span className="text-muted"> → </span>
            <span className="tnum">{target.ratio.replace(/\s/g, "")}</span>
          </Line>
        )}
      </div>

      <p className="mt-6 text-[15px] leading-relaxed">
        {yearMore > 0
          ? `That’s ${formatMoney(yearMore, currency)} more set aside by this time next year — before any growth.`
          : "You’re already building at least as much as the plan. Lovely — keep going."}
      </p>
      {gap < 0 && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Right now about {formatMoney(-gap, currency)} more goes out than comes in each month. The
          plan closes that gap.
        </p>
      )}
      {gap > 0 && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          About {formatMoney(gap, currency)} a month isn’t accounted for yet (the faint dots).
          Logging what you spend will show where it goes.
        </p>
      )}

      <div className="mt-auto pt-8">
        <PrimaryButton onClick={onDone}>Start</PrimaryButton>
      </div>
    </div>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/50 pb-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-lg font-medium">{children}</span>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-5 h-14 w-full rounded-2xl bg-accent text-lg font-medium text-white transition active:scale-[0.98] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
