// ─── Card statement import ────────────────────────────────────────────────────
//
// Reads a statement CSV exported from a card company's website. Formats vary
// a lot (Japanese cards are often Shift_JIS, with a few lines of preamble
// before the header; US/Thai exports differ in date order), so nothing here
// assumes one layout: we guess the date / description / amount columns and
// the person confirms. Everything runs on the device — the file never leaves it.

export interface Table {
  /** Column names (from the header row, or "Column 1…" when there is none). */
  columns: string[];
  rows: string[][];
}

export interface Mapping {
  date: number;
  /** -1 when the file has no text column. */
  description: number;
  amount: number;
  /** Only matters when every date could be read either way (e.g. 03/04). */
  dayFirst: boolean;
}

export interface Transaction {
  /** Stable across re-imports of the same statement, so duplicates are skipped. */
  id: string;
  /** YYYY-MM-DD */
  date: string;
  description: string;
  amount: number;
}

export interface ParseResult {
  charges: Transaction[];
  /** Payments, refunds and credits — not spending, so not imported. */
  credits: number;
  /** Rows we couldn't read a date or amount from. */
  unreadable: number;
}

// ─── Decoding & CSV ───────────────────────────────────────────────────────────

/** UTF-8 if it's valid UTF-8, otherwise Shift_JIS (what most Japanese banks export). */
export function decode(buf: ArrayBuffer): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    text = new TextDecoder("shift_jis").decode(buf);
  }
  return text.replace(/^﻿/, "");
}

/** RFC 4180-ish: quoted fields, "" escapes, CRLF/LF, comma/tab/semicolon. */
export function parseCsv(text: string): string[][] {
  const firstLines = text.split(/\r?\n/, 10).join("\n");
  const delim = [",", "\t", ";"].reduce((best, d) =>
    firstLines.split(d).length > firstLines.split(best).length ? d : best,
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows
    .map((r) => r.map((f) => f.trim()))
    .filter((r) => r.some((f) => f !== ""));
}

// ─── Reading cells ────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

const MONTHS: Record<string, number> = Object.fromEntries(
  ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map((m, i) => [m, i + 1]),
);

/** Full-width digits and punctuation (common in Japanese exports) → ASCII. */
const halfWidth = (s: string) =>
  s.replace(/[０-９．，－／]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));

/**
 * Pull year / a / b out of a date cell. Year-first dates are unambiguous;
 * for "a/b/yyyy" the caller decides whether a is the day or the month.
 */
function dateParts(cell: string): { y: number; a: number; b: number; yearFirst: boolean } | null {
  const s = halfWidth(cell).replace(/\s+/g, "");
  let m = s.match(/^(\d{4})[/\-.年](\d{1,2})[/\-.月](\d{1,2})日?/);
  if (m) return { y: +m[1], a: +m[2], b: +m[3], yearFirst: true };
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return { y, a: +m[1], b: +m[2], yearFirst: false };
  }
  // "01 Oct 2024" / "Oct 1, 2024" (spaces already stripped)
  m = s.match(/^(\d{1,2})-?([A-Za-z]{3})[a-z]*-?,?(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return { y: +m[3], a: MONTHS[m[2].toLowerCase()], b: +m[1], yearFirst: true };
  m = s.match(/^([A-Za-z]{3})[a-z]*(\d{1,2}),?(\d{4})/);
  if (m && MONTHS[m[1].toLowerCase()]) return { y: +m[3], a: MONTHS[m[1].toLowerCase()], b: +m[2], yearFirst: true };
  return null;
}

function toDayKey(cell: string, dayFirst: boolean): string | null {
  const p = dateParts(cell);
  if (!p) return null;
  // Thai statements may use the Buddhist calendar (2567 = 2024).
  const y = p.y > 2400 ? p.y - 543 : p.y;
  const [mo, d] = p.yearFirst ? [p.a, p.b] : dayFirst ? [p.b, p.a] : [p.a, p.b];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getMonth() !== mo - 1) return null; // e.g. 31 Feb
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** "¥1,234", "1,234円", "(12.50)", "12.50-", "-฿99" → signed number. Strict, so
 * text that merely contains digits ("AMAZON 123") isn't mistaken for money. */
export function parseAmount(cell: string): number | null {
  let s = halfWidth(cell).replace(/\s|¥|￥|\$|฿|円|บาท|JPY|USD|THB|\+/gi, "");
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/^[-−▲△]/.test(s)) {
    negative = true;
    s = s.slice(1);
  } else if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(s)) return null;
  const n = Number(s.replace(/,/g, ""));
  return negative ? -n : n;
}

// ─── Finding the table & guessing columns ─────────────────────────────────────

const isDateish = (c: string) => dateParts(c) !== null;
const isAmountish = (c: string) => parseAmount(c) !== null && !isDateish(c);

