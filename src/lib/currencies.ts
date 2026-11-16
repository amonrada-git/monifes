export interface Currency {
  code: string;
  symbol: string;
  /** Decimal places used when displaying amounts. */
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: "JPY", symbol: "¥", decimals: 0 },
  { code: "USD", symbol: "$", decimals: 2 },
  { code: "THB", symbol: "฿", decimals: 0 },
];

export const currencyOf = (code: string) =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

/** Format an amount for display, e.g. 1234 -> "¥1,234". */
export function formatMoney(amount: number, code: string): string {
  const c = currencyOf(code);
  const n = amount.toLocaleString("en-US", {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  });
  return `${c.symbol}${n}`;
}
