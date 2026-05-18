import { CALCULATION_RULES, LARGE_INVOICE_AMOUNT } from "@/lib/constants";
import { demoCompany } from "@/lib/demoData";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type AppSettings = {
  watchBandPercent: number;
  warningBandPercent: number;
  largeInvoiceThreshold: number;
  requireShipToForThreshold: boolean;
  allowNegativeInvoices: boolean;
  allowZeroInvoices: boolean;
  measurementPeriod: string;
  fiscalYearStartMonth: number;
  reviewedExportRequiresShipTo: boolean;
  reviewedExportRequiresCategory: boolean;
  updatedAt: string | null;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  watchBandPercent: 75,
  warningBandPercent: 90,
  largeInvoiceThreshold: LARGE_INVOICE_AMOUNT,
  requireShipToForThreshold: CALCULATION_RULES.REQUIRE_SHIP_TO_FOR_THRESHOLD,
  allowNegativeInvoices: CALCULATION_RULES.ALLOW_NEGATIVE_INVOICES,
  allowZeroInvoices: CALCULATION_RULES.ALLOW_ZERO_DOLLAR_INVOICES,
  measurementPeriod: CALCULATION_RULES.MEASUREMENT_PERIOD,
  fiscalYearStartMonth: CALCULATION_RULES.FISCAL_YEAR_START_MONTH,
  reviewedExportRequiresShipTo: CALCULATION_RULES.EXPORT_REQUIRES_SHIP_TO,
  reviewedExportRequiresCategory: CALCULATION_RULES.EXPORT_REQUIRES_CATEGORY,
  updatedAt: null,
};

type Row = {
  watch_band_percent?: number | string | null;
  warning_band_percent?: number | string | null;
  large_invoice_threshold?: number | string | null;
  require_ship_to_for_threshold?: boolean | null;
  allow_negative_invoices?: boolean | null;
  allow_zero_invoices?: boolean | null;
  measurement_period?: string | null;
  fiscal_year_start_month?: number | string | null;
  reviewed_export_requires_ship_to?: boolean | null;
  reviewed_export_requires_category?: boolean | null;
  updated_at?: string | null;
};

function mapRow(row: Row): AppSettings {
  return {
    watchBandPercent: numberOr(row.watch_band_percent, DEFAULT_APP_SETTINGS.watchBandPercent),
    warningBandPercent: numberOr(row.warning_band_percent, DEFAULT_APP_SETTINGS.warningBandPercent),
    largeInvoiceThreshold: numberOr(row.large_invoice_threshold, DEFAULT_APP_SETTINGS.largeInvoiceThreshold),
    requireShipToForThreshold: boolOr(row.require_ship_to_for_threshold, DEFAULT_APP_SETTINGS.requireShipToForThreshold),
    allowNegativeInvoices: boolOr(row.allow_negative_invoices, DEFAULT_APP_SETTINGS.allowNegativeInvoices),
    allowZeroInvoices: boolOr(row.allow_zero_invoices, DEFAULT_APP_SETTINGS.allowZeroInvoices),
    measurementPeriod: typeof row.measurement_period === "string" ? row.measurement_period : DEFAULT_APP_SETTINGS.measurementPeriod,
    fiscalYearStartMonth: numberOr(row.fiscal_year_start_month, DEFAULT_APP_SETTINGS.fiscalYearStartMonth),
    reviewedExportRequiresShipTo: boolOr(row.reviewed_export_requires_ship_to, DEFAULT_APP_SETTINGS.reviewedExportRequiresShipTo),
    reviewedExportRequiresCategory: boolOr(row.reviewed_export_requires_category, DEFAULT_APP_SETTINGS.reviewedExportRequiresCategory),
    updatedAt: row.updated_at ?? null,
  };
}

