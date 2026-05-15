import { demoCompany } from "@/lib/demoData";
import { roundCurrency } from "@/lib/format";
import { buildStateSummaries, isLineTaxable, previewInvoiceImpact } from "@/lib/nexus";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { clearNexusWatchDataCache, getNexusWatchData } from "@/lib/supabaseData";
import type { Category, InvoiceStatus, NexusRule, OperationalStatus, ReviewFlag } from "@/types";

const REVIEW_FLAG_MESSAGES: Record<ReviewFlag, string> = {
  missing_ship_to: "Missing ship-to state; skipped from threshold calculations and blocked from state export.",
  missing_category: "Line item category needs review before export.",
  ship_bill_mismatch: "Ship-to and bill-to states differ; review state assignment.",
  may_cross_threshold: "Invoice may move the state close to or past the configured threshold.",
  crossed_threshold: "Invoice moves the state past the configured demo threshold.",
  duplicate_invoice: "Potential duplicate invoice number detected.",
  large_invoice: "Large invoice recommended for accounting review.",
  category_review: "Category treatment should be confirmed with accounting.",
};

type WritableLineItem = {
  description: string;
  category: Category;
  amount: number;
};

type WritablePdfUpload = {
  documentId: string;
  fileName: string;
  storagePath: string;
  publicUrl?: string;
  contentType?: string;
  size?: number;
  extractionStatus: "manual_review_required" | "extracted_needs_review" | "ocr_needs_review" | "extraction_failed";
  extractionMethod?: "pdf_text" | "ocr" | "manual_review";
  ocrConfidence?: number | null;
  detectedFields?: Record<string, unknown>;
  unknownFields?: Record<string, unknown>;
  fieldConfidence?: Record<string, unknown>;
  validationWarnings?: string[];
};

export type WritableInvoiceInput = {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date | null;
  customerName: string;
  shipToState?: string | null;
  billToState?: string | null;
  notes?: string;
  rawText?: string;
  extractedFields?: Record<string, unknown>;
  unknownFields?: Record<string, unknown>;
  extractionConfidence?: number | null;
  reviewNotes?: string;
  pdfUpload?: WritablePdfUpload;
  lineItems: WritableLineItem[];
  status?: OperationalStatus;
  reviewStatus?: InvoiceStatus;
  requestedStatus?: InvoiceStatus;
};

