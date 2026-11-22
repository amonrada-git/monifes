"use client";

import Image from "next/image";
import { PEOPLE, SKINS, castSrc, type Look } from "@/lib/character";
import { cn } from "@/lib/utils";

/**
 * Pick the clay you: two answers, and your character steps onto the card.
 * All six portraits load up front so switching is instant.
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
  return (
    <div className="flex flex-col">
      <div className="raised relative mx-auto aspect-square w-full max-w-[min(100%,36dvh)] overflow-hidden rounded-[28px]">
        {PEOPLE.flatMap((p) =>
          SKINS.map((s) => {
            const on = p.key === look.person && s.key === look.skin;
            return (
              <Image
                key={`${p.key}-${s.key}`}
                src={castSrc({ person: p.key, skin: s.key }, "portrait")}
                alt={on ? `${name || "Your"} clay character` : ""}
                aria-hidden={!on}
                width={720}
                height={720}
                priority
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition duration-300",
                  on ? "scale-100 opacity-100" : "scale-[0.97] opacity-0",
                )}
              />
            );
          }),
        )}
      </div>

      <p className="mb-2 mt-6 text-[13px] text-muted">I’m a</p>
      <div role="radiogroup" aria-label="I’m a" className="tray flex gap-1 rounded-2xl p-1">
        {PEOPLE.map((p) => (
          <button
            key={p.key}
            role="radio"
            aria-checked={look.person === p.key}
            onClick={() => onChange({ ...look, person: p.key })}
            className={cn(
              "h-10 flex-1 rounded-xl text-sm transition",
              look.person === p.key ? "key-on" : "text-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-5 text-[13px] text-muted">Skin</p>
      <div role="radiogroup" aria-label="Skin" className="flex gap-3">
        {SKINS.map((s) => (
          <button
            key={s.key}
            role="radio"
            aria-checked={look.skin === s.key}
            aria-label={s.label}
            title={s.label}
            onClick={() => onChange({ ...look, skin: s.key })}
            className={cn(
              "h-11 w-11 rounded-full shadow-[inset_0_-2px_3px_rgba(0,0,0,0.15),inset_0_2px_2px_rgba(255,255,255,0.35)] transition active:scale-95",
              look.skin === s.key && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
            )}
            style={{ background: s.hex }}
          />
        ))}
      </div>
    </div>
  );
}
