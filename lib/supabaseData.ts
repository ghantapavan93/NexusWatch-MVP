import { demoCompany, demoInvoices, demoRules } from "@/lib/demoData";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Category, Company, Invoice, InvoiceStatus, LineItem, NexusRule, ReviewFlag, ThresholdStatus } from "@/types";

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

export type NexusWatchData = {
  company: Company;
  rules: NexusRule[];
  invoices: Invoice[];
  source: "supabase" | "local_demo_data";
};

let cachedData: { data: NexusWatchData; expiresAt: number } | null = null;
const CACHE_MS = 5000;

export async function getNexusWatchData(): Promise<NexusWatchData> {
  if (cachedData && cachedData.expiresAt > Date.now()) return cachedData.data;
  if (!isSupabaseConfigured()) return localData();

  const supabase = createSupabaseClient();
  if (!supabase) return localData();

  try {
    const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id;
    const [{ data: company, error: companyError }, { data: rules, error: rulesError }, { data: invoices, error: invoicesError }] =
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
      ]);

    if (companyError || rulesError || invoicesError || !company || !rules || !invoices) return localData();

    const documentsByInvoiceId = await fetchInvoiceDocumentsByInvoiceId(
      supabase,
      companyId,
      (invoices as SupabaseInvoiceRow[]).map((invoice) => invoice.id)
    );

    const data: NexusWatchData = {
      company: { id: company.id, name: company.name },
      rules: (rules as SupabaseRuleRow[]).map(mapRule),
      invoices: (invoices as SupabaseInvoiceRow[]).map((invoice) => mapInvoice(invoice, documentsByInvoiceId.get(invoice.id))),
      source: "supabase",
    };
    cachedData = { data, expiresAt: Date.now() + CACHE_MS };
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
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date ?? undefined,
    customerName: invoice.customer_name,
    shipToState: invoice.ship_to_state,
    billToState: invoice.bill_to_state,
    totalAmount: Number(invoice.total_amount),
    taxableAmount: Number(invoice.taxable_amount),
    sourceType: invoice.source_type,
    reviewStatus: invoice.review_status,
    riskStatus: invoice.risk_status,
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
  };
}

function mapLineItem(item: SupabaseLineItemRow): LineItem {
  return {
    id: item.id,
    description: item.description,
    category: item.category,
    amount: Number(item.amount),
    taxableAmount: Number(item.taxable_amount),
    needsReview: Boolean(item.needs_review),
  };
}

function routeSafeInvoiceId(invoiceNumber: string) {
  return invoiceNumber.toLowerCase().replace(/^inv-?/, "inv-");
}
