"use client";

import { useState } from "react";
import { GLASSES, HAIRS, PEOPLE, SKINS, hairFor, type Look } from "@/lib/character";
import { cn } from "@/lib/utils";
import { ClayYou } from "./clay-you";

const TABS = ["You", "Hair", "Extras"] as const;
type Tab = (typeof TABS)[number];

/**
 * Make your clay you: your character on a raised card, the choices below.
 * Hair and extras are tiles showing your own face with each option.
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
  const [tab, setTab] = useState<Tab>("You");
  const set = (patch: Partial<Look>) => onChange({ ...look, ...patch });

  return (
    <div className="flex flex-col">
      <div className="raised mx-auto w-full max-w-[min(100%,28dvh)] overflow-hidden rounded-[28px]">
        <ClayYou look={look} label={`${name || "Your"} clay character`} priority />
      </div>

      <div className="tray mt-5 flex gap-1 rounded-2xl p-1" role="tablist">
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

      <div className="mt-4 flex flex-col gap-4" role="tabpanel">
        {tab === "You" && (
          // side by side, so the whole tab fits above the button
          <div className="flex items-end gap-4">
            <div className="min-w-0 flex-1">
              <Label>I’m a</Label>
              <div role="radiogroup" aria-label="I’m a" className="tray mt-2 flex gap-1 rounded-2xl p-1">
                {PEOPLE.map((p) => (
                  <button
                    key={p.key}
                    role="radio"
                    aria-checked={look.person === p.key}
                    onClick={() => set({ person: p.key, hair: hairFor(p.key, look.hair) })}
                    className={cn(
                      "h-10 flex-1 rounded-xl text-sm transition",
                      look.person === p.key ? "key-on" : "text-muted",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Skin</Label>
              <div role="radiogroup" aria-label="Skin" className="mt-2 flex h-12 items-center gap-2.5">
                {SKINS.map((s) => (
                  <button
                    key={s.key}
                    role="radio"
                    aria-checked={look.skin === s.key}
                    aria-label={s.label}
                    title={s.label}
                    onClick={() => set({ skin: s.key })}
                    className={cn(
                      "h-10 w-10 rounded-full shadow-[inset_0_-2px_3px_rgba(0,0,0,0.15),inset_0_2px_2px_rgba(255,255,255,0.35)] transition active:scale-95",
                      look.skin === s.key && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                    style={{ background: s.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === "Hair" && (
          <Tiles look={look} options={HAIRS[look.person]} field="hair" onPick={set} label="Hair" quiet />
        )}
        {tab === "Extras" && (
          <Tiles look={look} options={GLASSES} field="glasses" onPick={set} label="Glasses" quiet />
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-muted">{children}</p>;
}

function Tiles<F extends "hair" | "glasses" | "hat">({
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