export async function createSupabaseInvoice(input: WritableInvoiceInput) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, status: 503, message: "Supabase is not configured. Invoice was not saved." };
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    return { ok: false as const, status: 503, message: "Supabase client is unavailable. Invoice was not saved." };
  }

  const { invoices, rules } = await getNexusWatchData();
  const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id;
  const shipToState = normalizeState(input.shipToState);
  const billToState = normalizeState(input.billToState);
  const rule = rules.find((item) => item.stateCode === shipToState);
  const totals = calculateWritableTotals(input.lineItems, rule, Boolean(shipToState));
  const flags = buildWritableFlags({
    invoiceNumber: input.invoiceNumber,
    lineItems: input.lineItems,
    totalAmount: totals.totalAmount,
    taxableAmount: totals.taxableAmount,
    shipToState,
    billToState,
    rule,
    invoices,
    rules,
  });
  const reviewStatus = getReviewStatus(input.reviewStatus ?? input.requestedStatus, flags);
  const status = input.status ?? getOperationalStatus(reviewStatus);
  const riskStatus = getRiskStatus(rule, shipToState, totals.taxableAmount, reviewStatus, invoices, rules);

  const invoicePayload = {
    company_id: companyId,
    invoice_number: input.invoiceNumber.trim(),
    invoice_date: toDateString(input.invoiceDate),
    due_date: input.dueDate ? toDateString(input.dueDate) : null,
    customer_name: input.customerName.trim(),
    ship_to_state: shipToState,
    bill_to_state: billToState,
    total_amount: totals.totalAmount,
    taxable_amount: totals.taxableAmount,
    excluded_amount: totals.excludedAmount,
    document_id: input.pdfUpload?.documentId ?? null,
    pdf_file_name: input.pdfUpload?.fileName ?? null,
    pdf_storage_path: input.pdfUpload?.storagePath ?? null,
    pdf_public_url: input.pdfUpload?.publicUrl ?? null,
    pdf_uploaded_at: input.pdfUpload ? new Date().toISOString() : null,
    extraction_status:
      input.pdfUpload?.extractionStatus ?? (input.extractedFields ? "extracted_needs_review" : "manual_review_required"),
    status,
    source_type: input.pdfUpload ? "pdf_preview" : input.rawText ? "paste" : "manual",
    review_status: reviewStatus,
    risk_status: riskStatus,
    notes: input.notes || null,
    raw_text: buildRawText(input.rawText, input.pdfUpload),
    extracted_fields: input.extractedFields ?? input.pdfUpload?.detectedFields ?? {},
    unknown_fields: input.unknownFields ?? input.pdfUpload?.unknownFields ?? {},
    extraction_confidence: input.extractionConfidence ?? null,
    review_notes: input.reviewNotes ?? null,
  };

  const { data: invoice, error: invoiceError } = await insertInvoiceWithOptionalReviewFields(supabase, invoicePayload);

  if (invoiceError || !invoice) {
    const duplicate = invoiceError?.code === "23505";
    return {
      ok: false as const,
      status: duplicate ? 409 : 500,
      message: duplicate
        ? "That invoice number already exists in Supabase. Use a new invoice number or edit the existing invoice."
        : invoiceError?.message ?? "Invoice could not be saved.",
    };
  }

  const lineRows = input.lineItems.map((item) => {
    const amount = roundCurrency(item.amount);
    const taxableAmount = rule && shipToState && isLineTaxable(rule, item.category) ? amount : 0;

    return {
      invoice_id: invoice.id,
      description: item.description,
      category: item.category,
      amount,
      line_amount: amount,
      taxable_amount: roundCurrency(taxableAmount),
      excluded_amount: roundCurrency(amount - taxableAmount),
      needs_review: item.category === "other",
    };
  });

  const { error: lineError } = await supabase.from("invoice_line_items").insert(lineRows);
  if (lineError) return { ok: false as const, status: 500, message: lineError.message };

  if (flags.length) {
    const { error: flagsError } = await supabase.from("invoice_flags").insert(
      flags.map((flag) => ({
        invoice_id: invoice.id,
        state_code: shipToState,
        flag_type: flag,
        severity: flag === "ship_bill_mismatch" ? "info" : "high",
        message: REVIEW_FLAG_MESSAGES[flag],
      }))
    );
    if (flagsError) return { ok: false as const, status: 500, message: flagsError.message };
  }

  if (input.pdfUpload?.documentId) {
    const { error: documentLinkError } = await supabase
      .from("invoice_documents")
      .update({ invoice_id: invoice.id })
      .eq("id", input.pdfUpload.documentId);

    if (documentLinkError) {
      return { ok: false as const, status: 500, message: documentLinkError.message };
    }
  }

  await supabase.from("audit_logs").insert({
    company_id: companyId,
    entity_type: "invoice",
    entity_id: invoice.id,
    action: "created",
    actor: "Sara Demo User",
    message: `Invoice ${invoice.invoice_number} saved from manual intake.`,
    metadata: {
      invoice_number: invoice.invoice_number,
      status,
      review_status: reviewStatus,
      total_amount: totals.totalAmount,
      taxable_amount: totals.taxableAmount,
      source: "upload",
      document_id: input.pdfUpload?.documentId ?? null,
      pdf_file_name: input.pdfUpload?.fileName ?? null,
      extracted_field_count: input.extractedFields ? Object.keys(input.extractedFields).length : 0,
      warning_count: input.pdfUpload?.validationWarnings?.length ?? 0,
    },
  });

  clearNexusWatchDataCache();

  return {
    ok: true as const,
    status: 201,
    message: "Invoice saved to Supabase.",
    invoice: {
      id: String(invoice.id),
      invoiceNumber: invoice.invoice_number,
      reviewStatus,
      riskStatus,
      flags,
    },
  };
}

