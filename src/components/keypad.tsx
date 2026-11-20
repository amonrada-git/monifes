"use client";

import { useCallback, useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

/** Amount typed on the keypad, decimal-aware per currency. */
export function useAmountInput(decimals: number, initial = "") {
  const [value, setValue] = useState(initial);

  const press = useCallback(
    (key: string) =>
      setValue((cur) => {
        if (key === "del") return cur.slice(0, -1);
        if (key === ".") {
          if (decimals === 0 || cur.includes(".")) return cur;
          return cur === "" ? "0." : cur + ".";
        }
        if (cur.length >= 12) return cur;
        if (key === "0" && cur === "") return cur; // no leading zero
        const frac = cur.split(".")[1];
        if (frac !== undefined && frac.length >= decimals) return cur;
        return cur + key;
      }),
    [decimals],
  );

  return { value, amount: Number(value || 0), press, setValue };
}

/** The typed amount, large: integer part grouped, decimals exactly as typed. */
export function AmountDisplay({ symbol, value }: { symbol: string; value: string }) {
  const [intPart, fracPart] = value.split(".");
  const display = value
    ? Number(intPart || 0).toLocaleString("en-US") + (fracPart !== undefined ? `.${fracPart}` : "")
    : "0";
  return (
    <div className="flex items-baseline justify-center gap-1">
      <span className="text-3xl font-medium text-muted">{symbol}</span>
      <span className={cn("tnum text-6xl font-medium tracking-tight", !value && "text-muted-2")}>
        {display}
      </span>
    </div>
  );
}

export function Keypad({
  allowDecimal,
  onPress,
}: {
  allowDecimal: boolean;
  onPress: (key: string) => void;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", allowDecimal ? "." : "", "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k, i) =>
        k === "" ? (
          <div key={i} />
        ) : (
          <button
            key={i}
            onClick={() => onPress(k)}
            aria-label={k === "del" ? "Delete" : k}
            className="flex h-14 items-center justify-center rounded-2xl bg-card text-2xl font-medium transition active:scale-95 active:bg-accent-tint"
          >
            {k === "del" ? <Delete size={22} className="text-muted" /> : k}
          </button>
        ),
      )}
    </div>
  );
}
