-- NexusWatch MVP Supabase seed and demo read policies.
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run.

create extension if not exists "pgcrypto";

alter table companies add column if not exists updated_at timestamptz default now();

alter table nexus_rules add column if not exists measurement_period text not null default 'calendar_year';
alter table nexus_rules add column if not exists needs_review boolean default false;

alter table invoices add column if not exists excluded_amount numeric(12,2) not null default 0;

alter table invoice_line_items add column if not exists excluded_amount numeric(12,2) not null default 0;

alter table companies enable row level security;
alter table nexus_rules enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table invoice_flags enable row level security;
alter table exports enable row level security;
alter table audit_logs enable row level security;

drop policy if exists nexuswatch_demo_select on companies;
drop policy if exists nexuswatch_demo_select on nexus_rules;
drop policy if exists nexuswatch_demo_select on invoices;
drop policy if exists nexuswatch_demo_select on invoice_line_items;
drop policy if exists nexuswatch_demo_select on invoice_flags;
drop policy if exists nexuswatch_demo_select on exports;
drop policy if exists nexuswatch_demo_select on audit_logs;

create policy nexuswatch_demo_select on companies for select to anon, authenticated using (true);
create policy nexuswatch_demo_select on nexus_rules for select to anon, authenticated using (true);
create policy nexuswatch_demo_select on invoices for select to anon, authenticated using (true);
create policy nexuswatch_demo_select on invoice_line_items for select to anon, authenticated using (true);
create policy nexuswatch_demo_select on invoice_flags for select to anon, authenticated using (true);
create policy nexuswatch_demo_select on exports for select to anon, authenticated using (true);
create policy nexuswatch_demo_select on audit_logs for select to anon, authenticated using (true);

delete from companies where id = '00000000-0000-0000-0000-000000000001';

