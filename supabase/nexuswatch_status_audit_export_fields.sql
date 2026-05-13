-- NexusWatch workflow status, audit metadata, and export filename fields.
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run.

alter table invoices
add column if not exists status text not null default 'draft';

update invoices
set status = case
  when review_status = 'approved' then 'reviewed'
  when review_status = 'exported' then 'exported'
  when review_status in ('needs_review', 'accounting_review') then 'open'
  else 'draft'
end
where status is null
   or status = ''
   or status = 'draft';

alter table audit_logs
add column if not exists actor text,
add column if not exists metadata jsonb not null default '{}'::jsonb;

update audit_logs
set actor = coalesce(actor, 'Sara Demo User'),
    metadata = coalesce(metadata, '{}'::jsonb)
where actor is null
   or metadata is null;

alter table exports
add column if not exists file_name text;

update exports
set file_name = coalesce(
  file_name,
  'nexuswatch_' || export_type || '_' || to_char(created_at, 'YYYY-MM-DD') || '.csv'
)
where file_name is null
   or file_name = '';
