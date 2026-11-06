export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(ym: string, style: "long" | "short" = "long"): string {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { month: style, year: "numeric" }).format(
    new Date(y, (m ?? 1) - 1, 1),
  );
}

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(
    new Date(y, (m ?? 1) - 1, d ?? 1),
  );
}

export function todayISO(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const formatted = money.format(Math.floor(abs / 100) + (abs % 100) / 100);
  return negative ? `−${formatted}` : formatted;
}

export function formatSigned(cents: number, kind: "income" | "expense"): string {
  const body = formatMoney(Math.abs(cents));
  return kind === "income" ? `+${body}` : `−${body}`;
}

export function centsToInput(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function parseMoney(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  if (whole.length > 7) return null;
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isInteger(cents) || cents <= 0) return null;
  return cents;
}

export function percentOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
