"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Flag, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/insights", label: "Insights", Icon: BarChart3 },
  { href: "/goals", label: "Goals", Icon: Flag },
  { href: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-auto sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[390px] items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="group flex flex-1 flex-col items-center gap-1 py-3"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                className={active ? "text-accent" : "text-muted-2 transition-colors group-hover:text-muted"}
              />
              <span
                className={`text-[11px] font-normal ${
                  active ? "text-accent" : "text-muted-2"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
