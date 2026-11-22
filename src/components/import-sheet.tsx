"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { X, Check, FileUp } from "lucide-react";
import { BUCKETS, FEELINGS, Bucket, Feeling } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/currencies";
import {
  Mapping,
  ParseResult,
  Table,
  Transaction,
  dateOrderAmbiguous,
  decode,
  findTable,
  guessMapping,
  parseCsv,
  toTransactions,
} from "@/lib/statement";
import { cn } from "@/lib/utils";

type Step = "pick" | "check" | "tag" | "done";

/**
 * Statement import: choose a CSV → confirm we read it right → tag each
 * purchase with a bucket and a feeling. Automation for completeness, manual
 * for meaning — an imported spend still passes through the mirror. Only
 * tagged purchases are saved; skipping or leaving early keeps the rest out.
 */
export function ImportSheet({ onClose }: { onClose: () => void }) {
  const { data, addSpend } = useStore();
  const currency = data.settings.currency;

  const [step, setStep] = useState<Step>("pick");
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);

  const [queue, setQueue] = useState<Transaction[]>([]);
  const [index, setIndex] = useState(0);
  const [added, setAdded] = useState(0);
  const [bucket, setBucket] = useState<Bucket | null>(null);

  // Re-read the rows whenever the person corrects a column.
  useEffect(() => {
    if (!table || !mapping) return;
    let live = true;
    void toTransactions(table, mapping).then((r) => live && setParsed(r));
    return () => {
      live = false;
    };
  }, [table, mapping]);

  // Already in monifes from an earlier import of the same statement.
  const fresh = useMemo(() => {
    const have = new Set(data.spends.map((s) => s.id));
    return parsed?.charges.filter((t) => !have.has(t.id)) ?? [];
    // Only recompute when the file is re-read — not as each tag is saved, or
    // the list would shrink under the person while they're tagging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed]);

  // The bucket last used for each shop, so repeat shops are one tap.
  const usualBucket = useMemo(() => {
    const m = new Map<string, Bucket>();
    for (const s of [...data.spends].reverse()) if (s.label) m.set(s.label, s.bucket);
    return m;
  }, [data.spends]);

  const current = queue[index];

  // Buckets chosen during this import — ahead of usualBucket, which only
  // catches up on the next render (two Lawsons in a row should both be one tap).
  const taggedNow = useRef(new Map<string, Bucket>());

  /** Bring up purchase i, preselecting the bucket that shop usually gets. */
  function show(list: Transaction[], i: number) {
    const shop = list[i].description.slice(0, 40);
    setIndex(i);
    setBucket(taggedNow.current.get(shop) ?? usualBucket.get(shop) ?? null);
  }

  const close = useEffectEvent(() => onClose());
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(close, 1600);
    return () => clearTimeout(t);
  }, [step]);

  async function pickFile(file: File) {
    setError(null);
    try {
      const t = findTable(parseCsv(decode(await file.arrayBuffer())));
      if (!t || !t.rows.length) {
        setError("We couldn’t find any purchases in that file. Is it the CSV version of your statement?");
        return;
      }
      setTable(t);
      setMapping(guessMapping(t));
      setStep("check");
    } catch {
      setError("We couldn’t read that file. Try downloading the statement as CSV again.");
    }
  }

  function startTagging() {
    setQueue(fresh);
    setAdded(0);
    if (!fresh.length) return setStep("done");
    show(fresh, 0);
    setStep("tag");
  }

  function next() {
    if (index + 1 >= queue.length) setStep("done");
    else show(queue, index + 1);
  }

  function tag(feeling: Feeling) {
    if (!current || !bucket) return;
    addSpend({
      id: current.id,
      amount: current.amount,
      bucket,
      feeling,
      label: current.description,
      // Noon local time, so the purchase lands on its own day in every timezone view.
      createdAt: new Date(`${current.date}T12:00:00`).toISOString(),
    });
    taggedNow.current.set(current.description.slice(0, 40), bucket);
    setAdded((n) => n + 1);
    next();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
      />

      <div className="rise no-scrollbar relative flex max-h-[92%] w-full max-w-[390px] flex-col overflow-y-auto rounded-t-[28px] bg-background px-5 pb-8 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-card"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {step === "pick" && (
          <div className="flex flex-col">
            <h2 className="text-2xl font-medium">Import a statement</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Download your card statement as a CSV file from your card&rsquo;s website, then
              choose it here.
            </p>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-foreground/60 px-5 py-10 text-center transition active:scale-[0.98]">
              <FileUp size={24} strokeWidth={1.5} />
              <span className="text-[15px] font-medium">Choose CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pickFile(f);
                  e.target.value = ""; // allow choosing the same file again
                }}
              />
            </label>

            {error && <p className="mt-3 text-sm leading-relaxed text-muted">{error}</p>}

            <p className="mt-5 text-xs leading-relaxed text-muted">
              Look for your statement (ご利用明細 / ใบแจ้งยอด) and a CSV or download option. The
              file is read on this phone — it&rsquo;s never uploaded. Only the purchases you tag
              are saved.
            </p>
          </div>
        )}

        {step === "check" && table && mapping && (
          <CheckStep
            table={table}
            mapping={mapping}
            onMapping={setMapping}
            parsed={parsed}
            freshCount={fresh.length}
            currency={currency}
            onBack={() => setStep("pick")}
            onStart={startTagging}
          />
        )}

        {step === "tag" && current && (
          <div className="flex flex-col">
            {/* pr-10 keeps the bar clear of the sheet's close button */}
            <p className="tnum pr-10 text-xs text-muted">
              {index + 1} of {queue.length}
            </p>
            <div className="mt-2 h-px w-full bg-accent-soft">
              <div
                className="h-px bg-foreground transition-[width] duration-300"
                style={{ width: `${((index + 1) / queue.length) * 100}%` }}
              />
            </div>

            <div key={current.id} className="rise mt-5">
              <p className="text-xs text-muted tnum">{formatDay(current.date)}</p>
              <p className="mt-1 line-clamp-2 text-xl font-medium leading-snug">
                {current.description || "Purchase"}
              </p>
              <p className="tnum mt-1 text-3xl font-medium tracking-tight">
                {formatMoney(current.amount, currency)}
              </p>
            </div>

            <p className="mt-6 text-[13px] font-medium text-muted">What was it for?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {BUCKETS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setBucket(b.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.97]",
                    bucket === b.key ? "key-on" : "raised",
                  )}
                >
                  <span>{b.emoji}</span>
                  <span className="truncate">{b.label}</span>
                </button>
              ))}
            </div>

            <p className="mt-5 text-[13px] font-medium text-muted">How did it feel?</p>
            <div className={cn("mt-2 grid grid-cols-5 gap-1.5", !bucket && "opacity-40")}>
              {FEELINGS.map((f) => (
                <button
                  key={f.key}
                  disabled={!bucket}
                  onClick={() => tag(f.key)}
                  className="raised flex flex-col items-center gap-1 rounded-2xl px-1 py-3 transition active:scale-95 disabled:active:scale-100"
                >
                  <span className="text-2xl">{f.emoji}</span>
                  <span className="text-[11px] leading-tight">{f.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 min-h-4 text-xs text-muted">
              {bucket ? "Tap a feeling to save and go to the next one." : "Pick a bucket first."}
            </p>

            <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted">
              <button onClick={next} className="underline-offset-4 hover:underline">
                Skip this one
              </button>
              <button
                onClick={() => setStep("done")}
                className="underline-offset-4 hover:underline"
              >
                Finish for now
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft">
              <Check size={40} className="text-success" strokeWidth={3} />
            </div>
            <p className="mt-5 text-xl font-medium">
              {added === 0 ? "Nothing new to add" : `${added} ${added === 1 ? "spend" : "spends"} added 🌱`}
            </p>
            <p className="mt-1 max-w-[16rem] text-sm text-muted">
              {added === 0
                ? "Everything in this statement is already in monifes."
                : "Import the same file again any time — you’ll only see what’s left."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckStep({
  table,
  mapping,
  onMapping,
  parsed,
  freshCount,
  currency,
  onBack,
  onStart,
}: {
  table: Table;
  mapping: Mapping;
  onMapping: (m: Mapping) => void;
  parsed: ParseResult | null;
  freshCount: number;
  currency: string;
  onBack: () => void;
  onStart: () => void;
}) {
  const charges = parsed?.charges ?? [];
  const already = charges.length - freshCount;
  const range =
    charges.length > 0
      ? `${formatDay(charges[charges.length - 1].date)} – ${formatDay(charges[0].date)}`
      : null;
  const ambiguous = dateOrderAmbiguous(table, mapping.date);

  const notes = [
    parsed?.credits
      ? `${parsed.credits} ${parsed.credits === 1 ? "payment or refund" : "payments or refunds"} left out`
      : null,
    already > 0 ? `${already} already in monifes` : null,
    parsed?.unreadable
      ? `${parsed.unreadable} ${parsed.unreadable === 1 ? "row" : "rows"} we couldn’t read`
      : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-medium">Does this look right?</h2>
      <p className="mt-1 text-sm text-muted">
        {charges.length} {charges.length === 1 ? "purchase" : "purchases"}
        {range && ` · ${range}`}
      </p>
      {notes.length > 0 && <p className="mt-0.5 text-xs text-muted">{notes.join(" · ")}</p>}

      <ul className="raised mt-4 flex flex-col gap-3 rounded-[var(--radius-card)] p-4">
        {charges.slice(0, 3).map((t) => (
          <li key={t.id} className="flex items-center gap-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium">{t.description || "—"}</span>
              <span className="tnum text-xs text-muted">{formatDay(t.date)}</span>
            </span>
            <span className="tnum text-[15px] font-medium">{formatMoney(t.amount, currency)}</span>
          </li>
        ))}
        {charges.length === 0 && (
          <li className="text-sm text-muted">No purchases with these columns — try changing them below.</li>
        )}
      </ul>

      <p className="mt-5 text-[13px] font-medium text-muted">If something looks off, pick the right column</p>
      <div className="mt-2 flex flex-col gap-2">
        <ColumnSelect
          label="Date"
          value={mapping.date}
          columns={table.columns}
          onChange={(date) => onMapping({ ...mapping, date })}
        />
        <ColumnSelect
          label="Shop"
          value={mapping.description}
          columns={table.columns}
          allowNone
          onChange={(description) => onMapping({ ...mapping, description })}
        />
        <ColumnSelect
          label="Amount"
          value={mapping.amount}
          columns={table.columns}
          onChange={(amount) => onMapping({ ...mapping, amount })}
        />
        {ambiguous && (
          <div className="flex items-center gap-3 raised rounded-2xl px-4 py-2.5">
            <span className="w-16 text-sm text-muted">03/04 is</span>
            <div className="flex flex-1 gap-1.5">
              {[
                { dayFirst: true, label: "3 April" },
                { dayFirst: false, label: "March 4" },
              ].map((o) => (
                <button
                  key={o.label}
                  onClick={() => onMapping({ ...mapping, dayFirst: o.dayFirst })}
                  className={cn(
                    "flex-1 rounded-xl py-1.5 text-sm transition",
                    mapping.dayFirst === o.dayFirst ? "key-on" : "text-muted",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onStart}
        disabled={charges.length === 0}
        className="mt-6 h-14 btn-ink rounded-2xl text-lg font-medium transition active:scale-[0.98] disabled:opacity-30"
      >
        {freshCount > 0 ? `Start tagging (${freshCount})` : "Nothing new to tag"}
      </button>
      <button
        onClick={onBack}
        className="mt-3 self-center text-sm text-muted underline-offset-4 hover:underline"
      >
        Choose a different file
      </button>
    </div>
  );
}

function ColumnSelect({
  label,
  value,
  columns,
  allowNone,
  onChange,
}: {
  label: string;
  value: number;
  columns: string[];
  allowNone?: boolean;
  onChange: (col: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 raised rounded-2xl px-4 py-2.5">
      <span className="w-16 text-sm text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 truncate bg-transparent text-[15px] focus:outline-none"
      >
        {allowNone && <option value={-1}>None</option>}
        {columns.map((c, i) => (
          <option key={i} value={i}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

/** "2024-10-03" → "3 Oct" (with the year only when it isn't this year). */
function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(y !== new Date().getFullYear() && { year: "numeric" }),
  });
}