async function insertInvoiceWithOptionalReviewFields(
  supabase: NonNullable<ReturnType<typeof createSupabaseClient>>,
  invoicePayload: Record<string, unknown>
) {
  const insert = (payload: Record<string, unknown>) =>
    supabase
    .from("invoices")
    .insert(payload)
    .select("id,invoice_number")
    .single();

  const result = await insert(invoicePayload);
  if (!isMissingReviewColumnError(result.error)) return result;

  const fallbackPayload = { ...invoicePayload };
  delete fallbackPayload.extracted_fields;
  delete fallbackPayload.unknown_fields;
  delete fallbackPayload.extraction_confidence;
  delete fallbackPayload.review_notes;
  return insert(fallbackPayload);
}

function buildRawText(rawText?: string, pdfUpload?: WritableInvoiceInput["pdfUpload"]) {
  if (!pdfUpload) return rawText || null;

  return JSON.stringify({
    intakeType: "pdf_preview",
    manualReviewRequired: true,
    note: "PDF uploaded to Supabase Storage. Fields were manually reviewed before saving.",
    pastedText: rawText || "",
    pdfUpload,
  });
}

export async function updateSupabaseInvoiceStatus(
  invoiceId: string,
  status: OperationalStatus,
  reviewStatus: InvoiceStatus,
  options: {
    auditSource?: string;
    auditAction?: string;
    riskReasons?: string[];
    accountingReviewCompleted?: boolean;
    pdfUpload?: WritablePdfUpload;
  } = {}
) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, status: 503, message: "Supabase is not configured. Status was not saved." };
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    return { ok: false as const, status: 503, message: "Supabase client is unavailable. Status was not saved." };
  }

  const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id;
  let invoiceNumber = invoiceId;

  if (!isUuid(invoiceId)) {
    const { invoices } = await getNexusWatchData();
    const invoice = invoices.find(
      (item) => item.id === invoiceId || item.invoiceNumber.toLowerCase() === invoiceId.toLowerCase()
    );
    if (!invoice) return { ok: false as const, status: 404, message: "Invoice not found." };
    invoiceNumber = invoice.invoiceNumber;
  }

  const previousQuery = supabase
    .from("invoices")
    .select("id,invoice_number,status,review_status,risk_status,document_id,pdf_file_name,pdf_storage_path,pdf_public_url,pdf_uploaded_at,extraction_status")
    .eq("company_id", companyId);
  const { data: previous } = await (isUuid(invoiceId)
    ? previousQuery.eq("id", invoiceId).single()
    : previousQuery.eq("invoice_number", invoiceNumber).single());

  if (!previous) return { ok: false as const, status: 404, message: "Invoice not found." };

  const shouldAttachPdf = Boolean(options.pdfUpload && !previous.document_id);
  const updatePayload: Record<string, unknown> = {
    status,
    review_status: reviewStatus,
    updated_at: new Date().toISOString(),
  };

  if (options.accountingReviewCompleted) {
    updatePayload.accounting_review_completed_at = new Date().toISOString();
  }
  if (reviewStatus === "accounting_review" && options.riskReasons?.length) {
    updatePayload.accounting_review_reason = options.riskReasons.join("; ");
  }

  if (shouldAttachPdf && options.pdfUpload) {
    updatePayload.document_id = options.pdfUpload.documentId;
    updatePayload.pdf_file_name = options.pdfUpload.fileName;
    updatePayload.pdf_storage_path = options.pdfUpload.storagePath;
    updatePayload.pdf_public_url = options.pdfUpload.publicUrl ?? null;
    updatePayload.pdf_uploaded_at = new Date().toISOString();
    updatePayload.extraction_status = options.pdfUpload.extractionStatus;
    if (options.pdfUpload.detectedFields) {
      updatePayload.extracted_fields = options.pdfUpload.detectedFields;
      updatePayload.unknown_fields = options.pdfUpload.unknownFields ?? {};
      updatePayload.review_notes = options.pdfUpload.validationWarnings?.join(" ") ?? null;
      updatePayload.extraction_confidence = options.pdfUpload.ocrConfidence ?? null;
    }
  }

  const { data, error } = await updateInvoiceWithOptionalReviewFields(supabase, companyId, previous.id, updatePayload);

  if (error || !data) {
    return { ok: false as const, status: 500, message: error?.message ?? "Status could not be saved." };
  }

  if (options.pdfUpload?.documentId) {
    const { error: documentLinkError } = await supabase
      .from("invoice_documents")
      .update({ invoice_id: data.id })
      .eq("id", options.pdfUpload.documentId);

    if (documentLinkError) {
      return { ok: false as const, status: 500, message: documentLinkError.message };
    }
  }

  await supabase.from("audit_logs").insert({
    company_id: companyId,
    entity_type: "invoice",
    entity_id: data.id,
    action: options.auditAction ?? "status_updated",
    actor: "Sara Demo User",
    message: `Invoice ${data.invoice_number} marked ${reviewStatus}.`,
    metadata: {
      invoice_number: data.invoice_number,
      previous_status: previous?.status ?? null,
      next_status: data.status,
      previous_review_status: previous?.review_status ?? null,
      next_review_status: data.review_status,
      source: options.auditSource ?? "invoice_detail",
      risk_reasons: options.riskReasons ?? [],
    },
  });
  clearNexusWatchDataCache();

  return {
    ok: true as const,
    status: 200,
    message: "Invoice status saved to Supabase.",
    invoice: {
      id: data.id,
      invoiceNumber: data.invoice_number,
      status: data.status,
      reviewStatus: data.review_status,
      riskStatus: data.risk_status,
    },
  };
}

