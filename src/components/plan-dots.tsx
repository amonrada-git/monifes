"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DotKind } from "@/lib/plan";

/**
 * Income as 100 dots, 1% each — the same dot language as the month grid:
 *   ○ ink ring    — Necessities (need stays open, as on the Home ring)
 *   ● ink         — Guilt-free (want is filled)
 *   ● gray        — Investments
 *   ○ gray ring   — Savings goals
 *   · faint       — not accounted for
 * Dots grow in with a gentle wave on first show, and glide between kinds when
 * the plan changes.
 */

const KIND: Record<DotKind, string> = {
  necessities: "scale-100 border-[1.5px] border-foreground bg-transparent",
  "guilt-free": "scale-100 border-[1.5px] border-foreground bg-foreground",
  investments: "scale-100 border-[1.5px] border-muted bg-muted",
  savings: "scale-100 border-[1.5px] border-muted bg-transparent",
  open: "scale-50 border-[1.5px] border-transparent bg-border/60",
};

export function PlanDots({
  dots,
  size = "lg",
  className,
}: {
  dots: DotKind[];
  size?: "lg" | "sm";
  className?: string;
}) {
  // Start as faint specks, then settle into place one by one.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn("grid grid-cols-10", size === "lg" ? "gap-2.5" : "gap-1.5", className)}
      role="img"
      aria-label="Your income as 100 dots"
    >
      {dots.map((kind, i) => (
        <span
          key={i}
          style={{ transitionDelay: `${settled ? i * 7 : 0}ms` }}
          className={cn(
            "aspect-square rounded-full transition-all duration-500 ease-out motion-reduce:transition-none",
            size === "sm" && "border-[1px]!",
            settled ? KIND[kind] : "scale-50 border-[1.5px] border-transparent bg-border/40",
          )}
        />
      ))}
    </div>
  );
}

export function DotSwatch({ kind }: { kind: DotKind }) {
  return <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", KIND[kind])} />;
}

/** A number that glides to its new value (easeOutCubic, ~0.7s). */
export function useCountUp(target: number, duration = 700): number {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let id = 0;
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / duration);
      const v = origin + (target - origin) * (1 - Math.pow(1 - t, 3));
      from.current = v;
      setShown(v);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);

  return shown;
}
