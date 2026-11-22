"use client";

import { useState } from "react";
import { FlaskConical, Check, Cloud, CloudOff, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { makePreset, PRESET_LABELS, PresetName } from "@/lib/presets";
import { Card, ComingSoon, SectionLabel } from "@/components/ui";
import { SignInSheet } from "@/components/sign-in-sheet";
import { Onboarding } from "@/components/onboarding";
import { ClayYou } from "@/components/clay-you";
import { useMe } from "@/lib/character";
import { cn } from "@/lib/utils";

const SYNC_COPY = {
  saved: "All saved to your account",
  saving: "Saving…",
  waiting: "Offline — will save when you’re back online",
} as const;

export default function ProfilePage() {
  const { loadData, ready, account, sync, signOut } = useStore();
  const [applied, setApplied] = useState<PresetName | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // onboarding opened from here: just your look, or the whole journey again
  const [journey, setJourney] = useState<"look" | "hello" | null>(null);
  const me = useMe();

  function apply(name: PresetName) {
    loadData(makePreset(name));
    setApplied(name);
  }

  return (
    <div className="px-5 pb-8 pt-5">
      <h1 className="text-2xl font-medium">Profile</h1>

      {/* You: your clay character, and a way back to change it */}
      <Card className="mt-5 flex items-center gap-4">
        <div className="raised w-20 shrink-0 overflow-hidden rounded-2xl">
          {me && <ClayYou look={me.look} crop="head" label="Your clay character" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-medium">{me?.name || "You"}</p>
          <button
            onClick={() => setJourney("look")}
            className="mt-2 raised h-10 rounded-xl px-4 text-sm transition active:scale-[0.98]"
          >
            Change how you look
          </button>
        </div>
      </Card>

      {/* Account — guests are invited (never pushed) to save their progress */}
      <Card className="mt-5">
        <SectionLabel>Account</SectionLabel>
        {!ready ? (
          <div className="mt-3 h-[76px] rounded-2xl bg-accent-tint/60" />
        ) : account ? (
          <>
            <p className="mt-2 truncate text-[17px] font-medium">{account.email}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              {sync === "waiting" ? <CloudOff size={14} /> : <Cloud size={14} />}
              {SYNC_COPY[sync]}
            </p>
            <button
              onClick={async () => {
                setSigningOut(true);
                await signOut();
                setSigningOut(false);
              }}
              disabled={signingOut}
              className="mt-4 raised h-12 w-full rounded-2xl text-[15px] font-normal transition active:scale-[0.98] disabled:opacity-40"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-[17px] font-medium">Save your progress</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Right now everything lives on this phone only. Sign in with your email to keep it
              safe and use monifes on any device.
            </p>
            <button
              onClick={() => setSigningIn(true)}
              className="mt-4 h-11 w-full btn-ink rounded-2xl text-[15px] font-medium transition active:scale-[0.98]"
            >
              Continue with email
            </button>
          </>
        )}
      </Card>

      {/* Debug presets — swap the whole app state to preview each screen. Dev only. */}
      {process.env.NODE_ENV !== "production" && (
        <Card className="mt-5">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-muted" />
            <SectionLabel>Debug — preview states</SectionLabel>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Loads sample data so you can see how each screen looks. Replaces whatever is
            currently saved{account ? " — including on your account" : ""}.
          </p>
          <button
            onClick={() => setJourney("hello")}
            className="mt-4 raised flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition active:scale-[0.98]"
          >
            <RotateCcw size={18} className="text-muted" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-medium">Start onboarding again</span>
              <span className="text-xs text-muted">From “Welcome to monifes”. Keeps your data.</span>
            </span>
          </button>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {PRESET_LABELS.map((p) => (
              <button
                key={p.key}
                onClick={() => apply(p.key)}
                className={cn(
                  "raised flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition active:scale-[0.98]",
                  applied === p.key && "ring-[1.5px] ring-foreground",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-medium">{p.label}</span>
                  <span className="text-xs text-muted">{p.blurb}</span>
                </span>
                {applied === p.key && <Check size={18} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </Card>
      )}

      <ComingSoon
        emoji="👤"
        title="Settings"
        note="Soon: your currency, your difficulty target, and everything that makes monifes yours."
      />

      {signingIn && <SignInSheet onClose={() => setSigningIn(false)} />}
      {journey && <Onboarding startAt={journey} onDone={() => setJourney(null)} />}
    </div>
  );
}
