-- NexusWatch MVP PDF storage setup.
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- This creates a public demo bucket so uploaded PDFs can be opened from the prototype.
-- Before production, switch to private buckets + signed URLs + authenticated company-scoped policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoice-pdfs', 'invoice-pdfs', true, 10485760, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists nexuswatch_demo_pdf_select on storage.objects;
drop policy if exists nexuswatch_demo_pdf_insert on storage.objects;

create policy nexuswatch_demo_pdf_select on storage.objects
for select to anon, authenticated
using (bucket_id = 'invoice-pdfs');

create policy nexuswatch_demo_pdf_insert on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'invoice-pdfs');
