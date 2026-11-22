"use client";

import { useEffect, useRef, useState } from "react";
import type { Look } from "@/lib/character";
import type { Framing } from "@/lib/clay";
import { cn } from "@/lib/utils";

type Stage = { setLook: (l: Look) => void; dispose: () => void };

/** You, in clay: a live 3D figure that sways, blinks and turns when dragged. */
export function ClayFigure({
  look,
  label,
  className,
}: {
  look: Look;
  label: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const latest = useRef(look);

  useEffect(() => {
    latest.current = look;
    stage.current?.setLook(look);
  }, [look]);

  useEffect(() => {
    let alive = true;
    import("@/lib/clay").then(({ mountStage }) => {
      if (!alive || !host.current) return;
      stage.current = mountStage(host.current, latest.current);
    });
    return () => {
      alive = false;
      stage.current?.dispose();
      stage.current = null;
    };
  }, []);

  return <div ref={host} role="img" aria-label={label} className={cn("relative", className)} />;
}

/** Small renders of each look, for option tiles; null until ready. */
export function useClayThumbs(looks: Look[], framing: Framing) {
  const key = JSON.stringify([looks, framing]);
  const [thumbs, setThumbs] = useState<{ key: string; urls: string[] } | null>(null);

  useEffect(() => {
    let alive = true;
    const [ls, f] = JSON.parse(key) as [Look[], Framing];
    import("@/lib/clay").then(({ renderThumbs }) => {
      if (alive) setThumbs({ key, urls: renderThumbs(ls, f) });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  // Keep showing the last set while a new one renders, so tiles don't flash.
  return thumbs ? thumbs.urls : looks.map(() => null);
}
