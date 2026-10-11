# Nemora Quote Generator

Polished Next.js **quotation chatbot** for **Nemora**. Chat analyzes the business (NVIDIA AI), suggests common requirements, then package → editable PDF. Package **prices stay fixed** in catalog/Admin — AI never invents rates.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- NVIDIA NIM via OpenAI SDK (`POST /api/analyze`, default `deepseek-ai/deepseek-v4.1-flash`)
- `sessionStorage` for the current draft / working quote
- `localStorage` for saved quotes, package config, and settings
- Print CSS + `window.print()` for PDF download

## AI setup

1. Create a key at [build.nvidia.com/settings](https://build.nvidia.com/settings)
2. Copy [`.env.example`](./.env.example) → `.env`
3. Set `NVIDIA_API_KEY=nvapi-...`
4. Optional: `NVIDIA_MODEL=deepseek-ai/deepseek-v4.1-flash` (enable the model on [build.nvidia.com](https://build.nvidia.com); prefer a small instruct model for &lt;10s)

**Analyze latency (&lt;10s):** keyword niche match skips NVIDIA (ms); responses are cached 10 min; AI has a hard 10s abort then local fallback. If NVIDIA is slow or the model isn’t enabled for your key, you still get a quote path under 10s via local match.

Without a key, the chatbot falls back to local niche matching.

## Chat training (help without AI)

Meta questions (help, list all services, pricing, website vs app) are handled locally in [`src/lib/chat-guide.ts`](./src/lib/chat-guide.ts) — they **never** call `/api/analyze`.

| User says | Bot does |
|-----------|----------|
| hi / help | Steps and commands |
| list all services | Niches + example businesses |
| how do packages work | Catalog pricing rules |
| website vs app | Platform hints from outcomes |
| start over | Reset flow (any phase) |

Quick-action chips come from [`data/chat-training.json`](./data/chat-training.json). To train more: add a chip there, add a matcher + reply in `chat-guide.ts`.

**Typos + Tanglish:** [`data/chat-vocabulary.json`](./data/chat-vocabulary.json) + [`src/lib/text-normalize.ts`](./src/lib/text-normalize.ts) fix misspellings (`saloon` → salon, `helpp` → help) and map Tanglish (`vanakkam`, `ella service list pannu`, `kadai`). Add aliases there to train more without touching AI.

**Few-shots:** [`data/chat-fewshots.json`](./data/chat-fewshots.json) teaches classify tone (wired into `/api/analyze`).

**Niche feedback:** after analyze, chat asks “Was this niche right?” — answers save to `localStorage` (`nemora-niche-feedback-v1`) via [`src/lib/niche-feedback.ts`](./src/lib/niche-feedback.ts) for keyword training.

**Continuous chat:** message history is append-only and saved in `localStorage` (`nemora-chat-history-v1`). “Change service” / start over never deletes previous messages.

**New niches:** bakery, yoga, logistics, temple, PG (plus cafe/salon/clinic/shop/gym/education/realestate).

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
| `/api/analyze`   | NVIDIA (or local) service → common needs     |

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

1. **Chat** — type the business → AI analyzes niche & common needs → Website / App → confirm requirements
2. **Package** — best-fit Basic / Standard / Premium from those tags
3. **PDF** — enter client name + mobile, then Download PDF / Save