async function updateInvoiceWithOptionalReviewFields(
  supabase: NonNullable<ReturnType<typeof createSupabaseClient>>,
  companyId: string,
  invoiceId: string,
  updatePayload: Record<string, unknown>
) {
  const update = (payload: Record<string, unknown>) =>
    supabase
      .from("invoices")
      .update(payload)
      .eq("company_id", companyId)
      .eq("id", invoiceId)
      .select("id,invoice_number,status,review_status,risk_status")
      .single();

  const result = await update(updatePayload);
  if (!isMissingReviewColumnError(result.error)) return result;

  const fallbackPayload = { ...updatePayload };
  delete fallbackPayload.extracted_fields;
  delete fallbackPayload.unknown_fields;
  delete fallbackPayload.extraction_confidence;
  delete fallbackPayload.review_notes;
  delete fallbackPayload.accounting_review_completed_at;
  delete fallbackPayload.accounting_review_reason;
  return update(fallbackPayload);
}

export async function recordSupabaseExport(input: {
  exportType: string;
  stateCode?: string;
  dateFrom?: Date;
  dateTo?: Date;
  rowCount: number;
  fileName?: string;
}) {
  if (!isSupabaseConfigured()) return { ok: false as const, message: "Supabase is not configured." };

  const supabase = createSupabaseClient();
  if (!supabase) return { ok: false as const, message: "Supabase client is unavailable." };

  const payload = {
    company_id: process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id,
    export_type: input.exportType,
    state_code: input.stateCode || null,
    date_from: input.dateFrom ? toDateString(input.dateFrom) : null,
    date_to: input.dateTo ? toDateString(input.dateTo) : null,
    row_count: input.rowCount,
    file_name: input.fileName ?? buildExportFileName(input.exportType),
  };

  const { error } = await supabase.from("exports").insert(payload);

  if (error) return { ok: false as const, message: error.message };
  clearNexusWatchDataCache();
  return { ok: true as const, message: "Export history saved to Supabase." };
}

