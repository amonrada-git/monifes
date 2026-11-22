"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Look } from "@/lib/character";
import { lookId, makePortrait, useClayYou, type ClayError } from "@/lib/clay-you";
import { cn } from "@/lib/utils";

const LINES = [
  "Rolling the clay…",
  "Shaping your hair…",
  "Picking out your outfit…",
  "Adding rosy cheeks…",
  "Almost you…",
];

const ERRORS: Record<ClayError, string> = {
  unavailable: "Making a clay you isn’t switched on yet.",
  limit: "That’s all the tries for today. Your choices are saved.",
  failed: "Couldn’t make you just now.",
};

type Phase = { kind: "making" } | { kind: "made"; pic: string } | { kind: "error"; error: ClayError };

/**
 * The reveal: your choices become a clay you, made by the server in the app's
 * own clay style. Keep it, try again, or go back and change something.
 */
export function MakingYou({
  look,
  name,
  onKeep,
  onEdit,
  onSkip,
}: {
  look: Look;
  name: string;
  onKeep: (pic: string) => void;
  onEdit: () => void;
  onSkip: () => void;
}) {
  const saved = useClayYou();
  const kept = saved.look === lookId(look) ? saved.pics.portrait : undefined;
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: "making" });

  useEffect(() => {
    if (kept && attempt === 0) return;
    let live = true;
    makePortrait(look, attempt > 0).then(
      (pic) => live && setPhase({ kind: "made", pic }),
      (error: ClayError) => live && setPhase({ kind: "error", error }),
    );
    return () => {
      live = false;
    };
  }, [look, attempt, kept]);

  const shown: Phase = kept && attempt === 0 ? { kind: "made", pic: kept } : phase;

  function again() {
    setPhase({ kind: "making" });
    setAttempt((a) => a + 1);
  }

  return (
    <div className="rise flex flex-1 flex-col pt-2">
      <h1 className="text-[28px] font-medium leading-tight">
        {shown.kind === "made"
          ? `Is this you${name ? `, ${name}` : ""}?`
          : shown.kind === "error"
            ? "Let’s keep going"
            : "Making you…"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {shown.kind === "made"
          ? "You’ll star in your welcome album next."
          : shown.kind === "error"
            ? "You can make your clay you later."
            : "This takes about fifteen seconds."}
      </p>

      <div className="raised relative mt-6 aspect-square w-full overflow-hidden rounded-[28px]">
        {shown.kind === "made" ? (
          <Image
            key={shown.pic.slice(-32)}
            src={shown.pic}
            alt={`${name || "Your"} clay figure`}
            fill
            unoptimized
            className="rise object-cover"
          />
        ) : shown.kind === "making" ? (
          <Shaping />
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-[15px] text-muted">
            {ERRORS[shown.error]}
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        {shown.kind === "made" && (
          <>
            <button
              onClick={() => onKeep(shown.pic)}
              className="mt-5 h-14 w-full btn-ink rounded-2xl text-lg font-medium transition active:scale-[0.98]"
            >
              That’s me
            </button>
            <div className="mt-3 flex gap-2">
              <SecondButton onClick={again}>Try again</SecondButton>
              <SecondButton onClick={onEdit}>Change my choices</SecondButton>
            </div>
          </>
        )}
        {shown.kind === "error" && (
          <>
            <button
              onClick={onSkip}
              className="mt-5 h-14 w-full btn-ink rounded-2xl text-lg font-medium transition active:scale-[0.98]"
            >
              Continue
            </button>
            {shown.error === "failed" && (
              <div className="mt-3 flex gap-2">
                <SecondButton onClick={again}>Try again</SecondButton>
              </div>
            )}
          </>
        )}
        {shown.kind === "making" && (
          <button onClick={onEdit} className="mt-3 w-full text-center text-sm text-muted">
            Change my choices
          </button>
        )}
      </div>
    </div>
  );
}

/** A lump of clay breathing while you're being made, with a line about what's happening. */
function Shaping() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, LINES.length - 1)), 3200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="clay-lump h-24 w-24 rounded-full" aria-hidden />
      <p key={i} className="rise text-[15px] text-muted" aria-live="polite">
        {LINES[i]}
      </p>
    </div>
  );
}

function SecondButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("raised h-11 flex-1 rounded-2xl text-sm transition active:scale-[0.98]")}
    >
      {children}
    </button>
  );
}
