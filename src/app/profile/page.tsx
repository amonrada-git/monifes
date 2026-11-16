"use client";

import { useState } from "react";
import { FlaskConical, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { makePreset, PRESET_LABELS, PresetName } from "@/lib/presets";
import { Card, ComingSoon, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { loadData } = useStore();
  const [applied, setApplied] = useState<PresetName | null>(null);

  function apply(name: PresetName) {
    loadData(makePreset(name));
    setApplied(name);
  }

  return (
    <div className="px-5 pb-8 pt-5">
      <h1 className="text-2xl font-medium">Profile</h1>

      {/* Debug presets — swap the whole app state to preview each screen */}
      <Card className="mt-5">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-muted" />
          <SectionLabel>Debug — preview states</SectionLabel>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Loads sample data so you can see how each screen looks. Replaces whatever is
          currently saved.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {PRESET_LABELS.map((p) => (
            <button
              key={p.key}
              onClick={() => apply(p.key)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition active:scale-[0.98]",
                applied === p.key && "border-foreground",
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

      <ComingSoon
        emoji="👤"
        title="Settings"
        note="Soon: your currency, your difficulty target, and everything that makes monifes yours."
      />
    </div>
  );
}
