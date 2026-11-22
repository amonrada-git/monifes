"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BarChart3, Sprout, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/insights", label: "Insights", Icon: BarChart3 },
  { href: "/becoming", label: "Becoming", Icon: Sprout },
  { href: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    // A floating tray; the current tab is the glossy ink key.
    <nav className="pointer-events-auto sticky bottom-0 z-20 bg-background px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="tray mx-auto flex max-w-[390px] items-stretch gap-1 rounded-[24px] p-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex flex-1 flex-col items-center gap-0.5 rounded-[18px] py-2 transition active:scale-95",
                active ? "key-on" : "text-muted hover:text-foreground",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 2} />
              <span className="text-[11px] font-normal">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
