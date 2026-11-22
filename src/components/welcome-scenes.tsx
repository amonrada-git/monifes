"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Look } from "@/lib/character";
import { ClayYou } from "./clay-you";

/**
 * Who you could become, as an album of clay photos: one character, the lives
 * the plan makes room for — wealth is time, freedom and calm as much as money.
 *
 * A swipeable strip (native scroll-snap) of overlapping prints: neighbours
 * sit tucked behind at the sides, smaller and tilted; the centred one
 * straightens and comes forward on top. It turns its own pages until someone touches it; with
 * reduced motion it stays put.
 *
 * The moments are places; you stand in each one — your own clay character,
 * waving, placed by hand beside the things that make it (see PLACE).
 */
const SCENES = [
  {
    key: "family",
    caption: "More time with family",
    alt: "A clay picnic laid out for a family: a basket, sliced fruit, a teapot and three cups",
  },
  {
    key: "travel",
    caption: "Free to travel",
    alt: "A clay suitcase with a sun hat and a camera, mountains, a lighthouse and a palm tree behind",
  },
  {
    key: "build",
    caption: "Building your own thing",
    alt: "A little clay market stall of handmade cups and plants, an apron on a hook beside it",
  },
  {
    key: "abundant",
    caption: "Living in abundance",
    alt: "A clay basket overflowing with fruit, bread and flowers",
  },
  {
    key: "peaceful",
    caption: "At peace with money",
    alt: "A cosy clay corner: a floor cushion and blanket, a mug of tea, a plant and books",
  },
  {
    key: "wealthier",
    caption: "Watching your wealth grow",
    alt: "A little clay tree with gold-coin leaves, a watering can and a jar of coins",
  },
] as const;

/**
 * Where you stand in each moment, as fractions of the picture: x is your
 * centre, feet where your feet land, h your height. Tuned by eye so you sit
 * beside the props, not over them.
 */
const PLACE: Record<(typeof SCENES)[number]["key"], { x: number; feet: number; h: number }> = {
  family: { x: 0.15, feet: 0.94, h: 0.5 },
  travel: { x: 0.14, feet: 0.94, h: 0.5 },
  build: { x: 0.13, feet: 0.95, h: 0.5 },
  abundant: { x: 0.14, feet: 0.94, h: 0.5 },
  peaceful: { x: 0.88, feet: 0.95, h: 0.47 },
  wealthier: { x: 0.12, feet: 0.95, h: 0.46 },
};
/** Where the figure sits in its own (square) picture: hair top and feet. */
const FIG = { top: 65 / 720, feet: 670 / 720 };

/** You, standing in a scene, with a soft shadow at your feet. */
function StandIn({ look, at }: { look: Look; at: { x: number; feet: number; h: number } }) {
  const size = at.h / (FIG.feet - FIG.top);
  return (
    <>
      <span
        aria-hidden
        className="absolute rounded-[50%] bg-[#5a4a3a]/25 blur-[6px]"
        style={{
          left: `${(at.x - size * 0.17) * 100}%`,
          top: `${(at.feet - size * 0.03) * 100}%`,
          width: `${size * 0.34 * 100}%`,
          height: `${size * 0.05 * 100}%`,
        }}
      />
      <span
        className="absolute"
        style={{
          left: `${(at.x - size / 2) * 100}%`,
          top: `${(at.feet - FIG.feet * size) * 100}%`,
          width: `${size * 100}%`,
        }}
      >
        <ClayYou look={look} cut className="w-full" />
      </span>
    </>
  );
}

/** Card width: most of the strip, but short enough by height that Begin stays in view. */
const CARD = "min(68%,38dvh)";
/** Prints overlap like a fanned stack; the centred one sits on top. */
const OVERLAP = 44;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function WelcomeScenes({ look, className }: { look?: Look; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(() => !reducedMotion());

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
            <Image
              src={`/scenes/${s.key}.webp`}
              alt={s.alt}
              width={720}
              height={720}
              priority={i < 2}
              draggable={false}
              className="h-full w-full select-none object-cover"
            />
            {look && <StandIn look={look} at={PLACE[s.key]} />}
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
