# DownStock

Push sold-out products to the bottom of your Shopify collections, automatically —
and restore them when they're back in stock.

$1.99/month, 14-day free trial. One plan, no free tier, no product limits.

## Status: Phase 1 (Foundation) — in progress

Built on the same stack as [CODsafe](../cod-whatsapp-verifier): React Router v7 +
`@shopify/shopify-app-react-router`, Prisma + SQLite, single Node process
(no separate worker — a `setInterval` job poller inside `server.js`), deployed
to Namecheap shared hosting.

## What's implemented

- **Sorting engine** (`app/sorting.server.js`) — availability detection, stable
  two-group partition (available first / sold-out last, each group's relative
  order preserved), minimal-diff move computation, anchor-based restore.
  Fully unit tested: `npm test`.
- **Job queue** (`app/jobs.server.js`, `app/cron.server.js`) — durable Job table,
  dedupe/coalescing, exponential backoff retry, polled every 30s from `server.js`.
- **Webhooks** — inventory/product/collection change handlers (thin: verify +
  dedupe + enqueue only, all real work happens in the poller), `app/uninstalled`
  cleanup, and the three mandatory GDPR compliance topics.
- **Billing** — single-plan `appSubscriptionCreate`/`appSubscriptionCancel` flow,
  14-day trial, matching CODsafe's proven (already-submitted) pattern.
- **Dashboard** (`app/routes/app._index.jsx`) — compatibility scan, per-collection
  enable/disable with immediate initial scan, activity feed.

## What's NOT done yet (see the roadmap in project memory)

- Edge-case hardening pass (large-collection chunked moves + resumable jobs,
  rate-limit backoff on 429s)
- App Store submission assets (screenshots, listing copy)
- A real Partner Dashboard app (`client_id`) and the `downstock.matrixinnsolutions.com`
  subdomain/hosting — both need action outside this codebase before `shopify app dev`
  or a production deploy will work.

## Local setup

```bash
npm install
cp .env.example .env   # fill in SHOPIFY_API_KEY / SHOPIFY_API_SECRET after creating the Partner app
npm run setup           # prisma generate + migrate
npm run dev              # shopify app dev
```

## Tests

```bash
npm test
```
