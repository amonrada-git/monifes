"use client";

import { useState } from "react";
import { GLASSES, HAIRS, SKINS, type Look } from "@/lib/character";
import { cn } from "@/lib/utils";
import { ClayYou } from "./clay-you";

const TABS = ["Hair", "Skin", "Glasses"] as const;
type Tab = (typeof TABS)[number];

/**
 * Make your clay you: your character on a raised card, the choices below as
 * tiles of your own face with each option. No gender question — just the hair
 * you like.
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
      <div className="raised mx-auto w-full max-w-[min(100%,26dvh)] overflow-hidden rounded-[28px]">
        <ClayYou look={look} label={`${name || "Your"} clay character`} priority />
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

      <div className="mt-3" role="tabpanel">
        {tab === "Hair" && <Tiles look={look} options={HAIRS} field="hair" onPick={set} label="Hair" quiet />}
        {tab === "Skin" && <Tiles look={look} options={SKINS} field="skin" onPick={set} label="Skin" quiet />}
        {tab === "Glasses" && (
          <Tiles look={look} options={GLASSES} field="glasses" onPick={set} label="Glasses" quiet />
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-muted">{children}</p>;
}

function Tiles<F extends "hair" | "skin" | "glasses" | "hat">({
  look,
  options,
  field,
  onPick,
  label,
  quiet,
}: {
  look: Look;
  options: readonly { key: string; label: string }[];
  field: F;
  onPick: (patch: Partial<Look>) => void;
  label: string;
  /** No visible heading — the tab already says it. */
  quiet?: boolean;
}) {
  return (
    <div>
      {!quiet && <Label>{label}</Label>}
      <div role="radiogroup" aria-label={label} className={cn("grid grid-cols-4 gap-2", !quiet && "mt-2")}>
        {options.map((o) => {
          const on = look[field] === o.key;
          return (
            <button
              key={o.key}
              role="radio"
              aria-checked={on}
              onClick={() => onPick({ [field]: o.key } as Partial<Look>)}
              className={cn(
                "raised flex flex-col items-center overflow-hidden rounded-2xl pb-1.5 transition active:scale-[0.97]",
                on && "ring-2 ring-foreground",
              )}
            >
              <ClayYou
                // hair previews go bare-headed, or a hat would hide the difference
                look={{ ...look, ...(field === "hair" && { hat: "none" }), [field]: o.key } as Look}
                crop="head"
                className="w-full"
              />
              <span className={cn("mt-1 text-[11px]", on ? "text-foreground" : "text-muted")}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
