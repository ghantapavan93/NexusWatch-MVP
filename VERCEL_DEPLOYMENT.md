# NexusWatch Vercel Deployment Checklist

NexusWatch deploys as a Next.js app on Vercel with Supabase for Postgres and PDF storage.

## Vercel Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_or_anon_key
NEXT_PUBLIC_DEMO_COMPANY_ID=00000000-0000-0000-0000-000000000001
```

Use the Supabase publishable/anon key only. Do not paste the secret/service-role key into Vercel for this MVP.

## Supabase Must Already Have

- Tables from the NexusWatch SQL migrations.
- `invoice-pdfs` storage bucket.
- Demo company id `00000000-0000-0000-0000-000000000001`.
- RLS policies from `supabase/nexuswatch_write_policies.sql` and `supabase/nexuswatch_pdf_storage.sql`.

## Vercel Settings

- Framework preset: Next.js
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: leave default
- Node runtime: Vercel default Node runtime is fine

## Post-Deploy Smoke Test

1. Open `/api/health`.
2. Confirm `ok` is `true`.
3. Open `/dashboard`.
4. Open `/upload`.
5. Save a manual draft with a fresh invoice number.
6. Send that draft to Review Queue.
7. Upload a text PDF and confirm fields or warnings appear.
8. Upload a scanned PDF and confirm OCR remains review-based.
9. Open the invoice detail page and confirm Source Document works.
10. Open `/exports`, choose Single Invoice, and generate/download CSV.

## Guardrails

NexusWatch is decision support only. PDF/OCR extraction is a review assistant and never finalizes tax treatment or filing obligations.
