import Image from "next/image";
import { castSrc, dressOf, type Look } from "@/lib/character";
import { cn } from "@/lib/utils";

/** The head, as a box in 720px picture space — what a close-up shows. */
const HEAD = { x: 220, y: 30, size: 280 };

/**
 * Your clay character: the portrait, with any dress-up items layered on top,
 * placed from where that portrait's eyes are. Fills its (square) parent.
 * `crop="head"` zooms in on the face, for option tiles.
 */
export function ClayYou({
  look,
  crop = "full",
  label,
  priority,
  className,
}: {
  look: Look;
  crop?: "full" | "head";
  label?: string;
  priority?: boolean;
  className?: string;
}) {
  const zoom = crop === "head" ? 720 / HEAD.size : 1;
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative aspect-square overflow-hidden", className)}
    >
      <div
        className="absolute aspect-square"
        style={{
          width: `${zoom * 100}%`,
          left: crop === "head" ? `${(-HEAD.x / HEAD.size) * 100}%` : 0,
          top: crop === "head" ? `${(-HEAD.y / HEAD.size) * 100}%` : 0,
        }}
      >
        <Image
          src={castSrc(look)}
          alt=""
          fill
          sizes={crop === "head" ? "200px" : "(max-width: 480px) 90vw, 420px"}
          priority={priority}
          className="object-cover"
        />
        {dressOf(look).map((p) => (
          <span
            key={p.src}
            className="absolute"
            style={{
              left: `${p.left * 100}%`,
              top: `${p.top * 100}%`,
              width: `${p.width * 100}%`,
              height: `${p.height * 100}%`,
              transform: `translate(-50%, -50%) rotate(${p.rotate}deg)`,
            }}
          >
            <Image src={p.src} alt="" fill sizes="200px" className="object-fill" />
          </span>
        ))}
      </div>
    </div>
  );
}
