import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Bus,
  Ellipsis,
  HeartPulse,
  House,
  PenLine,
  PiggyBank,
  ShoppingBasket,
  Utensils,
  Zap,
} from "lucide-react";

export type Kind = "income" | "expense";

export type Transaction = {
  id: string;
  kind: Kind;
  amountCents: number;
  category: string;
  note: string;
  date: string;
  createdAt: number;
};

export type NewTransaction = {
  kind: Kind;
  amountCents: number;
  category: string;
  note: string;
  date: string;
};

export type Goal = {
  name: string;
  targetCents: number;
};

export type Category = {
  id: string;
  label: string;
  color: string;
  icon: LucideIcon;
};

export const EXPENSE_CATEGORIES: Category[] = [
  { id: "housing", label: "Housing", color: "var(--color-cat-1)", icon: House },
  { id: "groceries", label: "Groceries", color: "var(--color-cat-2)", icon: ShoppingBasket },
  { id: "transport", label: "Transport", color: "var(--color-cat-3)", icon: Bus },
  { id: "dining", label: "Dining", color: "var(--color-cat-4)", icon: Utensils },
  { id: "utilities", label: "Utilities", color: "var(--color-cat-5)", icon: Zap },
  { id: "health", label: "Health", color: "var(--color-cat-6)", icon: HeartPulse },
  { id: "other", label: "Other", color: "var(--color-cat-7)", icon: Ellipsis },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "salary", label: "Salary", color: "var(--color-pine)", icon: Briefcase },
  { id: "freelance", label: "Freelance", color: "var(--color-cat-2)", icon: PenLine },
  { id: "other", label: "Other", color: "var(--color-cat-5)", icon: PiggyBank },
];

export function categoriesFor(kind: Kind): Category[] {
  return kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function findCategory(kind: Kind, id: string): Category {
  const list = categoriesFor(kind);
  return list.find((category) => category.id === id) ?? list[list.length - 1];
}
