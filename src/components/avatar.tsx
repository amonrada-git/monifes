import type { Look } from "@/lib/character";
import { cn } from "@/lib/utils";

/**
 * You, drawn in ink: a head-and-shoulders bust on a 240 × 240 grid, stacked
 * back to front — back hair, body, neck, collar, face, front hair, glasses,
 * item. Thick round strokes, solid ink or white fills, nothing else.
 */

const INK = "var(--foreground)";
const WHITE = "#fff";
const LIGHT = "#d3cec5"; // light hair: blonde, grey, dyed
const SW = 3.2; // the one line weight: thin and even, like the metal edge of a pin

/** Where to look: the whole bust, or a close crop of the head for option tiles. */
const VIEW = { bust: "4 22 232 218", head: "56 22 128 150" } as const;

export function Avatar({
  look,
  crop = "bust",
  label,
  alive,
  className,
}: {
  look: Look;
  crop?: keyof typeof VIEW;
  label?: string;
  /** Blinks now and then (the big one only — a grid of tiles blinking in step is eerie). */
  alive?: boolean;
  className?: string;
}) {
  const hair = look.hairTone === "dark" ? INK : LIGHT;
  return (
    <svg
      viewBox={VIEW[crop]}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block", className)}
      stroke={INK}
      strokeWidth={SW}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <HairBack kind={look.hair} fill={hair} />
      <Body top={look.top} />
      <HairDrape kind={look.hair} fill={hair} />
      <Neck />
      <Collar top={look.top} />
      {/* ears, then the face over their inner edge */}
      <ellipse cx={79} cy={118} rx={8} ry={10} fill={WHITE} />
      <ellipse cx={161} cy={118} rx={8} ry={10} fill={WHITE} />
      <path
        d="M78 104 C78 70 162 70 162 104 L162 122 C162 146 144 160 120 160 C96 160 78 146 78 122 Z"
        fill={WHITE}
      />
      <Extra kind={look.extra} hair={hair} />
      <Face eyes={look.eyes} alive={alive} />
      <HairFront kind={look.hair} fill={hair} />
      <Gloss kind={look.hair} />
      <Glasses kind={look.glasses} />
      <Item kind={look.item} />
    </svg>
  );
}

// ─── Hair ─────────────────────────────────────────────────────────────────────

const circles = (cs: [number, number, number][], fill: string) =>
  cs.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} fill={fill} />);

function HairBack({ kind, fill }: { kind: Look["hair"]; fill: string }) {
  switch (kind) {
    case "bob":
      return (
        <path
          d="M70 108 C66 46 174 46 170 108 L172 154 C172 163 163 166 157 161 L83 161 C77 166 68 163 68 154 Z"
          fill={fill}
        />
      );
    case "curly":
      return <g>{circles([[74, 124, 14], [166, 124, 14], [76, 142, 11], [164, 142, 11]], fill)}</g>;
    case "bun":
      return <circle cx={120} cy={52} r={17} fill={fill} />;
    case "ponytail":
      return (
        <path d="M150 72 C184 72 194 122 178 162 C172 146 166 118 148 100 Z" fill={fill} />
      );
    default:
      return null;
  }
}

/** Long hair falls in front of the shoulders, so it sits over the body. */
function HairDrape({ kind, fill }: { kind: Look["hair"]; fill: string }) {
  if (kind !== "long") return null;
  return (
    <path
      d="M72 104 C68 50 172 50 168 104 L174 202 C174 211 163 214 156 208 L84 208 C77 214 66 211 66 202 Z"
      fill={fill}
    />
  );
}

