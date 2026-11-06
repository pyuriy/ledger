import { useEffect, useMemo, useState, type FormEvent } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { SpendingChart } from "@/components/budget/spending-chart";
import { TransactionDialog } from "@/components/budget/transaction-dialog";
import { breakdown, inMonth, totals } from "@/lib/budget/calc";
import {
  centsToInput,
  currentMonth,
  formatDay,
  formatMoney,
  formatMonth,
  formatSigned,
  parseMoney,
  percentOf,
  shiftMonth,
  todayISO,
} from "@/lib/budget/format";
import { useBudget } from "@/lib/budget/store";
import { findCategory } from "@/lib/budget/types";
import type { Kind, NewTransaction, Transaction } from "@/lib/budget/types";

type Filter = "all" | Kind;

type Draft = {
  id?: string;
  kind: Kind;
  amount: string;
  category: string;
  note: string;
  date: string;
};

function Skeleton() {
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-2xl font-medium">Ledger</h1>
      <p className="mt-8 text-sm text-muted">Loading your month…</p>
      <div className="mt-4 h-12 w-48 rounded-lg bg-line" />
      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="h-12 rounded-lg bg-line" />
        <div className="h-12 rounded-lg bg-line" />
        <div className="h-12 rounded-lg bg-line" />
      </div>
    </main>
  );
}

function groupByDate(transactions: Transaction[]) {
  const sorted = [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
  const groups: { date: string; items: Transaction[] }[] = [];
  for (const tx of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.date) last.items.push(tx);
    else groups.push({ date: tx.date, items: [tx] });
  }
  return groups;
}

