-- NexusWatch intake review fields.
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- These fields store detected invoice text as review support only.

alter table invoice_documents
add column if not exists raw_text text,
add column if not exists field_confidence jsonb not null default '{}'::jsonb,
add column if not exists validation_warnings jsonb not null default '[]'::jsonb,
add column if not exists extraction_method text,
add column if not exists ocr_confidence numeric(6,2),
add column if not exists detected_invoice_number text,
add column if not exists detected_total_amount numeric(14,2),
add column if not exists detected_ship_to_state text,
add column if not exists detected_bill_to_state text;

alter table invoices
add column if not exists raw_text text,
add column if not exists extracted_fields jsonb not null default '{}'::jsonb,
add column if not exists unknown_fields jsonb not null default '{}'::jsonb,
add column if not exists extraction_confidence numeric(5,2),
add column if not exists review_notes text;
