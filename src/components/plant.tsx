"use client";

/**
 * The seed-to-plant. Grows through 6 stages (0=seed … 5=flourishing).
 * Calm and hand-drawn in feel — it's a companion, not a scoreboard.
 */
export function Plant({ stage, size = 120 }: { stage: number; size?: number }) {
  const s = Math.max(0, Math.min(5, stage));
  // Monochrome for now — stem/leaves in grays, driven by the theme vars
  // where possible so a future palette swap mostly Just Works.
  const green = "var(--success)";
  const leaf = "#8c8c8c";
  const accent = "var(--accent)";

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      {/* pot */}
      <path
        d="M38 84 h44 l-5 26 a4 4 0 0 1 -4 3 h-26 a4 4 0 0 1 -4 -3 z"
        fill="var(--accent-soft)"
      />
      <rect x="34" y="78" width="52" height="10" rx="5" fill="#d9d9d9" />

      {/* soil mound + seed (always) */}
      <ellipse cx="60" cy="83" rx="18" ry="4" fill="#b3b3b3" />
      {s === 0 && <ellipse cx="60" cy="80" rx="4" ry="5" fill="#6b6b6b" />}

      {/* stem — height grows with stage */}
      {s >= 1 && (
        <path
          d={`M60 82 C 58 ${82 - s * 8}, 62 ${80 - s * 9}, 60 ${78 - s * 10}`}
          stroke={green}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}

      {/* lower leaves */}
      {s >= 2 && (
        <>
          <path d="M60 70 C 48 66, 42 72, 44 78 C 54 78, 60 74, 60 70 Z" fill={leaf} />
          <path d="M60 66 C 72 62, 78 68, 76 74 C 66 74, 60 70, 60 66 Z" fill={green} />
        </>
      )}

      {/* upper leaves */}
      {s >= 3 && (
        <>
          <path d="M60 54 C 47 49, 40 55, 43 62 C 54 62, 60 58, 60 54 Z" fill={green} />
          <path d="M60 50 C 73 45, 80 51, 77 58 C 66 58, 60 54, 60 50 Z" fill={leaf} />
        </>
      )}

      {/* bud */}
      {s === 4 && <circle cx="60" cy="40" r="7" fill={accent} opacity="0.85" />}

      {/* bloom */}
      {s >= 5 && (
        <g>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="60"
              cy="30"
              rx="6"
              ry="11"
              fill={accent}
              transform={`rotate(${deg} 60 38)`}
              opacity="0.9"
            />
          ))}
          <circle cx="60" cy="38" r="6" fill="#d4d4d4" />
        </g>
      )}
    </svg>
  );
}
