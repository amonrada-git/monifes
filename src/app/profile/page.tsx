"use client";

import { useState } from "react";
import { FlaskConical, Check, Cloud, CloudOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { makePreset, PRESET_LABELS, PresetName } from "@/lib/presets";
import { Card, ComingSoon, SectionLabel } from "@/components/ui";
import { SignInSheet } from "@/components/sign-in-sheet";
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

  function apply(name: PresetName) {
    loadData(makePreset(name));
    setApplied(name);
  }

  return (
    <div className="px-5 pb-8 pt-5">
      <h1 className="text-2xl font-medium">Profile</h1>

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
          <div className="mt-4 flex flex-col gap-2.5">
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
    </div>
  );
}
