-- NexusWatch threshold and accounting review workflow fields.
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run.

alter table invoices
add column if not exists review_notes text,
add column if not exists accounting_review_reason text,
add column if not exists accounting_review_completed_at timestamptz;
