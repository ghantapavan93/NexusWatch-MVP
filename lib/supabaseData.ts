import { cookies } from "next/headers";
import { demoCompany, demoInvoices, demoRules } from "@/lib/demoData";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Category, Company, ExportHistory, Invoice, InvoiceStatus, LineItem, NexusRule, OperationalStatus, ReviewFlag, ThresholdStatus } from "@/types";

type SupabaseRuleRow = {
  id: string;
  company_id: string;
  state_code: string;
  state_name: string;
  threshold_amount: number | string;
  saas_taxable: boolean;
  hardware_taxable: boolean;
  services_taxable: boolean;
  notes: string | null;
  source_url: string | null;
  last_reviewed: string | null;
};

type SupabaseLineItemRow = {
  id: string;
  description: string;
  category: Category;
  amount: number | string;
  taxable_amount: number | string;
  needs_review: boolean | null;
};

type SupabaseFlagRow = {
  flag_type: ReviewFlag;
};

type SupabaseInvoiceRow = {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  customer_name: string;
  ship_to_state: string | null;
  bill_to_state: string | null;
  total_amount: number | string;
  taxable_amount: number | string;
  source_type: Invoice["sourceType"];
  status?: OperationalStatus | null;
  review_status: InvoiceStatus;
  risk_status: ThresholdStatus | "needs_review";
  notes: string | null;
  raw_text: string | null;
  extracted_fields?: Record<string, unknown> | null;
  unknown_fields?: Record<string, unknown> | null;
  extraction_confidence?: number | string | null;
  review_notes?: string | null;
  accounting_review_reason?: string | null;
  accounting_review_completed_at?: string | null;
  document_id: string | null;
  pdf_file_name: string | null;
  pdf_storage_path: string | null;
  pdf_public_url: string | null;
  pdf_uploaded_at: string | null;
  extraction_status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  invoice_line_items: SupabaseLineItemRow[] | null;
  invoice_flags: SupabaseFlagRow[] | null;
};

type SupabaseDocumentRow = {
  invoice_id: string | null;
  detected_invoice_number?: string | null;
  detected_total_amount?: number | string | null;
  detected_ship_to_state?: string | null;
  detected_bill_to_state?: string | null;
  field_confidence?: Record<string, unknown> | null;
  validation_warnings?: string[] | null;
  extraction_method?: string | null;
  ocr_confidence?: number | string | null;
};

type SupabaseExportRow = {
  id: string;
  export_type: string;
  state_code: string | null;
  date_from: string | null;
  date_to: string | null;
  row_count: number | string | null;
  file_name?: string | null;
  created_at?: string | null;
};

export type NexusWatchData = {
  company: Company;
  rules: NexusRule[];
  invoices: Invoice[];
  exports: ExportHistory[];
  source: "supabase" | "local_demo_data";
};

export type NexusWatchDataMode = "demo" | "live";

export type RequestedDataScope = { mode: NexusWatchDataMode; liveInvoiceNumbers?: string[] };

export async function getRequestedDataScope(): Promise<RequestedDataScope> {
  const cookieStore = await cookies();
  const mode: NexusWatchDataMode = cookieStore.get("nexuswatch_data_mode")?.value === "demo" ? "demo" : "live";
  const raw = cookieStore.get("nexuswatch_live_invoice_numbers")?.value;
  const liveInvoiceNumbers = raw
    ? decodeURIComponent(raw)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  return { mode, liveInvoiceNumbers: mode === "live" ? liveInvoiceNumbers : undefined };
}

export async function getScopedNexusWatchData(): Promise<NexusWatchData & { scope: RequestedDataScope }> {
  const scope = await getRequestedDataScope();
  const data = await getNexusWatchData(scope);
  return { ...data, scope };
}

let cachedData: { data: NexusWatchData; expiresAt: number } | null = null;
const CACHE_MS = 5000;

