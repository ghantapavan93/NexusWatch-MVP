-- NexusWatch PDF document metadata link setup.
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Keeps PDF upload metadata connected to the invoice record.

alter table invoices
add column if not exists document_id uuid,
add column if not exists pdf_file_name text,
add column if not exists pdf_storage_path text,
add column if not exists pdf_public_url text,
add column if not exists pdf_uploaded_at timestamptz,
add column if not exists extraction_status text;

alter table invoice_documents enable row level security;

drop policy if exists nexuswatch_demo_select on invoice_documents;
drop policy if exists nexuswatch_demo_insert on invoice_documents;
drop policy if exists nexuswatch_demo_update on invoice_documents;

create policy nexuswatch_demo_select on invoice_documents
for select to anon, authenticated
using (true);

create policy nexuswatch_demo_insert on invoice_documents
for insert to anon, authenticated
with check (true);

create policy nexuswatch_demo_update on invoice_documents
for update to anon, authenticated
using (true)
with check (true);
