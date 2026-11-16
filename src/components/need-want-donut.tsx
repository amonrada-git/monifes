"use client";

/**
 * The Need:Want ring, outlined-band style (per the user's sketch): two thin
 * concentric circles form a hollow band. The Want share of spending is drawn
 * as the filled portion of the band; the rest of the band stays open (Need).
 * Open = necessity, filled = chosen fun — same visual language as the month
 * dots, where open means calm.
 */

const TAU = Math.PI * 2;

function pt(cx: number, cy: number, r: number, a: number): string {
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
}

/** An annular (band) sector from angle a0 to a1, clockwise. */
function slicePath(cx: number, cy: number, R: number, r: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${pt(cx, cy, R, a0)}`,
    `A ${R} ${R} 0 ${large} 1 ${pt(cx, cy, R, a1)}`,
    `L ${pt(cx, cy, r, a1)}`,
    `A ${r} ${r} 0 ${large} 0 ${pt(cx, cy, r, a0)}`,
    "Z",
  ].join(" ");
}

export function NeedWantDonut({
  needPct,
  size = 96,
  band = 14,
  hairline = 1,
}: {
  needPct: number; // 0..1 of (need+want)
  size?: number;
  band?: number; // width of the hollow band
  hairline?: number; // outline stroke width
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size - hairline) / 2; // outer edge
  const r = R - band; // inner edge
  const wantPct = Math.max(0, Math.min(1, 1 - needPct));

  const a0 = -Math.PI / 2; // start at 12 o'clock
  const a1 = a0 + wantPct * TAU;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {/* the hollow band: two hairline circles */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--foreground)" strokeWidth={hairline} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--foreground)" strokeWidth={hairline} />

      {/* the Want share, filled into the band */}
      {wantPct >= 0.999 ? (
        // full circle — fill the whole band (a sector path degenerates here)
        <path
          d={`M ${cx - R} ${cy} a ${R} ${R} 0 1 0 ${R * 2} 0 a ${R} ${R} 0 1 0 ${-R * 2} 0 Z
              M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`}
          fill="var(--foreground)"
          fillRule="evenodd"
        />
      ) : wantPct > 0.001 ? (
        <path d={slicePath(cx, cy, R, r, a0, a1)} fill="var(--foreground)" />
      ) : null}
    </svg>
  );
}

/** The calm empty state — the same hollow band, in a quieter gray. */
export function EmptyDonut({
  size = 96,
  band = 14,
  hairline = 1,
}: {
  size?: number;
  band?: number;
  hairline?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size - hairline) / 2;
  const r = R - band;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--muted-2)" strokeWidth={hairline} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--muted-2)" strokeWidth={hairline} />
    </svg>
  );
}
