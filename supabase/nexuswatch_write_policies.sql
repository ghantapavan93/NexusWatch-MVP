-- NexusWatch MVP demo write policies.
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- These policies are intentionally permissive for the demo prototype.
-- Before production, replace them with authenticated company-scoped policies.

alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table invoice_flags enable row level security;
alter table exports enable row level security;
alter table audit_logs enable row level security;

drop policy if exists nexuswatch_demo_insert on invoices;
drop policy if exists nexuswatch_demo_update on invoices;
drop policy if exists nexuswatch_demo_insert on invoice_line_items;
drop policy if exists nexuswatch_demo_insert on invoice_flags;
drop policy if exists nexuswatch_demo_insert on exports;
drop policy if exists nexuswatch_demo_insert on audit_logs;

create policy nexuswatch_demo_insert on invoices
for insert to anon, authenticated
with check (true);

create policy nexuswatch_demo_update on invoices
for update to anon, authenticated
using (true)
with check (true);

create policy nexuswatch_demo_insert on invoice_line_items
for insert to anon, authenticated
with check (true);

create policy nexuswatch_demo_insert on invoice_flags
for insert to anon, authenticated
with check (true);

create policy nexuswatch_demo_insert on exports
for insert to anon, authenticated
with check (true);

create policy nexuswatch_demo_insert on audit_logs
for insert to anon, authenticated
with check (true);