export async function getNexusWatchData(
  options: { mode?: NexusWatchDataMode; liveInvoiceNumbers?: string[] } = {}
): Promise<NexusWatchData> {
  if (options.mode === "demo") return localData();
  if (cachedData && cachedData.expiresAt > Date.now()) return cachedData.data;
  if (!isSupabaseConfigured()) return localData();

  const supabase = createSupabaseClient();
  if (!supabase) return localData();

  try {
    const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id;
    const [
      { data: company, error: companyError },
      { data: rules, error: rulesError },
      { data: invoices, error: invoicesError },
      { data: exportsData },
    ] =
      await Promise.all([
        supabase.from("companies").select("id,name").eq("id", companyId).single(),
        supabase
          .from("nexus_rules")
          .select("id,company_id,state_code,state_name,threshold_amount,saas_taxable,hardware_taxable,services_taxable,notes,source_url,last_reviewed")
          .eq("company_id", companyId)
          .order("state_code"),
        supabase
          .from("invoices")
          .select("*, invoice_line_items(*), invoice_flags(flag_type)")
          .eq("company_id", companyId)
          .order("invoice_date", { ascending: false }),
        supabase
          .from("exports")
          .select("id,export_type,state_code,date_from,date_to,row_count,file_name,created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

    if (companyError || rulesError || invoicesError || !company || !rules || !invoices) return localData();

    const documentsByInvoiceId = await fetchInvoiceDocumentsByInvoiceId(
      supabase,
      companyId,
      (invoices as SupabaseInvoiceRow[]).map((invoice) => invoice.id)
    );

    const mappedInvoices = (invoices as SupabaseInvoiceRow[]).map((invoice) =>
      mapInvoice(invoice, documentsByInvoiceId.get(invoice.id))
    );
    const data: NexusWatchData = {
      company: { id: company.id, name: company.name },
      rules: (rules as SupabaseRuleRow[]).map(mapRule),
      invoices:
        options.mode === "live" && options.liveInvoiceNumbers
          ? filterLiveWorkspaceInvoices(mappedInvoices, options.liveInvoiceNumbers)
          : mappedInvoices,
      exports: ((exportsData ?? []) as SupabaseExportRow[]).map(mapExportHistory),
      source: "supabase",
    };
    if (!options.mode && !options.liveInvoiceNumbers) {
      cachedData = { data, expiresAt: Date.now() + CACHE_MS };
    }
    return data;
  } catch {
    return localData();
  }
}

export function clearNexusWatchDataCache() {
  cachedData = null;
}

function localData(): NexusWatchData {
  return {
    company: demoCompany,
    rules: demoRules,
    invoices: demoInvoices,
    exports: [],
    source: "local_demo_data",
  };
}

function mapRule(rule: SupabaseRuleRow): NexusRule {
  return {
    id: rule.id,
    companyId: rule.company_id,
    stateCode: rule.state_code,
    stateName: rule.state_name,
    thresholdAmount: Number(rule.threshold_amount),
    saasTaxable: rule.saas_taxable,
    hardwareTaxable: rule.hardware_taxable,
    servicesTaxable: rule.services_taxable,
    notes: rule.notes ?? undefined,
    sourceUrl: rule.source_url ?? undefined,
    lastReviewed: rule.last_reviewed ?? undefined,
  };
}

async function fetchInvoiceDocumentsByInvoiceId(
  supabase: NonNullable<ReturnType<typeof createSupabaseClient>>,
  companyId: string,
  invoiceIds: string[]
) {
  const documentsByInvoiceId = new Map<string, SupabaseDocumentRow>();
  if (!invoiceIds.length) return documentsByInvoiceId;

  const { data, error } = await supabase
    .from("invoice_documents")
    .select(
      "invoice_id,detected_invoice_number,detected_total_amount,detected_ship_to_state,detected_bill_to_state,field_confidence,validation_warnings,extraction_method,ocr_confidence"
    )
    .eq("company_id", companyId)
    .in("invoice_id", invoiceIds);

  if (error || !data) return documentsByInvoiceId;
  for (const document of data as SupabaseDocumentRow[]) {
    if (document.invoice_id) documentsByInvoiceId.set(document.invoice_id, document);
  }
  return documentsByInvoiceId;
}

function mapInvoice(invoice: SupabaseInvoiceRow, document?: SupabaseDocumentRow): Invoice {
  return {
    id: routeSafeInvoiceId(invoice.invoice_number),
    companyId: invoice.company_id,
    invoiceNumber: invoice.invoice_number || "Unknown invoice",
    invoiceDate: invoice.invoice_date || invoice.created_at?.slice(0, 10) || "",
    dueDate: invoice.due_date ?? undefined,
    customerName: invoice.customer_name || "Missing customer",
    shipToState: invoice.ship_to_state,
    billToState: invoice.bill_to_state,
    totalAmount: safeNumber(invoice.total_amount),
    taxableAmount: safeNumber(invoice.taxable_amount),
    sourceType: invoice.source_type ?? "manual",
    status: invoice.status ?? getOperationalStatusFallback(invoice.review_status),
    reviewStatus: invoice.review_status ?? "needs_review",
    riskStatus: invoice.risk_status ?? "needs_review",
    notes: invoice.notes ?? undefined,
    rawText: invoice.raw_text ?? undefined,
    extractedFields: invoice.extracted_fields ?? null,
    unknownFields: invoice.unknown_fields ?? null,
    extractionConfidence: invoice.extraction_confidence == null ? null : Number(invoice.extraction_confidence),
    reviewNotes: invoice.review_notes ?? null,
    accountingReviewReason: invoice.accounting_review_reason ?? null,
    accountingReviewCompletedAt: invoice.accounting_review_completed_at ?? null,
    documentId: invoice.document_id,
    pdfFileName: invoice.pdf_file_name,
    pdfStoragePath: invoice.pdf_storage_path,
    pdfPublicUrl: invoice.pdf_public_url,
    pdfUploadedAt: invoice.pdf_uploaded_at,
    extractionStatus: invoice.extraction_status,
    sourceDocument: document
      ? {
          detectedInvoiceNumber: document.detected_invoice_number ?? null,
          detectedTotalAmount:
            document.detected_total_amount == null ? null : Number(document.detected_total_amount),
          detectedShipToState: document.detected_ship_to_state ?? null,
          detectedBillToState: document.detected_bill_to_state ?? null,
          fieldConfidence: document.field_confidence ?? null,
          validationWarnings: Array.isArray(document.validation_warnings) ? document.validation_warnings : null,
          extractionMethod: document.extraction_method ?? null,
          ocrConfidence: document.ocr_confidence == null ? null : Number(document.ocr_confidence),
        }
      : null,
    lineItems: (invoice.invoice_line_items ?? []).map(mapLineItem),
    flags: (invoice.invoice_flags ?? []).map((flag) => flag.flag_type),
    createdAt: invoice.created_at ?? null,
    updatedAt: invoice.updated_at ?? null,
  };
}

function mapLineItem(item: SupabaseLineItemRow): LineItem {
  return {
    id: item.id,
    description: item.description,
    category: item.category,
    amount: safeNumber(item.amount),
    taxableAmount: safeNumber(item.taxable_amount),
    needsReview: Boolean(item.needs_review),
  };
}

function routeSafeInvoiceId(invoiceNumber: string) {
  return invoiceNumber.toLowerCase().replace(/^inv-?/, "inv-");
}

function mapExportHistory(row: SupabaseExportRow): ExportHistory {
  const inferredType = inferExportType(row.export_type, row.file_name);
  return {
    id: row.id,
    exportType: inferredType,
    stateCode: row.state_code,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    rowCount: safeNumber(row.row_count),
    fileName: row.file_name ?? null,
    createdAt: row.created_at ?? null,
  };
}

function inferExportType(exportType: string, fileName?: string | null) {
  const file = fileName ?? "";
  if (file.includes("nexuswatch_invoice_")) return "single_invoice";
  if (file.includes("rules_reference")) return "rules_reference";
  if (file.includes("review_queue")) return "review_queue";
  if (file.includes("threshold_summary")) return "threshold_summary";
  return exportType;
}

function filterLiveWorkspaceInvoices(invoices: Invoice[], liveInvoiceNumbers: string[]) {
  const allowed = new Set(liveInvoiceNumbers.map((invoiceNumber) => invoiceNumber.trim().toLowerCase()).filter(Boolean));
  if (!allowed.size) return [];
  return invoices.filter((invoice) => allowed.has(invoice.invoiceNumber.toLowerCase()));
}

function safeNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function getOperationalStatusFallback(reviewStatus: InvoiceStatus): OperationalStatus {
  if (reviewStatus === "draft") return "draft";
  if (reviewStatus === "approved") return "reviewed";
  if (reviewStatus === "exported") return "exported";
  return "open";
}
