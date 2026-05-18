-- NexusWatch app settings (per-company runtime configuration)
-- Drives watch/warning bands, large-invoice threshold, ship-to enforcement,
-- and other knobs that previously lived in lib/constants.ts.

create table if not exists public.app_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  watch_band_percent numeric not null default 75 check (watch_band_percent between 0 and 100),
  warning_band_percent numeric not null default 90 check (warning_band_percent between 0 and 100),
  large_invoice_threshold numeric not null default 50000 check (large_invoice_threshold >= 0),
  require_ship_to_for_threshold boolean not null default true,
  allow_negative_invoices boolean not null default true,
  allow_zero_invoices boolean not null default true,
  measurement_period text not null default 'calendar_year',
  fiscal_year_start_month integer not null default 1 check (fiscal_year_start_month between 1 and 12),
  reviewed_export_requires_ship_to boolean not null default true,
  reviewed_export_requires_category boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Seed default row for the demo company if not present
insert into public.app_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

-- Permissive RLS for the demo workspace (matches existing nexus_rules policy)
alter table public.app_settings enable row level security;
drop policy if exists "app_settings_demo_read" on public.app_settings;
create policy "app_settings_demo_read"
  on public.app_settings
  for select
  using (true);

drop policy if exists "app_settings_demo_write" on public.app_settings;
create policy "app_settings_demo_write"
  on public.app_settings
  for all
  using (true)
  with check (true);
