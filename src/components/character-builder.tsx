"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import {
  AGES,
  GLASSES,
  HAIR_COLORS,
  HAIRS,
  ITEMS,
  OUTFIT_COLORS,
  OUTFITS,
  PEOPLE,
  SKINS,
  randomLook,
  summary,
  type Look,
} from "@/lib/character";
import { cn } from "@/lib/utils";

const TABS = ["You", "Hair", "Outfit", "Extras"] as const;
type Tab = (typeof TABS)[number];

type Opt = { key: string; label: string; hex?: string };

/**
 * Describe yourself in a few taps. The card on top reads your choices back;
 * your clay you is made from them when you're done.
 */
export function CharacterBuilder({
  look,
  onChange,
}: {
  look: Look;
  onChange: (l: Look) => void;
}) {
  const [tab, setTab] = useState<Tab>("You");
  const set = (patch: Partial<Look>) => onChange({ ...look, ...patch });

  return (
    <div className="flex flex-col">
      <div className="raised relative flex min-h-[132px] flex-col justify-center rounded-[28px] px-6 py-5">
        <p className="text-[13px] text-muted">Your clay you will be</p>
        <p key={summary(look)} className="rise mt-1.5 pr-10 text-[19px] font-medium leading-snug">
          {summary(look)}
        </p>
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

      <div className="mt-5 flex flex-col gap-5" role="tabpanel">
        {tab === "You" && (
          <>
            <Keys label="I'm a" options={PEOPLE} value={look.person} onPick={(person) => set({ person })} />
            <Keys label="Age" options={AGES} value={look.age} onPick={(age) => set({ age })} />
            <Swatches label="Skin" options={SKINS} value={look.skin} onPick={(skin) => set({ skin })} />
          </>
        )}
        {tab === "Hair" && (
          <>
            <Keys label="Style" options={HAIRS} value={look.hair} onPick={(hair) => set({ hair })} />
            {look.hair !== "bald" && (
              <Swatches
                label="Colour"
                options={HAIR_COLORS}
                value={look.hairColor}
                onPick={(hairColor) => set({ hairColor })}
              />
            )}
          </>
        )}
        {tab === "Outfit" && (
          <>
            <Keys label="Wearing" options={OUTFITS} value={look.outfit} onPick={(outfit) => set({ outfit })} />
            <Swatches
              label="Colour"
              options={OUTFIT_COLORS}
              value={look.outfitColor}
              onPick={(outfitColor) => set({ outfitColor })}
            />
          </>
        )}
        {tab === "Extras" && (
          <>
            <Keys label="Glasses" options={GLASSES} value={look.glasses} onPick={(glasses) => set({ glasses })} />
            <Keys label="Holding" options={ITEMS} value={look.item} onPick={(item) => set({ item })} />
          </>
        )}
      </div>
    </div>
  );
}

function Keys<K extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly (Opt & { key: K })[];
  value: K;
  onPick: (k: K) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] text-muted">{label}</p>
      <div role="radiogroup" aria-label={label} className="tray flex flex-wrap gap-1 rounded-2xl p-1">
        {options.map((o) => (
          <button
            key={o.key}
            role="radio"
            aria-checked={value === o.key}
            onClick={() => onPick(o.key)}
            className={cn(
              "h-9 grow rounded-xl px-3.5 text-[13px] transition",
              value === o.key ? "key-on" : "text-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches<K extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly (Opt & { key: K })[];
  value: K;
  onPick: (k: K) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] text-muted">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-3">
        {options.map((o) => (
          <button
            key={o.key}
            role="radio"
            aria-checked={value === o.key}
            aria-label={o.label}
            title={o.label}
            onClick={() => onPick(o.key)}
            className={cn(
              "h-10 w-10 rounded-full shadow-[inset_0_-2px_3px_rgba(0,0,0,0.15),inset_0_2px_2px_rgba(255,255,255,0.35)] transition active:scale-95",
              value === o.key && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
            )}
            style={{ background: o.hex }}
          />
        ))}
      </div>
    </div>
  );
}
