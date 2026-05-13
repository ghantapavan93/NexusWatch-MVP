import { NextRequest, NextResponse } from "next/server";
import { invoiceLineItemsToCsv, rulesToCsv, stateSummariesToCsv } from "@/lib/csv";
import { buildStateSummaries } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";
import { recordSupabaseExport } from "@/lib/supabaseWrites";
import { ExportFilterSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const parsed = ExportFilterSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { invoices, rules, source } = await getNexusWatchData();
  const states = buildStateSummaries(rules, invoices);
  const stateExportInvoices = invoices.filter(
    (invoice) =>
      (invoice.reviewStatus === "approved" || invoice.reviewStatus === "exported") &&
      Boolean(invoice.shipToState) &&
      !invoice.flags.includes("missing_category")
  );
  const filteredInvoices = parsed.data.stateCode
    ? stateExportInvoices.filter((invoice) => invoice.shipToState === parsed.data.stateCode)
    : stateExportInvoices;

  const singleInvoice = invoices.find((invoice) => invoice.invoiceNumber === parsed.data.invoiceNumber);
  const reviewQueueInvoices = invoices.filter(
    (invoice) =>
      invoice.reviewStatus === "needs_review" ||
      invoice.reviewStatus === "accounting_review" ||
      invoice.extractionStatus === "ocr_needs_review" ||
      invoice.flags.length > 0
  );
  const csvByType = {
    state_transactions: invoiceLineItemsToCsv(filteredInvoices),
    single_invoice: invoiceLineItemsToCsv(singleInvoice ? [singleInvoice] : []),
    review_queue: invoiceLineItemsToCsv(reviewQueueInvoices),
    threshold_summary: stateSummariesToCsv(states),
    rules_reference: rulesToCsv(rules),
  };
  const rowCountByType = {
    state_transactions: filteredInvoices.reduce((sum, invoice) => sum + invoice.lineItems.length, 0),
    single_invoice: singleInvoice?.lineItems.length ?? 0,
    review_queue: reviewQueueInvoices.reduce((sum, invoice) => sum + invoice.lineItems.length, 0),
    threshold_summary: states.length,
    rules_reference: rules.length,
  };
  const fileName =
    parsed.data.exportType === "single_invoice" && parsed.data.invoiceNumber
      ? `nexuswatch_invoice_${parsed.data.invoiceNumber}_${new Date().toISOString().slice(0, 10)}.csv`
      : `nexuswatch_${parsed.data.exportType}_${new Date().toISOString().slice(0, 10)}.csv`;
  const exportRecord = await recordSupabaseExport({
    exportType: parsed.data.exportType,
    stateCode: parsed.data.stateCode,
    dateFrom: parsed.data.dateFrom,
    dateTo: parsed.data.dateTo,
    rowCount: rowCountByType[parsed.data.exportType],
    fileName,
  });

  return NextResponse.json({
    mode: source,
    exportType: parsed.data.exportType,
    csv: csvByType[parsed.data.exportType],
    fileName,
    rowCount: rowCountByType[parsed.data.exportType],
    exportHistorySaved: exportRecord.ok,
    message: exportRecord.message,
  });
}