function HairFront({ kind, fill }: { kind: Look["hair"]; fill: string }) {
  switch (kind) {
    case "bob":
      return (
        <path
          d="M76 110 C70 50 170 50 164 110 C157 101 147 92 141 80 C125 97 99 105 76 110 Z"
          fill={fill}
        />
      );
    case "short":
      return (
        <g fill={fill}>
          <path d="M76 114 C68 60 104 46 126 50 C154 54 172 76 164 114 C160 104 156 97 152 92 C136 99 108 97 92 88 C88 99 83 106 76 114 Z" />
          <path d="M118 50 C114 40 124 36 130 42" fill="none" />
        </g>
      );
    case "curly":
      return (
        <g>
          {circles(
            [
              [84, 94, 15], [96, 76, 18], [118, 66, 20], [140, 72, 19], [156, 90, 16],
              [78, 110, 10], [162, 110, 10], [108, 86, 14], [130, 84, 14],
            ],
            fill,
          )}
        </g>
      );
    case "long":
      return (
        <path
          d="M76 112 C70 54 170 54 164 112 C152 100 130 86 120 72 C110 86 88 100 76 112 Z"
          fill={fill}
        />
      );
    case "bun":
    case "ponytail":
      return <path d="M78 106 C74 56 166 56 162 106 C146 92 94 92 78 106 Z" fill={fill} />;
    case "crop":
      return <path d="M80 100 C78 60 162 60 160 100 C142 89 98 89 80 100 Z" fill={fill} />;
    case "beanie":
      return (
        <g>
          <circle cx={120} cy={46} r={10} fill={fill} />
          <path d="M78 100 C74 44 166 44 162 100 Z" fill={fill} />
          <rect x={72} y={92} width={96} height={20} rx={10} fill={fill} />
          <g stroke={fill === INK ? WHITE : INK} strokeWidth={2.2}>
            {[88, 104, 120, 136, 152].map((x) => (
              <path key={x} d={`M${x} 97 L${x} 107`} />
            ))}
          </g>
        </g>
      );
    default:
      return null;
  }
}

/** The shine on enamel: one short white stroke across the top of the hair. */
const GLOSS: Partial<Record<Look["hair"], string>> = {
  bob: "M88 82 Q95 68 110 62",
  short: "M90 76 Q98 62 114 57",
  curly: "M106 62 Q111 56 118 55 M80 88 Q82 82 87 80",
  long: "M88 84 Q95 70 110 65",
  bun: "M90 82 Q97 70 110 66 M112 45 Q115 40 121 39",
  ponytail: "M90 82 Q97 70 110 66",
  crop: "M92 80 Q100 70 112 67",
  beanie: "M90 74 Q97 60 110 55",
};

function Gloss({ kind }: { kind: Look["hair"] }) {
  const d = GLOSS[kind];
  return d ? <path d={d} fill="none" stroke={WHITE} strokeWidth={3} opacity={0.9} /> : null;
}

// ─── Body ─────────────────────────────────────────────────────────────────────

const SHOULDERS =
  "M50 242 C52 204 72 186 100 180 C108 190 132 190 140 180 C168 186 188 204 190 242 Z";
const NECKLINE = "M100 180 C108 190 132 190 140 180";
const SLEEVES = "M80 214 L78 242 M160 214 L162 242";

function Body({ top }: { top: Look["top"] }) {
  const dark = top === "knit" || top === "turtleneck";
  return (
    <g>
      <path d={SHOULDERS} fill={dark ? INK : WHITE} />
      <path d={SLEEVES} fill="none" stroke={dark ? WHITE : INK} strokeWidth={dark ? 2.4 : SW} />
      {top === "overalls" && (
        <g>
          <path d="M98 242 L98 208 L142 208 L142 242" fill={WHITE} />
          <path d="M100 208 L94 186 M140 208 L146 186" fill="none" />
          <circle cx={103} cy={215} r={3} fill={INK} stroke="none" />
          <circle cx={137} cy={215} r={3} fill={INK} stroke="none" />
          <rect x={110} y={220} width={20} height={14} rx={3} fill={WHITE} strokeWidth={2.6} />
        </g>
      )}
      {top === "hoodie" && (
        <g strokeWidth={2.6}>
          <path d="M112 194 L110 216 M128 194 L130 216" fill="none" />
          <circle cx={110} cy={219} r={2.5} fill={INK} />
          <circle cx={130} cy={219} r={2.5} fill={INK} />
        </g>
      )}
      {top === "shirt" && <path d="M120 194 L120 242" fill="none" />}
    </g>
  );
}

function Neck() {
  return (
    <g>
      <path d="M108 150 L108 185 Q120 191 132 185 L132 150 Z" fill={WHITE} stroke="none" />
      <path d="M108 150 L108 184 M132 150 L132 184" fill="none" />
    </g>
  );
}

