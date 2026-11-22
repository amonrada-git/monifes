"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { X, Check } from "lucide-react";
import { BUCKETS, FEELINGS, Bucket, Feeling } from "@/lib/types";
import { useStore } from "@/lib/store";
import { currencyOf, formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { AmountDisplay, Keypad, useAmountInput } from "./keypad";

type Step = "amount" | "bucket" | "feeling" | "done";

/**
 * Mounted only while open (the parent renders it conditionally), so every
 * opening starts with a fresh, empty form — no reset logic needed.
 */
export function CaptureSheet({ onClose }: { onClose: () => void }) {
  const { data, addSpend } = useStore();
  const currency = currencyOf(data.settings.currency);

  const [step, setStep] = useState<Step>("amount");
  const { value: amountStr, amount, press } = useAmountInput(currency.decimals);
  const [label, setLabel] = useState("");
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [feeling, setFeeling] = useState<Feeling | null>(null);


  // After the "Logged" celebration breathes for a moment, close the sheet.
  // Effect-scoped so the timer is cancelled if the sheet unmounts first —
  // a stale timer must never dismiss a freshly reopened sheet. Reading
  // onClose through an effect event keeps the timer from restarting each
  // time the parent re-renders (it does, several times, while a spend syncs).
  const close = useEffectEvent(() => onClose());
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(close, 1100);
    return () => clearTimeout(t);
  }, [step]);

  function chooseBucket(b: Bucket) {
    setBucket(b);
    setStep("feeling");
  }

  function chooseFeeling(f: Feeling) {
    setFeeling(f);
    if (!bucket) return;
    addSpend({ amount, bucket, feeling: f, label });
    setStep("done"); // the step effect above closes the sheet after a beat
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* scrim */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
      />

      <div className="rise relative flex max-h-[92%] w-full max-w-[390px] flex-col rounded-t-[28px] bg-background px-5 pb-8 pt-4">
        {/* grab handle + header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-card"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {step === "amount" && (
          <AmountStep
            amountStr={amountStr}
            symbol={currency.symbol}
            allowDecimal={currency.decimals > 0}
            label={label}
            onLabel={setLabel}
            onPress={press}
            canNext={amount > 0}
            onNext={() => setStep("bucket")}
          />
        )}

        {step === "bucket" && (
          <ChoiceStep
            title="What was it for?"
            subtitle={formatMoney(amount, currency.code)}
          >
            <div className="grid grid-cols-2 gap-3">
              {BUCKETS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => chooseBucket(b.key)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-3xl p-4 text-left transition active:scale-[0.97]",
                    bucket === b.key ? "key-on" : "raised",
                  )}
                >
                  <span className="text-2xl">{b.emoji}</span>
                  <span className="text-[15px] font-medium leading-tight">{b.label}</span>
                  <span className={cn("text-xs", bucket === b.key ? "opacity-70" : "text-muted")}>
                    {b.blurb}
                  </span>
                </button>
              ))}
            </div>
          </ChoiceStep>
        )}

        {step === "feeling" && (
          <ChoiceStep title="How did it feel?" subtitle={formatMoney(amount, currency.code)}>
            <div className="flex flex-col gap-2.5">
              {FEELINGS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => chooseFeeling(f.key)}
                  className={cn(
                    "flex items-center gap-4 rounded-3xl px-5 py-3.5 text-left transition active:scale-[0.98]",
                    feeling === f.key ? "key-on" : "raised",
                  )}
                >
                  <span className="text-3xl">{f.emoji}</span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-medium">{f.label}</span>
                    <span className={cn("text-xs", feeling === f.key ? "opacity-70" : "text-muted")}>
                      {f.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </ChoiceStep>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft">
              <Check size={40} className="text-success" strokeWidth={3} />
            </div>
            <p className="mt-5 text-xl font-medium">Logged 🌱</p>
            <p className="mt-1 text-sm text-muted">Noticing is the whole point.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceStep({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-normal text-accent tnum">{subtitle}</p>
      <h2 className="mb-4 mt-0.5 text-2xl font-medium">{title}</h2>
      {children}
    </div>
  );
}

function AmountStep({
  amountStr,
  symbol,
  allowDecimal,
  label,
  onLabel,
  onPress,
  canNext,
  onNext,
}: {
  amountStr: string;
  symbol: string;
  allowDecimal: boolean;
  label: string;
  onLabel: (v: string) => void;
  onPress: (k: string) => void;
  canNext: boolean;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-medium">Add a spend</h2>

      <div className="mt-6">
        <AmountDisplay symbol={symbol} value={amountStr} />
      </div>

      <input
        value={label}
        onChange={(e) => onLabel(e.target.value)}
        placeholder="What was it? (optional)"
        maxLength={40}
        className="well mx-auto mt-5 w-full rounded-2xl px-4 py-3 text-center text-sm font-normal placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-accent-soft"
      />

      <div className="mt-5">
        <Keypad allowDecimal={allowDecimal} onPress={onPress} />
      </div>

      <button
        onClick={onNext}
        disabled={!canNext}
        className="mt-5 h-14 btn-ink rounded-2xl text-lg font-medium transition active:scale-[0.98] disabled:opacity-30"
      >
        Next
      </button>
    </div>
  );
}
