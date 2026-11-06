import { useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { previewRemaining } from "@/lib/budget/calc";
import { formatMoney, formatMonth, isISODate, parseMoney } from "@/lib/budget/format";
import { useBudget } from "@/lib/budget/store";
import { categoriesFor } from "@/lib/budget/types";
import type { Kind, NewTransaction } from "@/lib/budget/types";

type Initial = {
  id?: string;
  kind: Kind;
  amount: string;
  category: string;
  note: string;
  date: string;
};

export function TransactionDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Initial;
  onClose: () => void;
  onSubmit: (value: NewTransaction) => void;
}) {
  const transactions = useBudget((state) => state.transactions);
  const amountRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [amount, setAmount] = useState(initial.amount);
  const [category, setCategory] = useState(initial.category);
  const [note, setNote] = useState(initial.note);
  const [date, setDate] = useState(initial.date);
  const [error, setError] = useState("");

  const categories = categoriesFor(kind);
  const cents = parseMoney(amount);
  const preview =
    cents != null && isISODate(date)
      ? previewRemaining(transactions, {
          id: initial.id,
          kind,
          amountCents: cents,
          date,
        })
      : null;

  function changeKind(next: Kind) {
    setKind(next);
    const allowed = categoriesFor(next);
    if (!allowed.some((item) => item.id === category)) setCategory("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseMoney(amount);
    if (parsed == null) {
      setError("Enter an amount greater than zero, up to $9,999,999.");
      amountRef.current?.focus();
      return;
    }
    if (!category) {
      setError("Pick a category.");
      return;
    }
    if (!isISODate(date)) {
      setError("Choose a valid date.");
      return;
    }
    onSubmit({ kind, amountCents: parsed, category, note, date });
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="sheet"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            amountRef.current?.focus();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-display text-2xl font-medium">
                {initial.id ? "Edit entry" : kind === "income" ? "Add income" : "Add expense"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-muted">
                Saved entries update the remaining balance immediately.
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-btn shrink-0" aria-label="Close">
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Entry type">
              <button
                type="button"
                className="chip"
                data-kind="income"
                aria-pressed={kind === "income"}
                onClick={() => changeKind("income")}
              >
                Income
              </button>
              <button
                type="button"
                className="chip"
                data-kind="expense"
                aria-pressed={kind === "expense"}
                onClick={() => changeKind("expense")}
              >
                Expense
              </button>
            </div>

            <label className="block">
              <span className="text-sm font-semibold">Amount</span>
              <span className="mt-1.5 flex items-center gap-1 rounded-xl border border-line bg-paper px-3 focus-within:border-pine">
                <span className="text-xl text-muted" aria-hidden="true">$</span>
                <input
                  ref={amountRef}
                  className="amount-input"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  aria-label="Amount in Canadian dollars"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setError("");
                  }}
                />
              </span>
            </label>

            <fieldset>
              <legend className="text-sm font-semibold">Category</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="chip"
                    data-kind={kind}
                    aria-pressed={category === item.id}
                    onClick={() => {
                      setCategory(item.id);
                      setError("");
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-sm font-semibold">Note</span>
              <input
                className="field mt-1.5"
                maxLength={80}
                placeholder="What was this for?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Date</span>
              <input
                className="field mt-1.5"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setError("");
                }}
              />
            </label>

            {preview != null ? (
              <p className="text-sm text-muted" aria-live="polite">
                {formatMonth(date.slice(0, 7))} remaining would be{" "}
                <span className={preview < 0 ? "font-semibold text-clay" : "font-semibold text-ink"}>
                  {formatMoney(preview)}
                </span>
              </p>
            ) : null}

            {error ? (
              <p className="text-sm font-medium text-clay" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className={kind === "income" ? "btn btn-pine" : "btn btn-clay"}>
              {initial.id ? "Save changes" : kind === "income" ? "Add income" : "Add expense"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