/** Japanese cards often put the card name / member name above the header. */
export function findTable(rows: string[][]): Table | null {
  const looksLikeData = (r: string[]) => r.some(isDateish) && r.some(isAmountish);
  // The table starts at the first run of data rows — a lone "total due"
  // line in the preamble also has a date and an amount, so one isn't enough.
  const first = rows.findIndex((_, i) => rows.slice(i, i + 3).every(looksLikeData));
  if (first === -1) return null;

  const width = Math.max(...rows.slice(first, first + 20).map((r) => r.length));
  const header = first > 0 && !looksLikeData(rows[first - 1]) ? rows[first - 1] : null;
  const columns = Array.from({ length: width }, (_, i) => header?.[i] || `Column ${i + 1}`);
  const body = rows.slice(first).filter(looksLikeData);
  return { columns, rows: body.map((r) => columns.map((_, i) => r[i] ?? "")) };
}

const DATE_WORDS = /date|日付|利用日|ご利用日|วันที่/i;
const DESC_WORDS = /description|merchant|payee|details|内容|利用店|加盟店|ご利用先|摘要|รายการ|ร้านค้า/i;
const AMOUNT_WORDS = /amount|金額|利用金額|請求額|支払|จำนวนเงิน|ยอด/i;

export function guessMapping(t: Table): Mapping {
  const n = t.columns.length;
  const share = (col: number, test: (c: string) => boolean) =>
    t.rows.filter((r) => test(r[col])).length / Math.max(t.rows.length, 1);
  const best = (score: (col: number) => number, exclude: number[] = []) => {
    const cols = Array.from({ length: n }, (_, i) => i).filter((i) => !exclude.includes(i));
    return cols.length ? cols.reduce((a, b) => (score(b) > score(a) ? b : a)) : -1;
  };

  // Header words count most; the share of cells that parse breaks ties.
  const date = best((i) => share(i, isDateish) + (DATE_WORDS.test(t.columns[i]) ? 0.5 : 0));
  const amount = best(
    (i) => share(i, isAmountish) + (AMOUNT_WORDS.test(t.columns[i]) ? 0.5 : 0),
    [date],
  );
  const avgLen = (i: number) => t.rows.reduce((s, r) => s + r[i].length, 0) / Math.max(t.rows.length, 1);
  const description = best(
    (i) =>
      (DESC_WORDS.test(t.columns[i]) ? 100 : 0) +
      (share(i, (c) => /\p{L}/u.test(c)) > 0.5 ? avgLen(i) : 0),
    [date, amount],
  );

  return { date, description, amount, dayFirst: detectDayFirst(t, date) };
}

/** Any "13/04" proves day-first; any "04/13" proves month-first. */
function detectDayFirst(t: Table, col: number): boolean {
  for (const r of t.rows) {
    const p = dateParts(r[col]);
    if (!p || p.yearFirst) continue;
    if (p.a > 12) return true;
    if (p.b > 12) return false;
  }
  return true; // Japan & Thailand both write day before month in a/b/y form
}

/** True when the date column has a/b/y dates that never reveal their order. */
export function dateOrderAmbiguous(t: Table, col: number): boolean {
  let slashDates = false;
  for (const r of t.rows) {
    const p = dateParts(r[col]);
    if (!p || p.yearFirst) continue;
    slashDates = true;
    if (p.a > 12 || p.b > 12) return false;
  }
  return slashDates;
}

// ─── Turning rows into transactions ───────────────────────────────────────────

export async function toTransactions(t: Table, m: Mapping): Promise<ParseResult> {
  const read: { date: string; description: string; amount: number }[] = [];
  let unreadable = 0;
  for (const r of t.rows) {
    const date = toDayKey(r[m.date], m.dayFirst);
    const amount = parseAmount(r[m.amount]);
    if (!date || amount === null || amount === 0) {
      unreadable++;
      continue;
    }
    // NFKC turns full-width "ＡＭＡＺＯＮ．ＣＯ．ＪＰ" into "AMAZON.CO.JP".
    const description = (r[m.description] ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
    read.push({ date, description, amount });
  }

  // Charges are whichever sign most rows have (some exports list spending as
  // negative); the other sign is payments and refunds.
  const positives = read.filter((x) => x.amount > 0).length;
  const chargeSign = positives >= read.length - positives ? 1 : -1;
  const charges = read.filter((x) => Math.sign(x.amount) === chargeSign);

  // Same date + shop + amount can legitimately happen twice (two coffees), so
  // the nth occurrence gets its own id — and re-importing the file maps each
  // one back to the same id instead of adding it again.
  const seen = new Map<string, number>();
  const out: Transaction[] = [];
  for (const c of charges) {
    const amount = Math.abs(c.amount);
    const key = `${c.date}|${c.description}|${amount}`;
    const nth = (seen.get(key) ?? 0) + 1;
    seen.set(key, nth);
    out.push({ id: await stableId(`${key}|${nth}`), date: c.date, description: c.description, amount });
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return { charges: out, credits: read.length - charges.length, unreadable };
}

/** A UUID derived from the text (SHA-256), so the same row always gets the same id. */
async function stableId(text: string): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`monifes-import:${text}`)),
  ).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5 (name-based)
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = Array.from(hash, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