function numberOr(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolOr(value: boolean | null | undefined, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

let cached: { settings: AppSettings; expiresAt: number } | null = null;
const CACHE_MS = 5000;

export function clearAppSettingsCache() {
  cached = null;
}

export async function getAppSettings(): Promise<AppSettings> {
  if (cached && cached.expiresAt > Date.now()) return cached.settings;
  if (!isSupabaseConfigured()) return DEFAULT_APP_SETTINGS;
  const supabase = createSupabaseClient();
  if (!supabase) return DEFAULT_APP_SETTINGS;

  const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id;
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select(
        "watch_band_percent,warning_band_percent,large_invoice_threshold,require_ship_to_for_threshold,allow_negative_invoices,allow_zero_invoices,measurement_period,fiscal_year_start_month,reviewed_export_requires_ship_to,reviewed_export_requires_category,updated_at"
      )
      .eq("company_id", companyId)
      .maybeSingle();
    if (error || !data) {
      cached = { settings: DEFAULT_APP_SETTINGS, expiresAt: Date.now() + CACHE_MS };
      return DEFAULT_APP_SETTINGS;
    }
    const settings = mapRow(data as Row);
    cached = { settings, expiresAt: Date.now() + CACHE_MS };
    return settings;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export type AppSettingsPatch = Partial<{
  watchBandPercent: number;
  warningBandPercent: number;
  largeInvoiceThreshold: number;
  requireShipToForThreshold: boolean;
  allowNegativeInvoices: boolean;
  allowZeroInvoices: boolean;
  measurementPeriod: string;
  fiscalYearStartMonth: number;
  reviewedExportRequiresShipTo: boolean;
  reviewedExportRequiresCategory: boolean;
}>;

function patchToRow(patch: AppSettingsPatch): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.watchBandPercent === "number") row.watch_band_percent = patch.watchBandPercent;
  if (typeof patch.warningBandPercent === "number") row.warning_band_percent = patch.warningBandPercent;
  if (typeof patch.largeInvoiceThreshold === "number") row.large_invoice_threshold = patch.largeInvoiceThreshold;
  if (typeof patch.requireShipToForThreshold === "boolean") row.require_ship_to_for_threshold = patch.requireShipToForThreshold;
  if (typeof patch.allowNegativeInvoices === "boolean") row.allow_negative_invoices = patch.allowNegativeInvoices;
  if (typeof patch.allowZeroInvoices === "boolean") row.allow_zero_invoices = patch.allowZeroInvoices;
  if (typeof patch.measurementPeriod === "string") row.measurement_period = patch.measurementPeriod;
  if (typeof patch.fiscalYearStartMonth === "number") row.fiscal_year_start_month = patch.fiscalYearStartMonth;
  if (typeof patch.reviewedExportRequiresShipTo === "boolean") row.reviewed_export_requires_ship_to = patch.reviewedExportRequiresShipTo;
  if (typeof patch.reviewedExportRequiresCategory === "boolean") row.reviewed_export_requires_category = patch.reviewedExportRequiresCategory;
  return row;
}

export async function updateAppSettings(patch: AppSettingsPatch) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, status: 503, message: "Supabase is not configured. Settings were not saved." };
  }
  const supabase = createSupabaseClient();
  if (!supabase) {
    return { ok: false as const, status: 503, message: "Supabase client is unavailable. Settings were not saved." };
  }

  const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id;
  const update = patchToRow(patch);

  const { data: previous } = await supabase
    .from("app_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  let upsertError: { message?: string; code?: string } | null = null;

  if (!previous) {
    const insertPayload = { company_id: companyId, ...update };
    const { error } = await supabase.from("app_settings").insert(insertPayload);
    upsertError = error;
  } else {
    const { error } = await supabase.from("app_settings").update(update).eq("company_id", companyId);
    upsertError = error;
  }

  if (upsertError) {
    const missingTable = upsertError.message?.includes("relation \"public.app_settings\"") || upsertError.code === "42P01";
    return {
      ok: false as const,
      status: missingTable ? 412 : 500,
      message: missingTable
        ? "app_settings table is missing. Run supabase/nexuswatch_app_settings.sql in the Supabase SQL editor."
        : upsertError.message ?? "Settings could not be saved.",
    };
  }

  await supabase.from("audit_logs").insert({
    company_id: companyId,
    entity_type: "app_settings",
    action: "settings_updated",
    actor: "Sara Demo User",
    message: "App settings updated.",
    metadata: { previous: previous ?? null, next: update, source: "settings_page" },
  });

  clearAppSettingsCache();
  const { data: saved } = await supabase
    .from("app_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  return {
    ok: true as const,
    status: 200,
    message: "App settings saved to Supabase.",
    settings: saved ? mapRow(saved as Row) : DEFAULT_APP_SETTINGS,
  };
}
