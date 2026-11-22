"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Who you could become, in clay: one character, three lives the plan leads
 * to. The scenes crossfade on their own until someone taps one; with reduced
 * motion they hold still on the first.
 */
const SCENES = [
  {
    key: "wealthier",
    label: "Wealthier",
    alt: "A clay figure watering a little tree whose leaves are gold coins, beside a jar of coins",
  },
  {
    key: "abundant",
    label: "Abundant",
    alt: "A clay figure carrying a basket overflowing with fruit, bread and flowers",
  },
  {
    key: "peaceful",
    label: "At peace",
    alt: "A clay figure sitting calmly on a cushion with eyes closed, holding a mug of tea",
  },
] as const;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function WelcomeScenes({ className }: { className?: string }) {
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setShown((i) => (i + 1) % SCENES.length), 3200);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Sized by the screen's height too, so the Begin button stays in view. */}
      <div className="raised relative aspect-square w-[min(100%,38dvh)] overflow-hidden rounded-[32px]">
        {SCENES.map((s, i) => (
          <Image
            key={s.key}
            src={`/welcome/${s.key}.webp`}
            alt={s.alt}
            width={720}
            height={720}
            priority={i === 0}
            aria-hidden={i !== shown}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
              i === shown ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
            )}
          />
        ))}
      </div>

      <div className="tray mt-5 inline-flex gap-1 rounded-2xl p-1" role="tablist">
        {SCENES.map((s, i) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={i === shown}
            onClick={() => {
              setPlaying(false);
              setShown(i);
            }}
            className={cn(
              "h-9 rounded-xl px-4 text-sm transition",
              i === shown ? "key-on" : "text-muted",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