export function LedgerApp() {
  const transactions = useBudget((state) => state.transactions);
  const goal = useBudget((state) => state.goal);
  const hydrated = useBudget((state) => state.hydrated);
  const addTransaction = useBudget((state) => state.addTransaction);
  const updateTransaction = useBudget((state) => state.updateTransaction);
  const removeTransaction = useBudget((state) => state.removeTransaction);
  const restoreTransaction = useBudget((state) => state.restoreTransaction);
  const setGoal = useBudget((state) => state.setGoal);
  const clearMonth = useBudget((state) => state.clearMonth);

  const [month, setMonth] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalName, setGoalName] = useState(goal.name);
  const [goalAmount, setGoalAmount] = useState(centsToInput(goal.targetCents));
  const [goalError, setGoalError] = useState("");

  useEffect(() => {
    let alive = true;
    void Promise.resolve(useBudget.persist.rehydrate()).finally(() => {
      if (!alive) return;
      useBudget.setState({ hydrated: true });
      setMonth(currentMonth());
    });
    return () => {
      alive = false;
    };
  }, []);

  const monthTx = useMemo(
    () => (month ? inMonth(transactions, month) : []),
    [transactions, month],
  );
  const { income, expense, remaining } = useMemo(() => totals(monthTx), [monthTx]);
  const spending = useMemo(() => breakdown(monthTx, "expense"), [monthTx]);
  const incomeSlices = useMemo(() => breakdown(monthTx, "income"), [monthTx]);
  const filtered = monthTx.filter((tx) => (filter === "all" ? true : tx.kind === filter));
  const groups = groupByDate(filtered);
  const isSample = monthTx.length > 0 && monthTx.every((tx) => tx.id.startsWith("seed-"));
  const viewingNow = month === currentMonth();
  const overspent = remaining < 0;
  const goalPct =
    goal.targetCents > 0
      ? Math.round(Math.min(100, Math.max(0, (remaining / goal.targetCents) * 100)))
      : 0;

  if (!hydrated || !month) return <Skeleton />;

  function openCreate(kind: Kind) {
    setDraft({ kind, amount: "", category: "", note: "", date: todayISO() });
  }

  function openEdit(tx: Transaction) {
    setDraft({
      id: tx.id,
      kind: tx.kind,
      amount: centsToInput(tx.amountCents),
      category: tx.category,
      note: tx.note,
      date: tx.date,
    });
  }

  function saveEntry(value: NewTransaction) {
    if (draft?.id) updateTransaction(draft.id, value);
    else addTransaction(value);
    setMonth(value.date.slice(0, 7));
    setDraft(null);
  }

  function deleteEntry(tx: Transaction) {
    const removed = removeTransaction(tx.id);
    if (!removed) return;
    const title = removed.note.trim() || findCategory(removed.kind, removed.category).label;
    toast(`Removed ${title}`, {
      action: {
        label: "Undo",
        onClick: () => restoreTransaction(removed),
      },
      duration: 5000,
    });
  }

  function startGoalEdit() {
    setGoalName(goal.name);
    setGoalAmount(centsToInput(goal.targetCents));
    setGoalError("");
    setEditingGoal(true);
  }

  function saveGoal(event: FormEvent) {
    event.preventDefault();
    const cents = parseMoney(goalAmount);
    if (cents == null) {
      setGoalError("Enter a target greater than zero.");
      return;
    }
    setGoal({ name: goalName, targetCents: cents });
    setEditingGoal(false);
  }

  const quietMonth = monthTx.length === 0;
  const ahead = remaining - goal.targetCents;
  const goalStatus = quietMonth
    ? "Nothing logged yet, so this goal has not moved."
    : overspent
      ? `Overspent by ${formatMoney(Math.abs(remaining))}. This goal is on hold.`
      : ahead > 0
        ? `Goal reached — ${formatMoney(ahead)} past the target.`
        : ahead === 0
          ? "Goal reached."
          : `${formatMoney(-ahead)} still to set aside.`;

  const gapLabel = overspent ? "Over" : ahead > 0 ? "Past goal" : "To goal";
  const gapValue = overspent
    ? formatMoney(Math.abs(remaining))
    : ahead > 0
      ? formatMoney(ahead)
      : formatMoney(Math.max(-ahead, 0));

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 sm:px-6 sm:pt-8 sm:pb-12">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-medium">Ledger</h1>
            <p className="text-sm text-muted">Monthly budget</p>
          </div>
          <div className="flex shrink-0 items-center rounded-full border border-line bg-surface">
            <button
              type="button"
              className="icon-btn"
              aria-label="Previous month"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <p className="min-w-28 text-center text-sm font-semibold">{formatMonth(month, "short")}</p>
            <button
              type="button"
              className="icon-btn"
              aria-label="Next month"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="mt-8" aria-labelledby="remaining-label">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p id="remaining-label" className="text-sm font-semibold text-muted">
                {overspent ? `${formatMonth(month)} overspent` : `${formatMonth(month)} remaining`}
                {viewingNow ? " · now" : ""}
                <span className="font-medium"> · CAD</span>
              </p>
              <p
                id="remaining-balance"
                aria-live="polite"
                className={overspent ? "hero-figure mt-2 text-clay" : "hero-figure mt-2 text-ink"}
              >
                {formatMoney(remaining)}
              </p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button type="button" className="btn btn-pine" onClick={() => openCreate("income")}>
                <Plus className="size-4" aria-hidden="true" />
                Add income
              </button>
              <button type="button" className="btn btn-soft" onClick={() => openCreate("expense")}>
                <Plus className="size-4" aria-hidden="true" />
                Add expense
              </button>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Income</dt>
              <dd className="mt-1 truncate text-sm font-semibold text-pine sm:text-base">{formatMoney(income)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Spent</dt>
              <dd className="mt-1 truncate text-sm font-semibold sm:text-base">{formatMoney(expense)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">{gapLabel}</dt>
              <dd
                className={
                  overspent
                    ? "mt-1 truncate text-sm font-semibold text-clay sm:text-base"
                    : "mt-1 truncate text-sm font-semibold sm:text-base"
                }
              >
                {gapValue}
              </dd>
            </div>
          </dl>
        </section>

        {isSample ? (
          <p className="mt-5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
            <span>Sample entries, so you can see the balance move.</span>
            <button type="button" className="link-btn text-ink" onClick={() => setConfirmClear(true)}>
              Clear sample
            </button>
          </p>
        ) : null}

        <div className="split mt-5">
          <section className="card" aria-labelledby="spending-heading">
            <h2 id="spending-heading" className="text-lg font-semibold">
              Spending
            </h2>
            <div className="mt-4">
              <SpendingChart slices={spending} total={expense} />
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="card" aria-labelledby="goal-heading">
              <div className="flex items-start justify-between gap-3">
                <h2 id="goal-heading" className="text-lg font-semibold">
                  Savings goal
                </h2>
                {!editingGoal ? (
                  <button type="button" className="link-btn -mr-1 text-sm text-ink" onClick={startGoalEdit}>
                    Edit goal
                  </button>
                ) : null}
              </div>

              {editingGoal ? (
                <form className="mt-3 flex flex-col gap-3" onSubmit={saveGoal}>
                  <label className="block">
                    <span className="text-sm font-semibold">Name</span>
                    <input
                      className="field mt-1.5"
                      maxLength={40}
                      value={goalName}
                      onChange={(event) => setGoalName(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">Target</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-xl border border-line bg-paper px-3 focus-within:border-pine">
                      <span className="text-muted" aria-hidden="true">$</span>
                      <input
                        className="field border-0 bg-transparent px-0"
                        inputMode="decimal"
                        aria-label="Savings target in Canadian dollars"
                        value={goalAmount}
                        onChange={(event) => {
                          setGoalAmount(event.target.value);
                          setGoalError("");
                        }}
                      />
                    </span>
                  </label>
                  {goalError ? (
                    <p className="text-sm font-medium text-clay" role="alert">
                      {goalError}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-pine flex-1">
                      Save goal
                    </button>
                    <button type="button" className="btn btn-ghost flex-1" onClick={() => setEditingGoal(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="mt-3 text-sm text-muted">{goal.name}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatMoney(Math.max(remaining, 0))}
                    <span className="text-base font-medium text-muted"> of {formatMoney(goal.targetCents)}</span>
                  </p>
                  <div
                    className="track mt-3"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={goal.targetCents}
                    aria-valuenow={Math.max(0, Math.min(remaining, goal.targetCents))}
                    aria-label={`${goal.name} progress`}
                  >
                    <span style={{ width: `${goalPct}%` }} />
                  </div>
                  <p className="mt-2 flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-pretty text-muted">{goalStatus}</span>
                    <span className={overspent ? "shrink-0 font-semibold text-clay" : "shrink-0 font-semibold text-pine"}>
                      {goalPct}%
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-pretty text-muted">
                    Progress uses this month’s remaining balance.
                  </p>
                </>
              )}
            </section>

            <section className="card" aria-labelledby="income-heading">
              <h2 id="income-heading" className="text-lg font-semibold">
                Income
              </h2>
              {incomeSlices.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No income yet this month.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {incomeSlices.map((slice) => (
                    <li key={slice.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">
                        {slice.label}
                        <span className="ml-2 text-sm font-normal text-muted">
                          {percentOf(slice.cents, income)}%
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-pine">{formatMoney(slice.cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        <section className="card mt-4" aria-labelledby="entries-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="entries-heading" className="text-lg font-semibold">
              Entries
            </h2>
            <p className="text-sm text-muted">{filtered.length}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter entries">
            {(
              [
                ["all", "All"],
                ["income", "Income"],
                ["expense", "Expenses"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="chip"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {groups.length === 0 ? (
            <p className="mt-5 text-sm text-pretty text-muted">
              {filter === "all"
                ? "Nothing logged this month. Add income or an expense and the balance updates right away."
                : filter === "income"
                  ? "No income in this month."
                  : "No expenses in this month."}
            </p>
          ) : (
            <div className="mt-4">
              {groups.map((group) => (
                <section key={group.date} className="mt-4 first:mt-0">
                  <h3 className="text-xs font-semibold text-muted">{formatDay(group.date)}</h3>
                  <ul>
                    {group.items.map((tx) => {
                      const category = findCategory(tx.kind, tx.category);
                      const title = tx.note.trim() || category.label;
                      const Icon = category.icon;
                      return (
                        <li key={tx.id} className="flex items-center gap-2 border-b border-line py-1 last:border-b-0">
                          <span
                            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-paper"
                            aria-hidden="true"
                          >
                            <Icon className="size-4" style={{ color: category.color }} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="truncate font-semibold">{title}</p>
                              <p
                                className={
                                  tx.kind === "income"
                                    ? "shrink-0 font-semibold text-pine"
                                    : "shrink-0 font-semibold text-clay"
                                }
                              >
                                {formatSigned(tx.amountCents, tx.kind)}
                              </p>
                            </div>
                            <p className="truncate text-sm text-muted">
                              {tx.note.trim() ? category.label : tx.kind === "income" ? "Income" : "Expense"}
                            </p>
                          </div>
                          <div className="flex shrink-0">
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`Edit ${title}`}
                              onClick={() => openEdit(tx)}
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              aria-label={`Delete ${title}`}
                              onClick={() => deleteEntry(tx)}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {monthTx.length > 0 && !isSample ? (
            <button type="button" className="link-btn mt-2 text-sm text-muted" onClick={() => setConfirmClear(true)}>
              Clear this month
            </button>
          ) : null}
        </section>
      </main>

      <div className="dock">
        <div className="mx-auto flex max-w-5xl gap-2">
          <button type="button" className="btn btn-pine flex-1" onClick={() => openCreate("income")}>
            <Plus className="size-4" aria-hidden="true" />
            Add income
          </button>
          <button type="button" className="btn btn-soft flex-1" onClick={() => openCreate("expense")}>
            <Plus className="size-4" aria-hidden="true" />
            Add expense
          </button>
        </div>
      </div>

      {draft ? (
        <TransactionDialog
          key={`${draft.id ?? "new"}-${draft.kind}-${draft.date}`}
          initial={draft}
          onClose={() => setDraft(null)}
          onSubmit={saveEntry}
        />
      ) : null}

      <AlertDialog.Root open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="overlay" />
          <AlertDialog.Content className="sheet sheet-center">
            <AlertDialog.Title className="font-display text-2xl font-medium">
              Clear {formatMonth(month)}?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-pretty text-muted">
              This removes {monthTx.length} {monthTx.length === 1 ? "entry" : "entries"}. Other months stay.
              You cannot undo this.
            </AlertDialog.Description>
            <div className="mt-5 flex gap-2">
              <AlertDialog.Cancel className="btn btn-ghost flex-1">Cancel</AlertDialog.Cancel>
              <AlertDialog.Action
                className="btn btn-clay flex-1"
                onClick={() => clearMonth(month)}
              >
                Clear month
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <Toaster
        theme="light"
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            color: "var(--color-ink)",
            border: "1px solid var(--color-line)",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </div>
  );
}
