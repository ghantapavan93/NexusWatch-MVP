# NexusWatch MVP

Sales tax nexus visibility from invoice activity.

NexusWatch is a decision-support prototype for reviewing invoice activity, monitoring configured state thresholds, routing unclear invoices to review, and exporting clean transaction lists for accounting review.

## What It Does

- Manual invoice entry
- Paste invoice text and review detected fields
- Upload PDF invoices to Supabase Storage
- Review text-based PDF extraction and OCR-assisted scanned PDF fields
- Track state threshold exposure with 75% and 90% warning bands
- Route invoices to Review Queue and Accounting Review
- Export reviewed transactions, review queue items, threshold summaries, rules, or a single invoice

## Guardrails

NexusWatch is not tax automation, legal advice, or an official filing tool. OCR and extracted fields are review assistants only. Final tax treatment should be reviewed with accounting.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres and Storage
- Recharts
- Zod
- Tesseract.js OCR for scanned PDF review support

## Local Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add Supabase values.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Deployment

Deploy to Vercel and use Supabase for database and PDF storage. See `VERCEL_DEPLOYMENT.md`.
