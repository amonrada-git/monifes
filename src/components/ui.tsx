import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        // flat panels — no border, no shadow; just a step lighter than the canvas
        "rounded-[var(--radius-card)] bg-card p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-muted">{children}</p>;
}

/** A calm, centered empty-state used by tabs still finding their feet. */
export function ComingSoon({ emoji, title, note }: { emoji: string; title: string; note: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
      <div className="text-5xl">{emoji}</div>
      <h2 className="mt-4 text-xl font-medium">{title}</h2>
      <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">{note}</p>
    </div>
  );
}
