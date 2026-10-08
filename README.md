# Nemora Quote Generator

Polished Next.js quotation app for **Nemora**. Type a service, pick a package, then edit a print-ready quote with live totals — no AI or LLM APIs.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- `sessionStorage` for the current draft / working quote
- `localStorage` for saved quotes, package config, and settings
- Print CSS + `window.print()` for PDF download

## Packages (source of truth)

See [`data/packages.json`](./data/packages.json). Each deliverable has a default **amount**. Defaults:

| Package  | Price     |
|----------|-----------|
| Basic    | ₹5,000    |
| Standard | ₹8,500    |
| Premium  | ₹12,000+  |

Rates can be overridden in **Admin** (stored in the browser).

## Routes

| Path             | Purpose                                      |
|------------------|----------------------------------------------|
| `/`              | Home + Create quotation                      |
| `/quote/new`     | Service → Package (clickable stepper)        |
| `/quote/preview` | Editable quote, GST, PDF print               |
| `/quotes`        | Search, filter, duplicate, export/import     |
| `/quotes/[id]`   | Open & edit a saved quote                    |
| `/admin`         | Package rates, GST defaults, quote ID prefix |

## Features (Phases 1–5)

- Editable line items with rates; add / remove / reorder (drag or ↑↓)
- Live total + 40% advance / 60% delivery breakdown
- Optional GST; validity end date; sequential IDs (`NMR-2026-0001`)
- Restore package defaults; unsaved-edits badge
- Print-ready document layout
- Saved-quote search, duplicate, JSON backup
- Package comparison strip; mobile-friendly stepper
- Admin config for packages & settings

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

## Flow

1. **Chat** — type the service (e.g. Coffee shop) on the home chatbot
2. **Optimize** — pick requirement tags for this client
3. **Package** — select Basic / Standard / Premium (best-fit shown)
4. **PDF** — enter client name + mobile on the quote sheet, then Download PDF / Save
