"use client";

import { useEffect, useState } from "react";
import type { Budget } from "@/lib/types";
import { planParts, wealthOf } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { PlanRing, useCountUp } from "./plan-ring";

/**
 * A sample month, shares of pay: a typical "today" that keeps almost nothing,
 * and the plan it could become.
 */
const SAMPLE: Record<"today" | "becoming", Budget> = {
  today: { necessities: 62, "guilt-free": 33, investments: 0, savings: 3 },
  becoming: { necessities: 56, "guilt-free": 24, investments: 10, savings: 10 },
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Today → becoming: the same month, reshaped, on a raised disc with a
 * Today | Becoming tray. Plays on its own until someone taps a side; with
 * reduced motion it simply shows where you could be.
 */
export function BecomingDemo({ size = "lg", className }: { size?: "lg" | "sm"; className?: string }) {
  const [phase, setPhase] = useState<"today" | "becoming">(() =>
    reducedMotion() ? "becoming" : "today",
  );
  const [playing, setPlaying] = useState(() => !reducedMotion());
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setPhase((p) => (p === "today" ? "becoming" : "today")), 2600);
    return () => clearInterval(id);
  }, [playing]);
  const kept = useCountUp(wealthOf(SAMPLE[phase]));

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className={cn("raised rounded-full", size === "lg" ? "p-4" : "p-2.5")}>
        <PlanRing
          parts={planParts(SAMPLE[phase], 100)}
          size={size}
          label={
            phase === "today"
              ? "A sample month today: 3% of pay kept"
              : "The same month on a plan: 20% of pay kept"
          }
        >
          <span className={cn("text-muted", size === "lg" ? "text-xs" : "text-[10px]")}>
            {phase === "today" ? "Today" : "Becoming"}
          </span>
          <span
            className={cn(
              "tnum mt-0.5 font-medium leading-none",
              size === "lg" ? "text-[34px]" : "text-xl",
            )}
          >
            {Math.round(kept)}%
          </span>
          <span className={cn("mt-1 text-muted", size === "lg" ? "text-xs" : "text-[10px]")}>
            of pay kept
          </span>
        </PlanRing>
      </div>
      <div className={cn("tray inline-flex gap-1 rounded-2xl p-1", size === "lg" ? "mt-6" : "mt-4")}>
        {(["today", "becoming"] as const).map((p) => (
          <button
            key={p}
            onClick={() => {
              setPlaying(false);
              setPhase(p);
            }}
            className={cn(
              "rounded-xl text-sm transition",
              size === "lg" ? "h-9 px-5" : "h-8 px-4 text-[13px]",
              phase === p ? "key-on" : "text-muted",
            )}
          >
            {p === "today" ? "Today" : "Becoming"}
          </button>
        ))}
      </div>
    </div>
  );
}
