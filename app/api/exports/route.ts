import { NextRequest, NextResponse } from "next/server";
import { invoiceLineItemsToCsv, rulesToCsv, stateSummariesToCsv } from "@/lib/csv";
import { buildStateSummaries } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";
import { recordSupabaseExport } from "@/lib/supabaseWrites";
import { isNormalExportEligible, isReviewQueueInvoice } from "@/lib/thresholdImpact";
import { ExportFilterSchema } from "@/lib/validators";
import type { ExportType, Invoice } from "@/types";

export async function GET() {
  const { invoices, rules, exports, source } = await getNexusWatchData();
  const states = buildStateSummaries(rules, invoices);

  return NextResponse.json({
    source,
    invoices,
    rules,
    states,
    exports,
    metrics: buildExportMetrics(invoices),
  });
}

export async function POST(request: NextRequest) {
  const parsed = ExportFilterSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { invoices, rules, source } = await getNexusWatchData();
  const filters = parsed.data;
  const periodFilteredInvoices = filterInvoicesByPeriodAndState(invoices, filters.dateFrom, filters.dateTo, filters.stateCode);
  const reviewedInvoices = periodFilteredInvoices.filter(isNormalExportEligible);
  const reviewQueueInvoices = periodFilteredInvoices.filter(isReviewQueueInvoice);
  const singleInvoice = invoices.find((invoice) => invoice.invoiceNumber === filters.invoiceNumber);
  const periodStates = buildStateSummaries(rules, reviewedInvoices);

  const csvByType: Record<ExportType, string> = {
    state_transactions: invoiceLineItemsToCsv(reviewedInvoices),
    single_invoice: invoiceLineItemsToCsv(singleInvoice ? [singleInvoice] : []),
    review_queue: invoiceLineItemsToCsv(reviewQueueInvoices),
    threshold_summary: stateSummariesToCsv(periodStates),
    rules_reference: rulesToCsv(rules),
  };
  const rowCountByType: Record<ExportType, number> = {
    state_transactions: countLineItems(reviewedInvoices),
    single_invoice: singleInvoice?.lineItems.length ?? 0,
    review_queue: countLineItems(reviewQueueInvoices),
    threshold_summary: periodStates.length,
    rules_reference: rules.length,
  };
  const exportedInvoiceCountByType: Record<ExportType, number> = {
    state_transactions: reviewedInvoices.length,
    single_invoice: singleInvoice ? 1 : 0,
    review_queue: reviewQueueInvoices.length,
    threshold_summary: periodStates.length,
    rules_reference: rules.length,
  };
  const periodLabel = filters.periodLabel ?? buildPeriodLabel(filters.dateFrom, filters.dateTo);
  const fileName = buildFileName(filters.exportType, {
    invoiceNumber: filters.invoiceNumber,
    periodLabel,
    stateCode: filters.stateCode,
  });

  const exportRecord = await recordSupabaseExport({
    exportType: filters.exportType,
    stateCode: filters.stateCode,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    rowCount: rowCountByType[filters.exportType],
    fileName,
  });

  return NextResponse.json({
    mode: source,
    exportType: filters.exportType,
    periodType: filters.periodType ?? "custom",
    periodLabel,
    stateCode: filters.stateCode ?? "all",
    dateFrom: filters.dateFrom ? toDateString(filters.dateFrom) : null,
    dateTo: filters.dateTo ? toDateString(filters.dateTo) : null,
    csv: csvByType[filters.exportType],
    fileName,
    rowCount: rowCountByType[filters.exportType],
    invoiceCount: exportedInvoiceCountByType[filters.exportType],
    reviewedInvoiceCount: reviewedInvoices.length,
    reviewQueueInvoiceCount: reviewQueueInvoices.length,
    exportHistorySaved: exportRecord.ok,
    message: exportRecord.message,
  });
}

function filterInvoicesByPeriodAndState(
  invoices: Invoice[],
  dateFrom?: Date,
  dateTo?: Date,
  stateCode?: string
) {
  const from = dateFrom ? toDateString(dateFrom) : "";
  const to = dateTo ? toDateString(dateTo) : "";

  return invoices.filter((invoice) => {
    const matchesState = !stateCode || invoice.shipToState === stateCode;
    const matchesStart = !from || invoice.invoiceDate >= from;
    const matchesEnd = !to || invoice.invoiceDate <= to;
    return matchesState && matchesStart && matchesEnd;
  });
}

function countLineItems(invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => sum + invoice.lineItems.length, 0);
}

function buildExportMetrics(invoices: Invoice[]) {
  return {
    reviewedInvoices: invoices.filter(isNormalExportEligible).length,
    reviewQueueItems: invoices.filter(isReviewQueueInvoice).length,
    sourceDocumentsLinked: invoices.filter((invoice) => invoice.documentId || invoice.pdfFileName || invoice.pdfPublicUrl || invoice.sourceDocument).length,
    ocrNeedsReview: invoices.filter((invoice) => invoice.extractionStatus === "ocr_needs_review").length,
  };
}

function buildPeriodLabel(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return "All periods";
  return `${dateFrom ? toDateString(dateFrom) : "Any"} to ${dateTo ? toDateString(dateTo) : "Any"}`;
}

function buildFileName(
  exportType: ExportType,
  {
    invoiceNumber,
    periodLabel,
    stateCode,
  }: {
    invoiceNumber?: string;
    periodLabel: string;
    stateCode?: string;
  }
) {
  const scope = stateCode ? stateCode.toLowerCase() : "all_states";
  const period = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (exportType === "single_invoice" && invoiceNumber) {
    return `nexuswatch_invoice_${invoiceNumber}_${period || new Date().toISOString().slice(0, 10)}.csv`;
  }
  return `nexuswatch_${exportType}_${scope}_${period || new Date().toISOString().slice(0, 10)}.csv`;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}
