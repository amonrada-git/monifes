"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import {
  EXTRAS,
  EYES,
  GLASSES,
  HAIR_TONES,
  HAIRS,
  ITEMS,
  TOPS,
  randomLook,
  type Look,
} from "@/lib/character";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

const TABS = ["Hair", "Face", "Body", "Glasses", "Item"] as const;
type Tab = (typeof TABS)[number];

/**
 * Make a little you: your character on a raised card, a tray of parts
 * underneath. Every tile shows you wearing that option.
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
      <div className="raised relative flex h-[min(280px,34dvh)] items-end justify-center overflow-hidden rounded-[28px]">
        <Avatar
          key={JSON.stringify(look)}
          look={look}
          alive
          label={`${name || "Your"} character`}
          className="pop h-[92%] w-auto"
        />
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

      <div className="mt-4 flex flex-col gap-4" role="tabpanel">
        {tab === "Hair" && (
          <>
            <Tiles crop="head" look={look} options={HAIRS} field="hair" onPick={set} />
            <Tiles crop="head" look={look} options={HAIR_TONES} field="hairTone" onPick={set} label="Colour" />
          </>
        )}
        {tab === "Face" && (
          <>
            <Tiles crop="head" look={look} options={EYES} field="eyes" onPick={set} label="Eyes" />
            <Tiles crop="head" look={look} options={EXTRAS} field="extra" onPick={set} label="Extras" />
          </>
        )}
        {tab === "Body" && <Tiles look={look} options={TOPS} field="top" onPick={set} />}
        {tab === "Glasses" && (
          <Tiles crop="head" look={look} options={GLASSES} field="glasses" onPick={set} />
        )}
        {tab === "Item" && <Tiles look={look} options={ITEMS} field="item" onPick={set} />}
      </div>
    </div>
  );
}

function Tiles<F extends keyof Look>({
  look,
  options,
  field,
  onPick,
  crop = "bust",
  label,
}: {
  look: Look;
  options: { key: Look[F]; label: string }[];
  field: F;
  onPick: (patch: Partial<Look>) => void;
  crop?: "bust" | "head";
  label?: string;
}) {
  return (
    <div>
      {label && <p className="mb-2 text-[13px] text-muted">{label}</p>}
      <div role="radiogroup" aria-label={label ?? field} className="grid grid-cols-3 gap-2.5">
        {options.map((o) => {
          const on = look[field] === o.key;
          return (
            <button
              key={o.key}
              role="radio"
              aria-checked={on}
              onClick={() => onPick({ [field]: o.key } as Partial<Look>)}
              className={cn(
                "raised flex aspect-square flex-col items-center overflow-hidden rounded-2xl pb-1.5 transition active:scale-[0.97]",
                on && "ring-2 ring-foreground",
              )}
            >
              <span className="flex min-h-0 w-full flex-1 items-end justify-center">
                <Avatar
                  // a close-up of the head leaves out whatever you're holding
                  look={{ ...look, ...(crop === "head" && { item: "none" }), [field]: o.key }}
                  crop={crop}
                  className="h-full w-auto"
                />
              </span>
              <span className={cn("text-[11px]", on ? "text-foreground" : "text-muted")}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
