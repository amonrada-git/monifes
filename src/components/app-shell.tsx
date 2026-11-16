"use client";

import { BottomNav } from "./bottom-nav";

/**
 * The phone frame. On a phone it's full-bleed. On a wider screen it renders
 * an iPhone-13-sized device (390 × 844) centered on the desk, with rounded
 * corners and a soft shadow, so the design is always seen at phone size.
 *
 * `transform-gpu` on the frame makes it the containing block for `fixed`
 * descendants (the capture sheet), so overlays stay inside the phone.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#c0bfbb] md:py-8">
      <div className="relative flex h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-background md:h-[844px] md:max-h-[calc(100dvh-4rem)] md:transform-gpu md:rounded-[40px] md:shadow-[0_24px_60px_rgba(2,2,1,0.18)] md:ring-1 md:ring-black/10">
        <main className="no-scrollbar flex-1 overflow-y-auto">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
