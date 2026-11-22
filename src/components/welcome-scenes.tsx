"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useClayYou } from "@/lib/clay-you";

/**
 * Who you could become, as an album of clay photos: one character, the lives
 * the plan makes room for — wealth is time, freedom and calm as much as money.
 *
 * A swipeable strip (native scroll-snap) of overlapping prints: neighbours
 * sit tucked behind at the sides, smaller and tilted; the centred one
 * straightens and comes forward on top. It turns its own pages until someone touches it; with
 * reduced motion it stays put.
 *
 * Once you've made your clay you, each moment is repainted with you in it;
 * until a picture arrives it shows the shared art, softly blurred, "painting".
 */
const SCENES = [
  {
    key: "family",
    caption: "More time with family",
    alt: "A clay figure laughing on a picnic blanket with their mother and a small child",
  },
  {
    key: "travel",
    caption: "Free to travel",
    alt: "A clay figure in a sun hat with a camera and a suitcase, mountains and a lighthouse behind",
  },
  {
    key: "build",
    caption: "Building your own thing",
    alt: "A clay figure in an apron setting up their own little market stall of handmade cups",
  },
  {
    key: "abundant",
    caption: "Living in abundance",
    alt: "A clay figure carrying a basket overflowing with fruit, bread and flowers",
  },
  {
    key: "peaceful",
    caption: "At peace with money",
    alt: "A clay figure sitting calmly on a cushion with eyes closed, holding a mug of tea",
  },
  {
    key: "wealthier",
    caption: "Watching your wealth grow",
    alt: "A clay figure watering a little tree whose leaves are gold coins, beside a jar of coins",
  },
] as const;

/** Card width: most of the strip, but short enough by height that Begin stays in view. */
const CARD = "min(68%,38dvh)";
/** Prints overlap like a fanned stack; the centred one sits on top. */
const OVERLAP = 44;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function WelcomeScenes({ className }: { className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const mine = useClayYou();

  // Tilt and scale each print by its distance from the centre. Written straight
  // to the DOM each frame so swiping stays smooth.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let nearest = 0;
      let best = Infinity;
      cards.current.forEach((card, i) => {
        if (!card) return;
        const step = card.offsetWidth - OVERLAP;
        const d = (card.offsetLeft + card.offsetWidth / 2 - mid) / step;
        const a = Math.min(1.5, Math.abs(d));
        card.style.transform = `scale(${1 - 0.12 * a}) rotate(${Math.max(-1.5, Math.min(1.5, d)) * 4}deg)`;
        card.style.zIndex = String(10 - Math.round(a * 4));
        card.style.filter = `brightness(${1 - 0.06 * Math.min(1, a)})`;
        if (Math.abs(d) < best) {
          best = Math.abs(d);
          nearest = i;
        }
      });
      setActive(nearest);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const goTo = (i: number) => {
    const el = track.current;
    const card = cards.current[i];
    if (!el || !card) return;
    el.scrollTo({
      left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  };

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => goTo((active + 1) % SCENES.length), 3400);
    return () => clearInterval(id);
  }, [playing, active]);

  const stop = () => setPlaying(false);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        ref={track}
        onPointerDown={stop}
        onWheel={stop}
        onTouchStart={stop}
        className="no-scrollbar -mx-6 flex w-[calc(100%+3rem)] snap-x snap-mandatory overflow-x-auto py-4"
        aria-roledescription="carousel"
        aria-label="Who you could become"
      >
        <div aria-hidden className="shrink-0" style={{ width: `calc((100% - ${CARD}) / 2)` }} />
        {SCENES.map((s, i) => (
          <div
            key={s.key}
            ref={(node) => {
              cards.current[i] = node;
            }}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SCENES.length}: ${s.caption}`}
            className="raised relative aspect-square shrink-0 snap-center overflow-hidden rounded-[28px] will-change-transform"
            style={{ width: CARD, marginLeft: i === 0 ? 0 : -OVERLAP }}
          >
            {mine.pics[s.key] ? (
              <Image
                src={mine.pics[s.key]!}
                alt={`You: ${s.caption.toLowerCase()}`}
                fill
                unoptimized
                draggable={false}
                className="rise select-none object-cover"
              />
            ) : (
              <Image
                src={`/welcome/${s.key}.webp`}
                alt={s.alt}
                width={720}
                height={720}
                priority={i < 2}
                draggable={false}
                className={cn(
                  "h-full w-full select-none object-cover transition",
                  mine.painting.includes(s.key) && "scale-110 blur-xl opacity-60",
                )}
              />
            )}
            {!mine.pics[s.key] && mine.painting.includes(s.key) && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="raised rounded-full px-3.5 py-1.5 text-[13px] text-muted">
                  Painting you in…
                </span>
              </span>
            )}
          </div>
        ))}
        <div aria-hidden className="shrink-0" style={{ width: `calc((100% - ${CARD}) / 2)` }} />
      </div>

      <p key={active} className="rise mt-1 text-[17px] font-medium" aria-live="polite">
        {SCENES[active].caption}
      </p>

      <div className="mt-3 flex items-center gap-1.5">
        {SCENES.map((s, i) => (
          <button
            key={s.key}
            onClick={() => {
              stop();
              goTo(i);
            }}
            aria-label={`Show ${s.caption.toLowerCase()}`}
            aria-current={i === active}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === active ? "w-5 bg-foreground" : "w-1.5 bg-muted-2/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}