/** What sits round the neck, drawn over it. */
function Collar({ top }: { top: Look["top"] }) {
  switch (top) {
    case "shirt":
      return (
        <g fill={WHITE}>
          <path d="M106 181 L96 199 L119 192 Z" />
          <path d="M134 181 L144 199 L121 192 Z" />
        </g>
      );
    case "hoodie":
      return <path d="M92 181 C94 202 146 202 148 181 C140 192 100 192 92 181 Z" fill={WHITE} />;
    case "knit":
      return (
        <g fill="none">
          <path d={NECKLINE} />
          <path d="M103 185 C111 195 129 195 137 185" stroke={WHITE} strokeWidth={2.2} />
        </g>
      );
    case "turtleneck":
      return (
        <g>
          <rect x={101} y={156} width={38} height={34} rx={12} fill={INK} />
          <path d="M110 170 L110 182 M120 170 L120 183 M130 170 L130 182" stroke={WHITE} strokeWidth={2.2} />
        </g>
      );
    default:
      return <path d={NECKLINE} fill="none" />;
  }
}

// ─── Face ─────────────────────────────────────────────────────────────────────

const EYE_L = 103;
const EYE_R = 137;
const EYE_Y = 123;

function Face({ eyes, alive }: { eyes: Look["eyes"]; alive?: boolean }) {
  return (
    <g>
      <g className={alive ? "blink" : undefined}>
        {[EYE_L, EYE_R].map((x, i) => {
          const out = i === 0 ? -1 : 1;
          switch (eyes) {
            case "happy":
              return <path key={x} d={`M${x - 5} ${EYE_Y + 1.5} Q${x} ${EYE_Y - 4} ${x + 5} ${EYE_Y + 1.5}`} fill="none" strokeWidth={3} />;
            case "lashes":
              return (
                <g key={x}>
                  <circle cx={x} cy={EYE_Y} r={3} fill={INK} stroke="none" />
                  <path
                    d={`M${x + out * 2} ${EYE_Y - 1} Q${x + out * 6} ${EYE_Y - 1.5} ${x + out * 8.5} ${EYE_Y - 4.5}`}
                    fill="none"
                    strokeWidth={2.2}
                  />
                </g>
              );
            case "big":
              return (
                <g key={x}>
                  <circle cx={x} cy={EYE_Y} r={6} fill={WHITE} strokeWidth={2.4} />
                  <circle cx={x + 1} cy={EYE_Y + 0.5} r={2.6} fill={INK} stroke="none" />
                </g>
              );
            case "sleepy":
              return <path key={x} d={`M${x - 4} ${EYE_Y + 1} L${x + 4} ${EYE_Y + 1}`} strokeWidth={3} />;
            default:
              return <circle key={x} cx={x} cy={EYE_Y} r={3} fill={INK} stroke="none" />;
          }
        })}
      </g>
      <path d="M117 142 L123 142" fill="none" strokeWidth={2.4} />
    </g>
  );
}

function Extra({ kind, hair }: { kind: Look["extra"]; hair: string }) {
  switch (kind) {
    case "blush":
      return (
        <g fill="var(--muted-2)" stroke="none" opacity={0.35}>
          <ellipse cx={95} cy={135} rx={7} ry={3.5} />
          <ellipse cx={145} cy={135} rx={7} ry={3.5} />
        </g>
      );
    case "freckles":
      return (
        <g fill={INK} stroke="none">
          {[[92, 131], [98, 135], [90, 137], [148, 131], [142, 135], [150, 137]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={1.6} />
          ))}
        </g>
      );
    case "mustache":
      return (
        <path
          d="M108 136 C112 129 118 130 120 134 C122 130 128 129 132 136 C126 139 114 139 108 136 Z"
          fill={hair}
          strokeWidth={2.4}
        />
      );
    case "beard":
      return (
        <path
          d="M80 128 C82 150 98 164 120 164 C142 164 158 150 160 128 C154 136 148 140 141 139 C134 150 106 150 99 139 C92 140 86 136 80 128 Z"
          fill={hair}
          strokeWidth={3}
        />
      );
    default:
      return null;
  }
}

