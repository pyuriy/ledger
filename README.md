# Ledger

A monthly budget in Canadian dollars. The large number is what is left this month: income minus expenses. It updates as soon as you add, edit, or delete an entry.

This repository is the source for that app, plus these instructions.

## Using Ledger

Open the app in a browser. The first visit fills the current month with sample entries so you can see the balance move. Those samples are not your real money.

### Remaining balance

- The hero figure is this month’s income minus this month’s expenses, in CAD.
- Dark ink means money is left. Clay red means the month is overspent.
- **Income**, **Spent**, and **To goal** sit under the balance. If you are past the savings target, that third figure reads **Past goal**. If the month is overspent, it reads **Over**.

### Months

Use the arrows beside the month name. Only the month you are looking at is counted. Adding an entry on a date in another month switches the view to that month.

### Add, edit, and delete

- **Add income** and **Add expense** are at the top on a wide screen, and in the bar at the bottom on a phone.
- Enter an amount in dollars (for example `12.50`), pick a category, add an optional note, and set the date. The form shows what the remaining balance would become before you save.
- In **Entries**, the pencil edits a row and the trash icon deletes it. A short notice lets you undo a delete. **Clear this month** removes every entry in the month you are viewing and cannot be undone. Other months stay.
- Filter the list with **All**, **Income**, or **Expenses**. Rows are grouped by date.

### Spending chart

Expenses for the month are shown as a ring and as bars by category, with the dollar amount and the share of spending.

### Savings goal

The goal starts as **Emergency fund** with a target of $2,800.00. **Edit goal** changes the name and the target.

The bar compares this month’s remaining balance with that target. It is not a running total across months. An empty month has not moved the goal. An overspent month puts the goal on hold.

### Categories

| Kind | Categories |
| --- | --- |
| Expense | Housing, Groceries, Transport, Dining, Utilities, Health, Other |
| Income | Salary, Freelance, Other |

Internet belongs under Utilities. It is not its own category.

### Where entries are saved

Entries and the goal are saved in this browser only, under the storage name `ledger-budget-v1`. Nothing is sent to a server, and there is no account.

They remain after a refresh or after you close the tab. Clearing this browser’s site data, or opening Ledger in another browser or on another device, starts from an empty ledger. The sample month appears again on a first visit.

Amounts are stored in cents so totals stay exact.

## What is in this repository

These files are the budget feature. They expect a React page that renders `LedgerApp`, plus Tailwind CSS and the packages named below. Cloning this repository by itself will not start a server.

| Path | What it does |
| --- | --- |
| `src/components/budget/ledger-app.tsx` | Page: balance, month switcher, goal, chart, entry list |
| `src/components/budget/transaction-dialog.tsx` | Add and edit form |
| `src/components/budget/spending-chart.tsx` | Spending chart |
| `src/lib/budget/store.ts` | Entries, goal, and browser save |
| `src/lib/budget/types.ts` | Categories and data shapes |
| `src/lib/budget/format.ts` | Money and dates, in CAD |
| `src/lib/budget/calc.ts` | Month totals and category breakdown |
| `src/routes/index.tsx` | Home page, which renders Ledger |
| `src/styles.css` | Layout and colours |
| `public/favicon.svg` | Tab icon |

Packages the page uses: React, Zustand (with persist), Recharts, Radix Dialog and Alert Dialog, Sonner, and Lucide icons. Display type is Fraunces. Body type is Source Sans 3.