insert into companies (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Xemelgo Demo Operations');

insert into nexus_rules (
  company_id, state_code, state_name, threshold_amount, measurement_period,
  saas_taxable, hardware_taxable, services_taxable, notes, source_url, last_reviewed, needs_review
)
values
('00000000-0000-0000-0000-000000000001', 'TX', 'Texas', 500000, 'calendar_year', true, true, false, 'Demo rule: SaaS and hardware counted, services excluded pending accounting review.', 'https://comptroller.texas.gov/', '2026-01-08', false),
('00000000-0000-0000-0000-000000000001', 'CA', 'California', 600000, 'calendar_year', false, true, false, 'Demo rule: SaaS and professional services excluded; hardware counted.', 'https://www.cdtfa.ca.gov/', '2026-01-08', false),
('00000000-0000-0000-0000-000000000001', 'IL', 'Illinois', 500000, 'calendar_year', true, true, true, 'Demo rule: all configured categories counted.', 'https://tax.illinois.gov/', '2026-01-09', false),
('00000000-0000-0000-0000-000000000001', 'NY', 'New York', 500000, 'calendar_year', true, true, true, 'Demo rule: category completeness is emphasized for review queue scenarios.', 'https://www.tax.ny.gov/', '2026-01-09', true),
('00000000-0000-0000-0000-000000000001', 'WA', 'Washington', 500000, 'calendar_year', false, true, false, 'Demo rule: hardware counted; SaaS and services excluded.', 'https://dor.wa.gov/', '2026-01-10', false);

insert into invoices (
  id, company_id, invoice_number, invoice_date, due_date, customer_name,
  ship_to_state, bill_to_state, total_amount, taxable_amount, excluded_amount,
  source_type, review_status, risk_status, notes
)
values
('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000001', 'INV-1001', '2026-01-12', '2026-06-15', 'Lone Star Foods', 'TX', 'TX', 98000, 98000, 0, 'manual', 'approved', 'safe', null),
('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000001', 'INV-1006', '2026-02-20', '2026-06-15', 'Austin Cold Storage', 'TX', 'TX', 124000, 124000, 0, 'manual', 'approved', 'watch', null),
('00000000-0000-0000-0000-000000001012', '00000000-0000-0000-0000-000000000001', 'INV-1012', '2026-03-18', '2026-06-15', 'Fort Worth Manufacturing', 'TX', 'TX', 88000, 88000, 0, 'manual', 'approved', 'watch', null),
('00000000-0000-0000-0000-000000001027', '00000000-0000-0000-0000-000000000001', 'INV-1027', '2026-04-06', '2026-06-15', 'Gulf Coast Robotics', 'TX', 'LA', 132000, 132000, 0, 'manual', 'approved', 'watch', null),
('00000000-0000-0000-0000-000000001048', '00000000-0000-0000-0000-000000000001', 'INV-1048', '2026-05-08', '2026-06-15', 'Dallas Fulfillment Group', 'TX', 'TX', 62000, 52000, 10000, 'manual', 'needs_review', 'warning', null),
('00000000-0000-0000-0000-000000001015', '00000000-0000-0000-0000-000000000001', 'INV-1015', '2026-03-26', '2026-06-15', 'Sacramento Biologics', 'CA', 'CA', 175000, 45000, 130000, 'manual', 'approved', 'safe', null),
('00000000-0000-0000-0000-000000001021', '00000000-0000-0000-0000-000000000001', 'INV-1021', '2026-04-16', '2026-06-15', 'Bay Area Fresh', 'CA', 'CA', 92000, 22000, 70000, 'manual', 'approved', 'safe', null),
('00000000-0000-0000-0000-000000001034', '00000000-0000-0000-0000-000000000001', 'INV-1034', '2026-04-28', '2026-06-15', 'Anaheim Assembly', 'CA', 'CA', 118000, 38000, 80000, 'manual', 'approved', 'safe', null),
('00000000-0000-0000-0000-000000001041', '00000000-0000-0000-0000-000000000001', 'INV-1041', '2026-05-02', '2026-06-15', 'Fresno Cold Chain', 'CA', 'CA', -9000, -9000, 0, 'manual', 'approved', 'safe', null),
('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000001', 'INV-1003', '2026-01-15', '2026-06-15', 'Chicago Logistics', 'IL', 'IL', 115000, 115000, 0, 'manual', 'approved', 'warning', null),
('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000001', 'INV-1009', '2026-02-28', '2026-06-15', 'Evanston Packaging', 'IL', 'IL', 135000, 135000, 0, 'manual', 'approved', 'warning', null),
('00000000-0000-0000-0000-000000001019', '00000000-0000-0000-0000-000000000001', 'INV-1019', '2026-04-12', '2026-06-15', 'Peoria Food Systems', 'IL', 'IL', 128000, 128000, 0, 'manual', 'approved', 'warning', null),
('00000000-0000-0000-0000-000000001030', '00000000-0000-0000-0000-000000000001', 'INV-1030', '2026-04-21', '2026-06-15', 'Naperville Supply', 'IL', 'IL', 102000, 102000, 0, 'manual', 'approved', 'warning', null),
('00000000-0000-0000-0000-000000001049', '00000000-0000-0000-0000-000000000001', 'INV-1049', '2026-05-09', '2026-06-15', 'Rockford Kitchens', 'IL', 'IL', 26000, 26000, 0, 'manual', 'needs_review', 'crossed', null),
('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000001', 'INV-1007', '2026-02-22', '2026-06-15', 'Brooklyn Provisions', 'NY', 'NY', 64000, 64000, 0, 'manual', 'approved', 'safe', null),
('00000000-0000-0000-0000-000000001024', '00000000-0000-0000-0000-000000000001', 'INV-1024', '2026-04-18', '2026-06-15', 'Queens Distribution', 'NY', 'NJ', 71000, 71000, 0, 'manual', 'needs_review', 'needs_review', null),
('00000000-0000-0000-0000-000000001038', '00000000-0000-0000-0000-000000000001', 'INV-1038', '2026-04-30', '2026-06-15', 'Buffalo Medical Supply', 'NY', 'NY', 0, 0, 0, 'manual', 'draft', 'safe', null),
('00000000-0000-0000-0000-000000001043', '00000000-0000-0000-0000-000000000001', 'INV-1043', '2026-05-04', '2026-06-15', 'Manhattan Food Labs', 'NY', 'NY', 58000, 58000, 0, 'manual', 'needs_review', 'needs_review', null),
('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000001', 'INV-1004', '2026-01-18', '2026-06-15', 'Seattle Farms', 'WA', 'WA', 87000, 27000, 60000, 'manual', 'approved', 'safe', null),
('00000000-0000-0000-0000-000000001017', '00000000-0000-0000-0000-000000000001', 'INV-1017', '2026-04-04', '2026-06-15', 'Spokane Packaging', 'WA', 'WA', 76000, 26000, 50000, 'manual', 'approved', 'safe', null),
('00000000-0000-0000-0000-000000001035', '00000000-0000-0000-0000-000000000001', 'INV-1035', '2026-04-29', '2026-06-15', 'Tacoma Wholesale', 'WA', 'WA', 38000, 0, 38000, 'manual', 'approved', 'safe', null),
('00000000-0000-0000-0000-000000001028', '00000000-0000-0000-0000-000000000001', 'INV-1028', '2026-04-20', '2026-06-15', 'Portland Specialty Foods', null, 'OR', 44000, 0, 44000, 'manual', 'needs_review', 'needs_review', 'Skipped from threshold totals until ship-to state is added.'),
('00000000-0000-0000-0000-000000001033', '00000000-0000-0000-0000-000000000001', 'INV-1033', '2026-04-26', '2026-06-15', 'Denver Cold Chain', 'CO', 'CO', 54000, 0, 54000, 'manual', 'needs_review', 'needs_review', null),
('00000000-0000-0000-0000-000000001039', '00000000-0000-0000-0000-000000000001', 'INV-1039', '2026-05-01', '2026-06-15', 'Phoenix Fresh', 'AZ', 'AZ', 18000, 0, 18000, 'manual', 'needs_review', 'needs_review', 'Potential duplicate import.');

insert into invoice_line_items (invoice_id, description, category, amount, taxable_amount, excluded_amount, needs_review)
values
((select id from invoices where invoice_number = 'INV-1001'), 'Connected operations platform annual subscription', 'saas', 98000, 98000, 0, false),
((select id from invoices where invoice_number = 'INV-1006'), 'Workflow software license', 'saas', 84000, 84000, 0, false),
((select id from invoices where invoice_number = 'INV-1006'), 'Gateway hardware bundle', 'hardware', 40000, 40000, 0, false),
((select id from invoices where invoice_number = 'INV-1012'), 'Plant visibility modules', 'hardware', 88000, 88000, 0, false),
((select id from invoices where invoice_number = 'INV-1027'), 'Nexus software suite', 'saas', 92000, 92000, 0, false),
((select id from invoices where invoice_number = 'INV-1027'), 'Deployment hardware', 'hardware', 40000, 40000, 0, false),
((select id from invoices where invoice_number = 'INV-1048'), 'SaaS expansion seats', 'saas', 32000, 32000, 0, false),
((select id from invoices where invoice_number = 'INV-1048'), 'Warehouse scanner hardware', 'hardware', 20000, 20000, 0, false),
((select id from invoices where invoice_number = 'INV-1048'), 'Implementation advisory', 'services', 10000, 0, 10000, false),
((select id from invoices where invoice_number = 'INV-1015'), 'Operations SaaS platform', 'saas', 130000, 0, 130000, false),
((select id from invoices where invoice_number = 'INV-1015'), 'Device kits', 'hardware', 45000, 45000, 0, false),
((select id from invoices where invoice_number = 'INV-1021'), 'Subscription renewal', 'saas', 70000, 0, 70000, false),
((select id from invoices where invoice_number = 'INV-1021'), 'Tablet stands', 'hardware', 22000, 22000, 0, false),
((select id from invoices where invoice_number = 'INV-1034'), 'License expansion', 'saas', 80000, 0, 80000, false),
((select id from invoices where invoice_number = 'INV-1034'), 'Sensor hardware', 'hardware', 38000, 38000, 0, false),
((select id from invoices where invoice_number = 'INV-1041'), 'Credit memo for returned hardware', 'hardware', -9000, -9000, 0, false),
((select id from invoices where invoice_number = 'INV-1003'), 'Platform subscription', 'saas', 115000, 115000, 0, false),
((select id from invoices where invoice_number = 'INV-1009'), 'Hardware and connected devices', 'hardware', 135000, 135000, 0, false),
((select id from invoices where invoice_number = 'INV-1019'), 'Professional services rollout', 'services', 128000, 128000, 0, false),
((select id from invoices where invoice_number = 'INV-1030'), 'Annual software and support', 'saas', 102000, 102000, 0, false),
((select id from invoices where invoice_number = 'INV-1049'), 'Hardware expansion pack', 'hardware', 26000, 26000, 0, false),
((select id from invoices where invoice_number = 'INV-1007'), 'Monitoring platform', 'saas', 64000, 64000, 0, false),
((select id from invoices where invoice_number = 'INV-1024'), 'Unclassified invoice bundle', 'other', 71000, 71000, 0, true),
((select id from invoices where invoice_number = 'INV-1038'), 'Draft placeholder line', 'services', 0, 0, 0, false),
((select id from invoices where invoice_number = 'INV-1043'), 'Invoice text requires category confirmation', 'other', 58000, 58000, 0, true),
((select id from invoices where invoice_number = 'INV-1004'), 'SaaS access', 'saas', 60000, 0, 60000, false),
((select id from invoices where invoice_number = 'INV-1004'), 'Edge devices', 'hardware', 27000, 27000, 0, false),
((select id from invoices where invoice_number = 'INV-1017'), 'Cloud subscription', 'saas', 50000, 0, 50000, false),
((select id from invoices where invoice_number = 'INV-1017'), 'Hardware replenishment', 'hardware', 26000, 26000, 0, false),
((select id from invoices where invoice_number = 'INV-1035'), 'Professional services workshop', 'services', 38000, 0, 38000, false),
((select id from invoices where invoice_number = 'INV-1028'), 'Invoice missing ship-to state', 'saas', 44000, 0, 44000, false),
((select id from invoices where invoice_number = 'INV-1033'), 'Large invoice pending state rule configuration', 'saas', 54000, 0, 54000, false),
((select id from invoices where invoice_number = 'INV-1039'), 'Potential duplicate import', 'hardware', 18000, 0, 18000, false);

insert into invoice_flags (invoice_id, state_code, flag_type, severity, message)
values
((select id from invoices where invoice_number = 'INV-1027'), 'TX', 'ship_bill_mismatch', 'info', 'Ship-to and bill-to states differ; review state assignment.'),
((select id from invoices where invoice_number = 'INV-1048'), 'TX', 'may_cross_threshold', 'high', 'May push Texas close to the configured threshold.'),
((select id from invoices where invoice_number = 'INV-1048'), 'TX', 'large_invoice', 'high', 'Large invoice recommended for accounting review.'),
((select id from invoices where invoice_number = 'INV-1049'), 'IL', 'crossed_threshold', 'high', 'Illinois is over the configured demo threshold after this invoice.'),
((select id from invoices where invoice_number = 'INV-1024'), 'NY', 'missing_category', 'high', 'Line item category needs review before export.'),
((select id from invoices where invoice_number = 'INV-1024'), 'NY', 'category_review', 'high', 'Category treatment should be confirmed with accounting.'),
((select id from invoices where invoice_number = 'INV-1024'), 'NY', 'ship_bill_mismatch', 'info', 'Ship-to and bill-to states differ; review state assignment.'),
((select id from invoices where invoice_number = 'INV-1043'), 'NY', 'missing_category', 'high', 'Line item category needs review before export.'),
((select id from invoices where invoice_number = 'INV-1043'), 'NY', 'category_review', 'high', 'Category treatment should be confirmed with accounting.'),
((select id from invoices where invoice_number = 'INV-1043'), 'NY', 'large_invoice', 'high', 'Large invoice recommended for accounting review.'),
((select id from invoices where invoice_number = 'INV-1028'), null, 'missing_ship_to', 'high', 'Missing ship-to state; skipped from threshold calculations and blocked from state export.'),
((select id from invoices where invoice_number = 'INV-1033'), 'CO', 'large_invoice', 'high', 'Large invoice pending state rule configuration.'),
((select id from invoices where invoice_number = 'INV-1039'), 'AZ', 'duplicate_invoice', 'high', 'Potential duplicate invoice number detected.');

select
  (select count(*) from companies) as companies,
  (select count(*) from nexus_rules) as nexus_rules,
  (select count(*) from invoices) as invoices,
  (select count(*) from invoice_line_items) as invoice_line_items,
  (select count(*) from invoice_flags) as invoice_flags;
