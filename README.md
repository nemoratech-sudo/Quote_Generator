# Nemora Quote Generator

Polished Next.js quotation app for **Nemora**. Type a service, pick a fixed package (Basic / Standard / Premium), and generate a print-ready quote — no AI or LLM APIs.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- `sessionStorage` for the current draft
- `localStorage` for saved quotes
- Print CSS + `window.print()` for PDF download

## Packages (source of truth)

See [`data/packages.json`](./data/packages.json):

| Package  | Price     |
|----------|-----------|
| Basic    | ₹5,000    |
| Standard | ₹8,500    |
| Premium  | ₹12,000+  |

Typed service only changes the quote title (e.g. `Quotation for Ice Cream Shop — Premium`). Deliverables stay fixed per package.

## Routes

| Path             | Purpose                          |
|------------------|----------------------------------|
| `/`              | Home with Create quotation CTA   |
| `/quote/new`     | Service → Package steps          |
| `/quote/preview` | Printable quote document         |
| `/quotes`        | Saved quotes (localStorage)      |

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

1. Enter a service (optional client name + city)
2. Choose Basic, Standard, or Premium
3. Preview the quotation, save it, or download PDF via print