function calculateWritableTotals(lineItems: WritableLineItem[], rule: NexusRule | undefined, hasShipToState: boolean) {
  const totalAmount = roundCurrency(lineItems.reduce((sum, item) => sum + roundCurrency(item.amount), 0));
  const taxableAmount =
    rule && hasShipToState
      ? roundCurrency(
          lineItems.reduce((sum, item) => sum + (isLineTaxable(rule, item.category) ? roundCurrency(item.amount) : 0), 0)
        )
      : 0;

  return {
    totalAmount,
    taxableAmount,
    excludedAmount: roundCurrency(totalAmount - taxableAmount),
  };
}

function buildWritableFlags({
  invoiceNumber,
  lineItems,
  totalAmount,
  taxableAmount,
  shipToState,
  billToState,
  rule,
  invoices,
  rules,
}: {
  invoiceNumber: string;
  lineItems: WritableLineItem[];
  totalAmount: number;
  taxableAmount: number;
  shipToState: string | null;
  billToState: string | null;
  rule?: NexusRule;
  invoices: Awaited<ReturnType<typeof getNexusWatchData>>["invoices"];
  rules: NexusRule[];
}) {
  const flags = new Set<ReviewFlag>();
  if (!shipToState) flags.add("missing_ship_to");
  if (lineItems.some((item) => item.category === "other")) {
    flags.add("missing_category");
    flags.add("category_review");
  }
  if (shipToState && billToState && shipToState !== billToState) flags.add("ship_bill_mismatch");
  if (Math.abs(totalAmount) >= 50000) flags.add("large_invoice");
  if (invoices.some((invoice) => invoice.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase())) {
    flags.add("duplicate_invoice");
  }

  if (rule && shipToState) {
    const stateSummary = buildStateSummaries(rules, invoices).find((item) => item.stateCode === shipToState);
    const impact = previewInvoiceImpact(stateSummary?.taxableTotal ?? 0, taxableAmount, rule.thresholdAmount);
    if (impact.mayPushOver) flags.add("may_cross_threshold");
    if (impact.after.status === "crossed") flags.add("crossed_threshold");
  }

  return Array.from(flags);
}

function getReviewStatus(requestedStatus: InvoiceStatus | undefined, flags: ReviewFlag[]) {
  if (requestedStatus === "draft") return "draft";
  if (requestedStatus === "needs_review") return "needs_review";
  if (requestedStatus === "accounting_review") return "accounting_review";
  if (requestedStatus === "approved") return "approved";
  if (requestedStatus === "exported") return "exported";
  if (flags.length) return "needs_review";
  return "draft";
}

function getOperationalStatus(reviewStatus: InvoiceStatus): OperationalStatus {
  if (reviewStatus === "draft") return "draft";
  if (reviewStatus === "approved") return "reviewed";
  if (reviewStatus === "exported") return "exported";
  return "open";
}

function getRiskStatus(
  rule: NexusRule | undefined,
  shipToState: string | null,
  taxableAmount: number,
  reviewStatus: InvoiceStatus,
  invoices: Awaited<ReturnType<typeof getNexusWatchData>>["invoices"],
  rules: NexusRule[]
) {
  if (!rule || !shipToState) return reviewStatus === "needs_review" ? "needs_review" : "safe";
  const stateSummary = buildStateSummaries(rules, invoices).find((item) => item.stateCode === shipToState);
  return previewInvoiceImpact(stateSummary?.taxableTotal ?? 0, taxableAmount, rule.thresholdAmount).after.status;
}

function normalizeState(value?: string | null) {
  const trimmed = value?.trim().toUpperCase();
  return trimmed || null;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildExportFileName(exportType: string) {
  return `nexuswatch_${exportType}_${new Date().toISOString().slice(0, 10)}.csv`;
}

function isMissingReviewColumnError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.message?.includes("extracted_fields") ||
        error.message?.includes("unknown_fields") ||
        error.message?.includes("extraction_confidence") ||
        error.message?.includes("review_notes"))
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
