"use client";

import { cn } from "@/lib/utils";
import type { DayDot } from "@/lib/compute";

/**
 * The month as a grid of dots (thedot.space reference — days as dots).
 * The semantics are monifes' own quiet inversion:
 *   ● filled  — a day you spent
 *   ○ ring    — a no-spend win (not spending leaves the dot open)
 *   · faint   — a quiet past day (no check-in)
 *   future days are barely-there
 */

export function MonthDots({ dots, today }: { dots: DayDot[]; today: number }) {
  return (
    <div className="grid grid-cols-7 justify-items-center gap-y-3">
      {dots.map((d, i) => {
        const isToday = i + 1 === today;
        return (
          <span
            key={i}
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full",
              // a thin offset ring quietly marks today
              isToday && "ring-1 ring-foreground/40 ring-offset-2 ring-offset-card",
            )}
          >
            <span
              className={cn(
                "rounded-full",
                d === "spent" && "h-3 w-3 bg-foreground",
                d === "no-spend" && "h-3 w-3 border-2 border-foreground bg-transparent",
                d === "quiet" && "h-1.5 w-1.5 bg-border",
                d === "future" && "h-1.5 w-1.5 bg-border/50",
              )}
            />
          </span>
        );
      })}
    </div>
  );
}

export function MonthDotsLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px] font-medium text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground" /> spent
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-foreground" /> no-spend
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-border" /> quiet
      </span>
    </div>
  );
}
