"use client";

import { useState } from "react";
import Image from "next/image";
import { Shuffle } from "lucide-react";
import {
  GLASSES,
  HAIR_COLOR,
  HAIR_STYLES,
  ITEMS,
  SKIN,
  TOP_COLOR,
  TOP_STYLES,
  randomLook,
  type Look,
} from "@/lib/character";
import type { Framing } from "@/lib/clay";
import { cn } from "@/lib/utils";
import { ClayFigure, useClayThumbs } from "./clay-figure";

const TABS = ["Hair", "Skin", "Outfit", "Glasses", "Item"] as const;
type Tab = (typeof TABS)[number];

/**
 * Make a little you: a clay figure on a raised stage, with a tray of parts
 * underneath. Each option tile shows the figure wearing that option.
 */
export function CharacterBuilder({
  look,
  onChange,
  name,
}: {
  look: Look;
  onChange: (l: Look) => void;
  name: string;
}) {
  const [tab, setTab] = useState<Tab>("Hair");
  const set = (patch: Partial<Look>) => onChange({ ...look, ...patch });

  return (
    <div className="flex flex-col">
      <div className="raised relative h-[min(300px,36dvh)] overflow-hidden rounded-[28px]">
        <ClayFigure look={look} label={`${name || "Your"} clay figure`} className="h-full w-full" />
        <button
          onClick={() => onChange(randomLook())}
          aria-label="Surprise me"
          className="raised absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full text-muted transition active:scale-95"
        >
          <Shuffle size={17} />
        </button>
      </div>

      <div className="tray mt-4 flex gap-1 rounded-2xl p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "h-9 flex-1 rounded-xl text-[13px] transition",
              tab === t ? "key-on" : "text-muted",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {tab === "Hair" && (
          <>
            <Swatches
              colors={HAIR_COLOR}
              value={look.hairColor}
              onPick={(hairColor) => set({ hairColor })}
              label="Hair colour"
            />
            <Tiles
              className="mt-3"
              framing="head"
              look={look}
              options={HAIR_STYLES}
              value={look.hair}
              apply={(hair) => ({ hair })}
              onPick={set}
            />
          </>
        )}
        {tab === "Skin" && (
          <Swatches
            colors={SKIN}
            value={look.skin}
            onPick={(skin) => set({ skin })}
            label="Skin tone"
            large
          />
        )}
        {tab === "Outfit" && (
          <>
            <Swatches
              colors={TOP_COLOR}
              value={look.topColor}
              onPick={(topColor) => set({ topColor })}
              label="Outfit colour"
            />
            <Tiles
              className="mt-3"
              framing="body"
              look={look}
              options={TOP_STYLES}
              value={look.top}
              apply={(top) => ({ top, item: "none" as const })}
              onPick={(p) => set({ top: p.top })}
            />
          </>
        )}
        {tab === "Glasses" && (
          <Tiles
            framing="head"
            look={look}
            options={GLASSES}
            value={look.glasses}
            apply={(glasses) => ({ glasses })}
            onPick={set}
          />
        )}
        {tab === "Item" && (
          <Tiles
            framing="body"
            look={look}
            options={ITEMS}
            value={look.item}
            apply={(item) => ({ item })}
            onPick={set}
          />
        )}
      </div>
    </div>
  );
}

function Swatches({
  colors,
  value,
  onPick,
  label,
  large,
}: {
  colors: Record<string, string>;
  value: string;
  onPick: (key: string) => void;
  label: string;
  large?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap", large ? "gap-3" : "gap-2.5")}>
      {Object.entries(colors).map(([key, hex]) => (
        <button
          key={key}
          role="radio"
          aria-checked={value === key}
          aria-label={key}
          onClick={() => onPick(key)}
          className={cn(
            "rounded-full shadow-[inset_0_-2px_3px_rgba(0,0,0,0.15),inset_0_2px_2px_rgba(255,255,255,0.35)] transition active:scale-95",
            large ? "h-12 w-12" : "h-8 w-8",
            value === key && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
          )}
          style={{ background: hex }}
        />
      ))}
    </div>
  );
}

function Tiles<K extends string>({
  framing,
  look,
  options,
  value,
  apply,
  onPick,
  className,
}: {
  framing: Framing;
  look: Look;
  options: { key: K; label: string }[];
  value: K;
  apply: (k: K) => Partial<Look>;
  onPick: (patch: Partial<Look>) => void;
  className?: string;
}) {
  const thumbs = useClayThumbs(
    options.map((o) => ({ ...look, ...apply(o.key) })),
    framing,
  );
  return (
    <div role="radiogroup" className={cn("grid grid-cols-3 gap-2.5", className)}>
      {options.map((o, i) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onPick(apply(o.key))}
          className={cn(
            "raised flex aspect-square flex-col items-center justify-end overflow-hidden rounded-2xl pb-1.5 transition active:scale-[0.97]",
            value === o.key && "ring-2 ring-foreground",
          )}
        >
          <span className="relative w-full flex-1">
            {thumbs[i] && (
              <Image src={thumbs[i]} alt="" fill unoptimized className="object-contain" />
            )}
          </span>
          <span className={cn("text-[11px]", value === o.key ? "text-foreground" : "text-muted")}>
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}
