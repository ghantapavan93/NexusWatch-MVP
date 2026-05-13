# NexusWatch MVP Handoff

Status as of now:

- Supabase project is connected through `.env.local`.
- Supabase seed completed successfully:
  - companies: 1
  - nexus_rules: 5
  - invoices: 24
  - invoice_line_items: 33
  - invoice_flags: 13
- App API verified reading from Supabase:
  - `/api/invoices` source: `supabase`
  - invoice count: `24`
- Main demo path verified with HTTP 200:
  - `/dashboard`
  - `/invoices`
  - `/invoices/inv-1048`
  - `/review`
  - `/exports`

Current app behavior:

- Main server pages and API routes read from Supabase with local demo fallback.
- Manual upload save draft and send to review call `/api/invoices` and write invoices, line items, flags, and audit logs to Supabase.
- PDF upload calls `/api/uploads/pdf`, stores files in Supabase Storage bucket `invoice-pdfs`, and saves the PDF metadata into invoice `raw_text` when the manual invoice is saved.
- Invoice detail actions call `/api/invoices/[id]/status` and write status updates to Supabase.
- Export generation calls `/api/exports` and writes export history to Supabase.
- Export preview still uses the client-side demo preview for fast UX, while generated CSV/export history comes from the API.
- Workflow writes now store both operational `status` and `review_status`.
- Audit logs now include `actor` and structured `metadata`.
- Export history now includes `file_name`.

Next best phase:

1. Run `supabase/nexuswatch_pdf_storage.sql` in Supabase SQL Editor before testing PDF upload.
2. Run `supabase/nexuswatch_line_amount_trigger.sql` for line item compatibility.
3. Run `supabase/nexuswatch_status_audit_export_fields.sql` for workflow status, audit metadata, and export file names.
4. QA PDF upload, manual save draft, mark reviewed, send to accounting review, and export history.
5. Decide whether to keep permissive demo storage/write policies or move to authenticated company-scoped policies before production.

Local dev:

```bash
npm install
npm run dev
```

Open:

```txt
http://127.0.0.1:3000/dashboard
```

Decision-support framing remains important:

- No legal/tax claims.
- Use configured threshold language.
- Recommend accounting review for final determination.
