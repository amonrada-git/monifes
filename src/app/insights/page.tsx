"use client";

import { useStore } from "@/lib/store";
import { monthDots } from "@/lib/compute";
import { MonthDots, MonthDotsLegend } from "@/components/month-dots";
import { Card, ComingSoon, SectionLabel } from "@/components/ui";

export default function InsightsPage() {
  const { data, ready } = useStore();

  if (!ready) {
    return (
      <div className="px-5 pt-5">
        <div className="h-8 w-32 rounded-lg bg-card" />
        <div className="mt-5 h-48 rounded-[var(--radius-card)] bg-card" />
      </div>
    );
  }

  const now = new Date();
  const dots = monthDots(data, now);
  const checkInCount = dots.filter((d) => d === "spent" || d === "no-spend").length;
  const monthName = now.toLocaleString("en-US", { month: "long" });

  return (
    <div className="px-5 pb-8 pt-5">
      <h1 className="text-2xl font-medium">Insights</h1>

      {/* The month as dots — the signature glanceable picture */}
      <Card className="mt-5">
        <div className="flex items-baseline justify-between">
          <SectionLabel>{monthName}</SectionLabel>
          <span className="tnum text-xs font-normal text-muted">
            {checkInCount} check-in{checkInCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-4">
          <MonthDots dots={dots} today={now.getDate()} />
        </div>
        <div className="mt-4">
          <MonthDotsLegend />
        </div>
      </Card>

      <ComingSoon
        emoji="📊"
        title="The mirror"
        note="Soon: your spending organized by how it felt, so your patterns become clear."
      />
    </div>
  );
}
