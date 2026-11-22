"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BUCKETS, type Budget } from "@/lib/types";
import { totalOf, wealthOf, type PlanPart, type PlanKind } from "@/lib/plan";

/**
 * Income as one ring — the same hollow band as the Home Need:Want ring, cut
 * into the four buckets clockwise from 12 o'clock:
 *   ○ ink outline — Necessities (need stays open, as on the Home ring)
 *   ● ink         — Guilt-free (want is filled)
 *   ● gray        — Investments
 *   ○ gray outline — Savings goals
 * Whatever no bucket covers is left as the bare gray track. The ring sweeps
 * open on first show and glides when the plan changes.
 */

const TAU = Math.PI * 2;

const STYLE: Record<PlanKind, { fill: string; stroke: string }> = {
  necessities: { fill: "none", stroke: "var(--foreground)" },
  "guilt-free": { fill: "var(--foreground)", stroke: "var(--foreground)" },
  investments: { fill: "var(--muted)", stroke: "var(--muted)" },
  savings: { fill: "none", stroke: "var(--muted)" },
};

function pt(cx: number, cy: number, r: number, a: number): string {
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
}

/** An annular (band) sector from angle a0 to a1, clockwise. */
function slicePath(c: number, R: number, r: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${pt(c, c, R, a0)}`,
    `A ${R} ${R} 0 ${large} 1 ${pt(c, c, R, a1)}`,
    `L ${pt(c, c, r, a1)}`,
    `A ${r} ${r} 0 ${large} 0 ${pt(c, c, r, a0)}`,
    "Z",
  ].join(" ");
}

/** The whole band as one shape (a sector path degenerates at 360°). */
function bandPath(c: number, R: number, r: number): string {
  return `M ${c - R} ${c} a ${R} ${R} 0 1 0 ${R * 2} 0 a ${R} ${R} 0 1 0 ${-R * 2} 0 Z
          M ${c - r} ${c} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
}

const SIZES = {
  lg: { size: 232, band: 30, gap: 4 },
  sm: { size: 136, band: 18, gap: 3 },
};

export function PlanRing({
  parts,
  size = "lg",
  label,
  className,
  children,
}: {
  parts: PlanPart[]; // shares 0..1, in bucket order
  size?: "lg" | "sm";
  label: string;
  className?: string;
  children?: React.ReactNode; // shown in the hole
}) {
  const { size: px, band, gap } = SIZES[size];
  const stroke = size === "lg" ? 1.5 : 1;
  const c = px / 2;
  const R = c - stroke;
  const r = R - band;
  const tweened = useTweened(parts.map((p) => p.share));
  // Parts can change length (e.g. empty → a plan) a frame before the tween does.
  const shares = parts.map((_, i) => tweened[i] ?? 0);

  // Angular gap so the space between slices reads the same across the band.
  const gapA = gap / ((R + r) / 2);
  const drawn = shares.filter((s) => s > 0.002).length;

  // Each slice starts where the ones before it end, from 12 o'clock.
  const starts = shares.map((_, i) => -Math.PI / 2 + shares.slice(0, i).reduce((t, s) => t + s, 0) * TAU);
  const slices = parts.map((p, i) => {
    const span = shares[i] * TAU;
    const a0 = starts[i];
    if (shares[i] <= 0.002) return null;
    const { fill, stroke: line } = STYLE[p.kind];
    const props = { fill, stroke: line, strokeWidth: stroke, strokeLinejoin: "round" as const };
    if (drawn === 1 && shares[i] >= 0.999) {
      return <path key={p.kind} d={bandPath(c, R - stroke / 2, r + stroke / 2)} fillRule="evenodd" {...props} />;
    }
    // Trim half a gap off each end; very thin slices keep a sliver.
    const trim = Math.min(gapA / 2, span * 0.3);
    return (
      <path
        key={p.kind}
        d={slicePath(c, R - stroke / 2, r + stroke / 2, a0 + trim, a0 + span - trim)}
        {...props}
      />
    );
  });

  return (
    <div
      className={cn("relative mx-auto", className)}
      style={{ width: px, height: px }}
      role="img"
      aria-label={label}
    >
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden>
        {/* the bare track — income nothing is assigned to */}
        <circle cx={c} cy={c} r={R - stroke / 2} fill="none" stroke="var(--muted-2)" strokeWidth={1} opacity={0.6} />
        <circle cx={c} cy={c} r={r + stroke / 2} fill="none" stroke="var(--muted-2)" strokeWidth={1} opacity={0.6} />
        {slices}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

/** The key beside each bucket — a tiny piece of its slice. */
export function Swatch({ kind }: { kind: PlanKind }) {
  const { fill, stroke } = STYLE[kind];
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" className="shrink-0" aria-hidden>
      <rect x={0.75} y={0.75} width={10.5} height={10.5} rx={3} fill={fill} stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}

/** The share of pay that builds wealth — the number the hole is for. */
export function WealthShare({ budget, income }: { budget: Budget; income: number }) {
  const pct = Math.round((wealthOf(budget) / Math.max(income, totalOf(budget), 1)) * 100);
  return (
    <>
      <span className="tnum text-lg font-medium">{pct}%</span>
      <span className="text-[11px] leading-tight text-muted">builds wealth</span>
    </>
  );
}

/** A compact key for rings shown without their bucket list. */
export function RingKey({ className }: { className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-2", className)}>
      {BUCKETS.map((b) => (
        <li key={b.key} className="flex items-center gap-2 text-xs text-muted">
          <Swatch kind={b.key} />
          {b.label}
        </li>
      ))}
    </ul>
  );
}

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Numbers that glide to new values together (easeOutCubic). Starts from 0. */
function useTweened(targets: number[], duration = 700): number[] {
  const [shown, setShown] = useState(() => targets.map(() => 0));
  const from = useRef(shown);
  const key = targets.join(",");

  useEffect(() => {
    const goal = key.split(",").map(Number);
    const origin = goal.map((_, i) => from.current[i] ?? 0);
    const start = performance.now();
    const reduce = reduceMotion();
    let id = 0;
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / duration);
      const v = goal.map((g, i) => origin[i] + (g - origin[i]) * ease(t));
      from.current = v;
      setShown(v);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [key, duration]);

  return shown;
}

/** A number that glides to its new value (easeOutCubic, ~0.7s). */
export function useCountUp(target: number, duration = 700): number {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    const reduce = reduceMotion();
    let id = 0;
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / duration);
      const v = origin + (target - origin) * ease(t);
      from.current = v;
      setShown(v);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);

  return shown;
}
