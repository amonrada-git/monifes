"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { BUCKETS, Budget, Bucket, DIFFICULTIES, Difficulty } from "@/lib/types";
import { CURRENCIES, currencyOf, formatMoney } from "@/lib/currencies";
import { needShare, planParts, spendingOf, suggestPlan, totalOf, wealthOf } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { AmountDisplay, Keypad, useAmountInput } from "./keypad";
import { PlanRing, RingKey, Swatch, WealthShare, useCountUp } from "./plan-ring";
import { WelcomeScenes } from "./welcome-scenes";
import { CharacterBuilder } from "./character-builder";
import { loadMe, saveMe, type Look } from "@/lib/character";

type Step = "hello" | "look" | "welcome" | "income" | "plan" | "now" | "compare";
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
 * The first run: you name and make a little clay you, then one number —
 * take-home pay — becomes a four-bucket plan drawn as a ring, set next to
 * where the money goes today. Each step saves as it goes, so leaving early
 * keeps what's done.
 */
export function Onboarding({
  startAt = "hello",
  onDone,
}: {
  startAt?: Step;
  onDone: () => void;
}) {
  const { data, setBudget, setFinances, updateSettings } = useStore();

  const [step, setStep] = useState<Step>(startAt);
  // The footer steps aside while you scroll down to reach the options, and
  // comes back when you scroll up or reach the end. Remembered per step, so a
  // new step always starts with its button showing.
  const [footerAwayOn, setFooterAwayOn] = useState<Step | null>(null);
  const lastTop = useRef(0);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const delta = el.scrollTop - lastTop.current;
    if (Math.abs(delta) < 6) return;
    lastTop.current = el.scrollTop;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    setFooterAwayOn(delta > 0 && !atEnd ? step : null);
  }
  const [me] = useState(loadMe);
  const [name, setName] = useState(me.name);
  const [look, setLook] = useState<Look>(me.look);
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

  function meet() {
    saveMe({ name: name.trim(), look });
    setStep("look");
  }

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
    look: "hello",
    income: startAt === "hello" ? "welcome" : undefined,
    plan: "income",
    now: "plan",
    compare: "now",
  };

  const screen = (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {step !== "welcome" && step !== "hello" && (
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
          <div className={cn("flex gap-1.5", !STEPS.includes(step) && "invisible")} aria-hidden>
            {STEPS.map((s) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  STEPS.indexOf(s) <= STEPS.indexOf(step) ? "bg-foreground" : "bg-muted-2/60",
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

      <div
        onScroll={onScroll}
        data-footer={footerAwayOn === step ? "away" : "shown"}
        className="group/steps no-scrollbar flex flex-1 flex-col overflow-y-auto px-6"
      >
        {step === "hello" && (
          <div key="hello" className="rise flex flex-1 flex-col pt-14">
            <h1 className="text-[32px] font-medium leading-[1.15]">Welcome to monifes</h1>
            <p className="mt-2 text-[17px] text-muted">What should we call you?</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) meet();
              }}
              placeholder="Your name"
              autoComplete="given-name"
              aria-label="Your name"
              className="well mt-8 h-14 rounded-2xl px-5 text-xl placeholder:text-muted-2 focus:outline-none"
            />
            <p className="mt-3 text-sm text-muted">A first name or nickname. Only you see it.</p>
            <Footer below={<TextButton onClick={finish}>Skip for now</TextButton>}>
              <PrimaryButton disabled={!name.trim()} onClick={meet}>
                Continue
              </PrimaryButton>
            </Footer>
          </div>
        )}

        {step === "look" && (
          <div key="look" className="rise flex flex-1 flex-col pt-2">
            <h1 className="text-[28px] font-medium leading-tight">
              Which one feels like you, {name.trim()}?
            </h1>
            <p className="mt-2 text-sm text-muted">
              Pick a little you for the journey. You can change it any time.
            </p>
            <div className="mt-5">
              <CharacterBuilder look={look} onChange={setLook} name={name.trim()} />
            </div>
            <Footer>
              <PrimaryButton
                onClick={() => {
                  saveMe({ name: name.trim(), look });
                  setStep("welcome");
                }}
              >
                That’s me
              </PrimaryButton>
            </Footer>
          </div>
        )}

        {step === "welcome" && (
          <Welcome name={name.trim()} look={look} onBegin={() => setStep("income")} onSkip={finish} />
        )}

        {step === "income" && (
          <div key="income" className="rise flex flex-1 flex-col pt-4">
            <h1 className="text-[28px] font-medium leading-tight">
              What lands in your account each month?
            </h1>
            <p className="mt-2 text-sm text-muted">Your take-home pay, after tax.</p>

            <div className="tray mt-5 inline-flex gap-1 self-start rounded-2xl p-1">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrencyCode(c.code);
                    pay.setValue("");
                  }}
                  className={cn(
                    "h-9 rounded-xl px-4 text-xs transition",
                    c.code === currencyCode ? "key-on" : "text-muted",
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
            </div>
            <Footer className="mt-0">
              <PrimaryButton disabled={income <= 0} onClick={() => setStep("plan")}>
                Show me
              </PrimaryButton>
            </Footer>
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
                  className="raised flex items-center gap-3 rounded-2xl px-4 py-3"
                >
                  <Swatch kind={b.key} />
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

            <Footer below={<TextButton onClick={finish}>I’ll do this later</TextButton>}>
              <PrimaryButton disabled={totalOf(baseline) <= 0} onClick={showComparison}>
                See where I’m headed
              </PrimaryButton>
            </Footer>
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

  // Above the whole phone, tab bar included — not just the scrolling page.
  const host = typeof document === "undefined" ? null : document.getElementById("phone");
  return host ? createPortal(screen, host) : screen;
}

function Welcome({
  name,
  look,
  onBegin,
  onSkip,
}: {
  name: string;
  look: Look;
  onBegin: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="rise flex flex-1 flex-col pt-10">
      <p className="text-sm text-muted">{name ? `Hi, ${name}` : "monifes"}</p>
      <h1 className="mt-3 text-[32px] font-medium leading-[1.15]">
        See who you could become.
      </h1>
      <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted">
        It starts with what you take home each month. Only you can see it.
      </p>

      <WelcomeScenes look={look} className="mt-6" />

      <Footer below={<TextButton onClick={onSkip}>Skip for now</TextButton>}>
        <PrimaryButton onClick={onBegin}>Begin</PrimaryButton>
      </Footer>
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
  const wealth = useCountUp(wealthOf(plan));

  return (
    <div key="plan" className="rise flex flex-1 flex-col pt-4">
      <p className="text-sm text-muted">Your plan for {formatMoney(income, currency)}</p>
      <h1 className="mt-1 text-[28px] font-medium leading-tight">
        Build <span className="tnum">{formatMoney(wealth, currency)}</span> of wealth{" "}
        <span className="block">every month.</span>
      </h1>
      <p className="tnum mt-2 text-sm text-muted">
        {formatMoney(plan.investments, currency)} invested · {formatMoney(plan.savings, currency)} saved
        for goals
      </p>

      <PlanRing
        parts={planParts(plan, income)}
        label={`Your take-home pay of ${formatMoney(income, currency)} split into four buckets`}
        className="mt-7"
      >
        <span className="tnum text-xl font-medium">{formatMoney(income, currency)}</span>
        <span className="mt-0.5 text-xs text-muted">take-home</span>
      </PlanRing>

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
        <div className="tray mt-2 grid grid-cols-3 gap-1 rounded-2xl p-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.key}
              onClick={() => onDifficulty(d.key)}
              className={cn(
                "flex flex-col items-center rounded-xl py-2.5 transition",
                d.key === difficulty ? "key-on" : "text-foreground",
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

      <Footer below={<p className="text-xs text-muted">You can change it any time in Becoming.</p>}>
        <PrimaryButton onClick={onAccept}>Use this plan</PrimaryButton>
      </Footer>
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
      <Swatch kind={bucket} />
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
          <figcaption className="mb-3 text-center text-[13px] font-medium text-muted">Now</figcaption>
          <PlanRing parts={planParts(baseline, income)} size="sm" label="Where your money goes now">
            <WealthShare budget={baseline} income={income} />
          </PlanRing>
        </figure>
        <figure>
          <figcaption className="mb-3 text-center text-[13px] font-medium text-muted">Plan</figcaption>
          <PlanRing parts={planParts(plan, income)} size="sm" label="Where your money goes on the plan">
            <WealthShare budget={plan} income={income} />
          </PlanRing>
        </figure>
      </div>
      <RingKey className="mt-5" />

      <div className="mt-8 flex flex-col gap-4">
        <Line label="Wealth you build each month">
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
          : "You’re already building at least as much wealth as the plan. Lovely — keep going."}
      </p>
      {gap < 0 && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Right now about {formatMoney(-gap, currency)} more goes out than comes in each month. The
          plan closes that gap.
        </p>
      )}
      {gap > 0 && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          About {formatMoney(gap, currency)} a month isn’t accounted for yet (the bare part of the ring).
          Logging what you spend will show where it goes.
        </p>
      )}

      <Footer>
        <PrimaryButton onClick={onDone}>Start</PrimaryButton>
      </Footer>
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

/**
 * The bottom of every step: pinned to the screen's foot, one height on every
 * screen — the main button, then a line below it (a quiet link, a note, or
 * nothing) — so the button never moves from step to step. Slides away while
 * you scroll down (see `onScroll`).
 */
function Footer({
  children,
  below,
  className,
}: {
  children: React.ReactNode;
  below?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-6 mt-auto bg-linear-to-t from-background from-75% to-transparent px-6 pb-6 pt-6",
        "transition duration-300 ease-out motion-reduce:transition-none",
        "group-data-[footer=away]/steps:pointer-events-none group-data-[footer=away]/steps:translate-y-full group-data-[footer=away]/steps:opacity-0",
        className,
      )}
    >
      {children}
      <div className="mt-2 flex h-8 items-center justify-center text-center">{below}</div>
    </div>
  );
}

function TextButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 text-sm text-muted">
      {children}
    </button>
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
      className="h-14 w-full btn-ink rounded-2xl text-lg font-medium transition active:scale-[0.98] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
