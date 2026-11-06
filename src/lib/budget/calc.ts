import { findCategory } from "./types";
import type { Kind, Transaction } from "./types";

export type Slice = {
  id: string;
  label: string;
  cents: number;
  color: string;
};

export function inMonth(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((tx) => tx.date.slice(0, 7) === month);
}

export function totals(transactions: Transaction[]): { income: number; expense: number; remaining: number } {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.kind === "income") income += tx.amountCents;
    else expense += tx.amountCents;
  }
  return { income, expense, remaining: income - expense };
}

export function breakdown(transactions: Transaction[], kind: Kind): Slice[] {
  const sums = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.kind !== kind) continue;
    sums.set(tx.category, (sums.get(tx.category) ?? 0) + tx.amountCents);
  }
  return [...sums.entries()]
    .map(([id, cents]) => {
      const category = findCategory(kind, id);
      return { id, cents, label: category.label, color: category.color };
    })
    .sort((a, b) => b.cents - a.cents || a.label.localeCompare(b.label));
}

export function previewRemaining(
  transactions: Transaction[],
  draft: { id?: string; kind: Kind; amountCents: number; date: string },
): number {
  const month = draft.date.slice(0, 7);
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (draft.id && tx.id === draft.id) continue;
    if (tx.date.slice(0, 7) !== month) continue;
    if (tx.kind === "income") income += tx.amountCents;
    else expense += tx.amountCents;
  }
  if (draft.kind === "income") income += draft.amountCents;
  else expense += draft.amountCents;
  return income - expense;
}
