import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isISODate } from "./format";
import type { Goal, NewTransaction, Transaction } from "./types";

type BudgetState = {
  transactions: Transaction[];
  goal: Goal;
  hydrated: boolean;
  addTransaction: (input: NewTransaction) => void;
  updateTransaction: (id: string, input: NewTransaction) => void;
  removeTransaction: (id: string) => Transaction | undefined;
  restoreTransaction: (tx: Transaction) => void;
  setGoal: (goal: Goal) => void;
  clearMonth: (month: string) => void;
};

function buildSeed(now = new Date()): Transaction[] {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const date = (day: number) => `${y}-${m}-${String(day).padStart(2, "0")}`;
  const t0 = Date.UTC(y, now.getMonth(), 1);
  const row = (
    id: string,
    kind: Transaction["kind"],
    amountCents: number,
    category: string,
    note: string,
    day: number,
    order: number,
  ): Transaction => ({
    id,
    kind,
    amountCents,
    category,
    note,
    date: date(day),
    createdAt: t0 + order,
  });

  return [
    row("seed-pay", "income", 384000, "salary", "Paycheque", 1, 1),
    row("seed-side", "income", 42000, "freelance", "Weekend project", 3, 2),
    row("seed-rent", "expense", 145000, "housing", "Rent", 1, 3),
    row("seed-pass", "expense", 12800, "transport", "Monthly pass", 1, 4),
    row("seed-market", "expense", 12763, "groceries", "Market", 2, 5),
    row("seed-hydro", "expense", 7840, "utilities", "Hydro", 2, 6),
    row("seed-net", "expense", 8500, "utilities", "Internet", 3, 7),
    row("seed-store", "expense", 6418, "groceries", "Corner store", 4, 8),
    row("seed-dinner", "expense", 4280, "dining", "Dinner out", 4, 9),
    row("seed-pharm", "expense", 2315, "health", "Pharmacy", 4, 10),
    row("seed-lunch", "expense", 1840, "dining", "Lunch", 5, 11),
  ];
}

function clean(input: NewTransaction): NewTransaction | null {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.amountCents > 999999999) {
    return null;
  }
  if (!isISODate(input.date)) return null;
  if (input.kind !== "income" && input.kind !== "expense") return null;
  return { ...input, note: input.note.trim().slice(0, 80), category: input.category || "other" };
}

export const useBudget = create<BudgetState>()(
  persist(
    (set, get) => ({
      transactions: buildSeed(),
      goal: { name: "Emergency fund", targetCents: 280000 },
      hydrated: false,
      addTransaction: (input) => {
        const next = clean(input);
        if (!next) return;
        const tx: Transaction = {
          ...next,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        };
        set((state) => ({ transactions: [tx, ...state.transactions] }));
      },
      updateTransaction: (id, input) => {
        const next = clean(input);
        if (!next) return;
        set((state) => ({
          transactions: state.transactions.map((tx) => (tx.id === id ? { ...tx, ...next } : tx)),
        }));
      },
      removeTransaction: (id) => {
        const existing = get().transactions.find((tx) => tx.id === id);
        if (!existing) return undefined;
        set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== id) }));
        return existing;
      },
      restoreTransaction: (tx) => {
        set((state) => {
          if (state.transactions.some((item) => item.id === tx.id)) return state;
          return { transactions: [...state.transactions, tx] };
        });
      },
      setGoal: (goal) => {
        const name = goal.name.trim().slice(0, 40) || "Savings goal";
        const targetCents = Math.round(goal.targetCents);
        if (!Number.isInteger(targetCents) || targetCents <= 0) return;
        set({ goal: { name, targetCents } });
      },
      clearMonth: (month) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.date.slice(0, 7) !== month),
        }));
      },
    }),
    {
      name: "ledger-budget-v1",
      skipHydration: true,
      partialize: (state) => ({
        transactions: state.transactions,
        goal: state.goal,
      }),
    },
  ),
);