function Glasses({ kind }: { kind: Look["glasses"] }) {
  if (kind === "none") return null;
  const lens = kind === "sunnies" ? INK : "none";
  return (
    <g strokeWidth={2.6} fill={lens}>
      {kind === "square" ? (
        <>
          <rect x={89} y={112} width={28} height={22} rx={6} />
          <rect x={123} y={112} width={28} height={22} rx={6} />
        </>
      ) : (
        <>
          <circle cx={EYE_L} cy={EYE_Y} r={13} />
          <circle cx={EYE_R} cy={EYE_Y} r={13} />
        </>
      )}
      <path d="M117 122 Q120 119 123 122 M90 120 L80 117 M150 120 L160 117" fill="none" />
      {kind === "sunnies" && (
        <path d="M96 117 L100 114 M130 117 L134 114" stroke={WHITE} strokeWidth={2.2} />
      )}
    </g>
  );
}

// ─── Things you carry ────────────────────────────────────────────────────────

/** A hand rising from the bottom edge, holding something. */
const HAND = "M140 242 C140 226 141 214 148 210 L164 210 C171 214 172 226 172 242";

function Item({ kind }: { kind: Look["item"] }) {
  switch (kind) {
    case "coffee":
      return (
        <g fill={WHITE}>
          <path d="M150 166 C146 160 154 156 150 150 M160 166 C156 160 164 156 160 150" fill="none" strokeWidth={2.4} />
          <path d="M144 180 L168 180 L164 218 L148 218 Z" />
          <rect x={141} y={173} width={30} height={9} rx={4} />
          <path d={HAND} />
          <path d="M148 216 L164 216" fill="none" strokeWidth={2.4} />
        </g>
      );
    case "plant":
      return (
        <g fill={WHITE}>
          <path d="M156 196 L156 176" fill="none" strokeWidth={2.6} />
          <ellipse cx={148} cy={176} rx={6} ry={11} transform="rotate(-35 148 176)" fill={INK} />
          <ellipse cx={164} cy={172} rx={6} ry={11} transform="rotate(30 164 172)" fill={INK} />
          <path d="M141 194 L171 194 L167 220 L145 220 Z" />
          <path d={HAND} />
        </g>
      );
    case "book":
      return (
        <g>
          <g transform="rotate(-8 156 200)">
            <rect x={139} y={176} width={36} height={46} rx={4} fill={INK} />
            <path d="M146 180 L146 218" stroke={WHITE} strokeWidth={2.2} />
          </g>
          <path d={HAND} fill={WHITE} />
        </g>
      );
    case "camera":
      return (
        <g>
          <path d="M109 188 L103 202 M131 188 L137 202" fill="none" strokeWidth={2.4} />
          <rect x={95} y={200} width={50} height={32} rx={8} fill={INK} />
          <circle cx={120} cy={216} r={10} fill={WHITE} strokeWidth={2.4} />
          <circle cx={120} cy={216} r={4} fill={INK} stroke="none" />
          <rect x={131} y={204} width={8} height={5} rx={2} fill={WHITE} stroke="none" />
        </g>
      );
    case "cat":
      // A black cat perched on your shoulder.
      return (
        <g>
          <path
            d="M52 206 C52 188 56 180 58 170 L69 180 L81 180 L92 170 C94 180 98 188 98 206 C98 218 52 218 52 206 Z"
            fill={INK}
          />
          <circle cx={66} cy={197} r={5.2} fill={WHITE} stroke="none" />
          <circle cx={84} cy={197} r={5.2} fill={WHITE} stroke="none" />
          <circle cx={66.5} cy={197.5} r={2.4} fill={INK} stroke="none" />
          <circle cx={84.5} cy={197.5} r={2.4} fill={INK} stroke="none" />
          <path d="M57 188 Q59 182 63 179" fill="none" stroke={WHITE} strokeWidth={2.4} opacity={0.9} />
          <path d="M55 205 L62 206 M55 211 L62 210 M95 205 L88 206 M95 211 L88 210" stroke={WHITE} strokeWidth={1.8} />
          <path d="M72 207 L75 209 L78 207" fill="none" stroke={WHITE} strokeWidth={1.8} />
        </g>
      );
    default:
      return null;
  }
}
