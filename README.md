# Ledger

A monthly budget in Canadian dollars. The large number is what is left this month: income minus expenses. It updates as soon as you add, edit, or delete an entry.

This repository is a standalone web app. A Rocky Linux host can build it and serve the pages with nginx. There is no database and no account.

## Using Ledger

Open the site in a browser. The first visit fills the current month with sample entries so you can see the balance move. Those samples are not your real money.

### Remaining balance

- The hero figure is this month's income minus this month's expenses, in CAD.
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

The bar compares this month's remaining balance with that target. It is not a running total across months. An empty month has not moved the goal. An overspent month puts the goal on hold.

### Categories

| Kind | Categories |
| --- | --- |
| Expense | Housing, Groceries, Transport, Dining, Utilities, Health, Other |
| Income | Salary, Freelance, Other |

Internet belongs under Utilities. It is not its own category.

### Where entries are saved

Entries and the goal are saved in the browser that opens the site, under the storage name `ledger-budget-v1`. Nothing is sent to the Rocky host, and there is no account.

They remain after a refresh or after you close the tab. Clearing that browser's site data, or opening Ledger in another browser or on another device, starts from an empty ledger. The sample month appears again on a first visit.

Amounts are stored in cents so totals stay exact.

## Install on a standalone Rocky Linux host

For a Rocky Linux 8, 9, or 10 host, x86_64 or aarch64, with sudo. The host only serves the pages. Each visitor's entries stay in that visitor's browser.

You need Node.js 22 or newer to build. Rocky Linux 10 has it in AppStream. Rocky Linux 8 and 9 have it as the `nodejs:22` module stream. nginx serves the built files on port 80.

### 1. Install git, nginx, and Node.js 22

```bash
sudo dnf install -y git nginx
```

Rocky Linux 10:

```bash
sudo dnf install -y nodejs npm
```

Rocky Linux 9 or 8:

```bash
sudo dnf module enable -y nodejs:22
sudo dnf install -y nodejs npm
```

If `dnf module list nodejs` does not show stream 22, use NodeSource instead:

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo dnf install -y nodejs
```

Check the version. It must be 22 or newer:

```bash
node --version
npm --version
```

### 2. Clone and build

```bash
git clone https://github.com/pyuriy/ledger.git
cd ledger
npm install
npm run build
```

`npm run build` writes a static site into `dist/`.

### 3. Publish the site and turn on nginx

```bash
sudo mkdir -p /var/www/ledger
sudo find /var/www/ledger -mindepth 1 -delete
sudo cp -r dist/. /var/www/ledger/
sudo restorecon -RF /var/www/ledger
sudo cp install/ledger.conf /etc/nginx/conf.d/ledger.conf
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

`install/ledger.conf` listens on port 80 as the default site, so `http://<host>/` is Ledger rather than the nginx welcome page.

If `nginx -t` reports a duplicate default server, comment out the stock `server { listen 80; ... }` block in `/etc/nginx/nginx.conf`, then run `sudo nginx -t` and `sudo systemctl reload nginx` again.

Do not copy with `cp -a`. That keeps the home-directory SELinux label, and nginx is then denied. `restorecon` puts `/var/www/ledger` back to `httpd_sys_content_t`.

### 4. Open the firewall

Skip this if firewalld is not running.

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

Open `http://<host>/` from a browser on the same network. Entries you add are stored in that browser, not on the server.

### One-step installer

From a clone, as a normal user with sudo (not as root):

```bash
chmod +x install/rocky-install.sh
./install/rocky-install.sh
```

The script does the steps above. Run it again after `git pull` to rebuild and replace `/var/www/ledger`.

### Update

```bash
cd ledger
git pull
npm install
npm run build
sudo find /var/www/ledger -mindepth 1 -delete
sudo cp -r dist/. /var/www/ledger/
sudo restorecon -RF /var/www/ledger
```

### Work on it without nginx

```bash
npm run dev
```

Then open `http://<host>:8080/`. This is a development server. It is not the install used by nginx.

## What is in this repository

| Path | What it does |
| --- | --- |
| `src/main.tsx` | Starts the page |
| `src/components/budget/ledger-app.tsx` | Balance, month switcher, goal, chart, entry list |
| `src/components/budget/transaction-dialog.tsx` | Add and edit form |
| `src/components/budget/spending-chart.tsx` | Spending chart |
| `src/lib/budget/store.ts` | Entries, goal, and browser save |
| `src/lib/budget/types.ts` | Categories and data shapes |
| `src/lib/budget/format.ts` | Money and dates, in CAD |
| `src/lib/budget/calc.ts` | Month totals and category breakdown |
| `src/styles.css` | Layout and colours |
| `public/favicon.svg` | Tab icon |
| `install/ledger.conf` | nginx site |
| `install/rocky-install.sh` | Rocky Linux installer |

Packages: React, Zustand (with persist), Recharts, Radix Dialog and Alert Dialog, Sonner, and Lucide icons. Display type is Fraunces. Body type is Source Sans 3. Both are loaded from Google Fonts when the browser can reach the internet.
