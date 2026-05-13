"use client";

import { useMemo, useState } from "react";
import { Copy, Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Toast } from "@/components/shared/Toast";
import { csvEscape, rulesToCsv, stateSummariesToCsv } from "@/lib/csv";
import { demoInvoices, demoRules } from "@/lib/demoData";
import { formatCurrency, formatDate, stateLabel } from "@/lib/format";
import { buildStateSummaries } from "@/lib/nexus";

type ExportType = "state_transactions" | "single_invoice" | "review_queue" | "threshold_summary" | "rules_reference";

const exportTypes: { value: ExportType; label: string }[] = [
  { value: "state_transactions", label: "State Transactions" },
  { value: "single_invoice", label: "Single Invoice" },
  { value: "review_queue", label: "Review Queue" },
  { value: "threshold_summary", label: "Threshold Summary" },
  { value: "rules_reference", label: "Rules Reference" },
];

const previewHeaders = [
  "Invoice Number",
  "Invoice Date",
  "Customer",
  "Ship To",
  "Bill To",
  "Category",
  "Line Amount",
  "Taxable Amount",
  "Status",
  "Flags",
];

export default function ExportsPage() {
  const [stateCode, setStateCode] = useState("all");
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-12-31");
  const [exportType, setExportType] = useState<ExportType>("state_transactions");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-1048");
  const [message, setMessage] = useState("Configure filters, preview rows, then generate a CSV for accounting review.");
  const [toastMessage, setToastMessage] = useState("");
  const [generatedCsv, setGeneratedCsv] = useState("");
  const [generatedFileName, setGeneratedFileName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const states = buildStateSummaries(demoRules, demoInvoices);
  const reviewInvoices = demoInvoices.filter(
    (invoice) =>
      invoice.reviewStatus === "needs_review" ||
      invoice.reviewStatus === "accounting_review" ||
      invoice.extractionStatus === "ocr_needs_review" ||
      invoice.flags.length > 0
  );
  const exportReadyInvoices = demoInvoices.filter(
    (invoice) =>
      (invoice.reviewStatus === "approved" || invoice.reviewStatus === "exported") &&
      Boolean(invoice.shipToState) &&
      !invoice.flags.includes("missing_category")
  );
  const statesWithReviewItems = new Set(reviewInvoices.map((invoice) => invoice.shipToState).filter(Boolean)).size;

  const previewRows = useMemo(() => {
    const baseInvoices =
      exportType === "review_queue"
        ? reviewInvoices
        : exportType === "single_invoice"
          ? demoInvoices.filter((invoice) => invoice.invoiceNumber === invoiceNumber)
          : demoInvoices.filter(
              (invoice) =>
                (invoice.reviewStatus === "approved" || invoice.reviewStatus === "exported") &&
                Boolean(invoice.shipToState) &&
                !invoice.flags.includes("missing_category")
            );
    const filteredInvoices = baseInvoices.filter((invoice) => {
      if (exportType === "single_invoice") return true;
      const matchesState = stateCode === "all" || invoice.shipToState === stateCode;
      const matchesStart = !dateFrom || invoice.invoiceDate >= dateFrom;
      const matchesEnd = !dateTo || invoice.invoiceDate <= dateTo;
      return matchesState && matchesStart && matchesEnd;
    });

    return filteredInvoices.flatMap((invoice) =>
      invoice.lineItems.map((lineItem) => ({
        invoice,
        lineItem,
      }))
    );
  }, [dateFrom, dateTo, exportType, invoiceNumber, reviewInvoices, stateCode]);

  const csv = useMemo(() => {
    if (exportType === "threshold_summary") return stateSummariesToCsv(states);
    if (exportType === "rules_reference") return rulesToCsv(demoRules);

    const rows = previewRows.map(({ invoice, lineItem }) => [
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.customerName,
      invoice.shipToState ?? "",
      invoice.billToState ?? "",
      lineItem.category,
      lineItem.amount,
      lineItem.taxableAmount ?? 0,
      invoice.reviewStatus,
      invoice.flags.join("; "),
    ]);

    return [previewHeaders, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  }, [exportType, previewRows, states]);

  async function generateCsv() {
    setIsGenerating(true);
    setMessage("Generating CSV and recording export history...");

    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType,
          stateCode: stateCode === "all" ? undefined : stateCode,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          invoiceNumber: exportType === "single_invoice" ? invoiceNumber : undefined,
        }),
      });
      const result = (await response.json()) as {
        csv?: string;
        fileName?: string;
        rowCount?: number;
        exportHistorySaved?: boolean;
        message?: string;
      };

      if (!response.ok || !result.csv) {
        setMessage(result.message ?? "CSV could not be generated.");
        return "";
      }

      setGeneratedCsv(result.csv);
      setGeneratedFileName(result.fileName ?? "");
      setMessage(
        result.exportHistorySaved
          ? `Generated ${readable(exportType)} CSV with ${result.rowCount ?? previewRows.length} rows. Export history saved to Supabase.`
          : result.message ?? `Generated ${readable(exportType)} CSV.`
      );
      if (result.exportHistorySaved) {
        setToastMessage(`${result.fileName ?? readable(exportType)} saved to export history.`);
      }
      return result.csv;
    } catch {
      setMessage("CSV could not be generated. Check the local server and Supabase connection.");
      return "";
    } finally {
      setIsGenerating(false);
    }
  }

  async function downloadCsv() {
    const csvToDownload = generatedCsv || (await generateCsv()) || csv;
    const blob = new Blob([csvToDownload], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = generatedFileName || `nexuswatch-${exportType}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("CSV download prepared from the current export settings. Export history is recorded when the CSV is generated.");
    setToastMessage("CSV download prepared.");
  }

  async function copySummary() {
    const summary = `NexusWatch export: ${readable(exportType)} | State: ${stateCode === "all" ? "All" : stateCode} | Date range: ${dateFrom || "Any"} to ${dateTo || "Any"} | Preview rows: ${previewRows.length}`;
    await navigator.clipboard.writeText(summary);
    setMessage("Export summary copied to clipboard.");
  }

  return (
    <>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      <PageHeader
        title="Exports"
        description="Build clean transaction, review, threshold, and rules exports for accounting review."
      />

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Export Ready" value={exportReadyInvoices.length} detail="Approved invoices with required fields" />
        <SummaryCard label="States with Review Items" value={statesWithReviewItems} detail="States represented in review queue" />
        <SummaryCard label="Current Period Invoices" value={demoInvoices.length} detail="Calendar year demo data" />
        <SummaryCard label="Rules Reference Available" value={demoRules.length} detail="Configured demo state rules" />
      </section>

      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Exports are for accounting review and filing prep only. Final tax treatment should be reviewed with accounting.
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="surface rounded-lg p-5 xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-slate-900 p-2 text-white">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Export Builder</h2>
              <p className="mt-1 text-xs text-slate-500">Filters apply to line-item preview exports.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              State
              <select
                value={stateCode}
                onChange={(event) => setStateCode(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
              >
                <option value="all">All states</option>
                {demoRules.map((rule) => (
                  <option key={rule.stateCode} value={rule.stateCode}>
                    {rule.stateCode} - {rule.stateName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Date from
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Date to
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Export type
              <select
                value={exportType}
                onChange={(event) => setExportType(event.target.value as ExportType)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
              >
                {exportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            {exportType === "single_invoice" ? (
              <label className="block text-sm font-medium text-slate-700">
                Invoice
                <select
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
                >
                  {demoInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.invoiceNumber}>
                      {invoice.invoiceNumber} - {invoice.customerName}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  Downloads one selected invoice only, with one row per line item.
                </span>
              </label>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              disabled={isGenerating}
              onClick={generateCsv}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate CSV
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={downloadCsv}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={copySummary}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Copy className="h-4 w-4" />
              Copy Summary
            </button>
          </div>

          <p className="mt-4 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">{message}</p>
        </section>

        <section className="surface overflow-hidden rounded-lg">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Export Preview</h2>
              <p className="mt-1 text-xs text-slate-500">
                One row per line item for transaction-style exports. Summary and rules CSVs use their own export format.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
              {previewRows.length} preview rows
            </span>
          </div>

          {previewRows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Invoice Number</th>
                    <th className="px-5 py-3">Invoice Date</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Ship To</th>
                    <th className="px-5 py-3">Bill To</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-right">Line Amount</th>
                    <th className="px-5 py-3 text-right">Taxable Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewRows.map(({ invoice, lineItem }) => (
                    <tr key={`${invoice.id}-${lineItem.id}`} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-950">{invoice.invoiceNumber}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(invoice.invoiceDate)}</td>
                      <td className="px-5 py-4 text-slate-700">{invoice.customerName}</td>
                      <td className="px-5 py-4 text-slate-600">{stateLabel(invoice.shipToState)}</td>
                      <td className="px-5 py-4 text-slate-600">{stateLabel(invoice.billToState)}</td>
                      <td className="px-5 py-4 capitalize text-slate-600">{lineItem.category}</td>
                      <td className="px-5 py-4 text-right font-medium text-slate-800">{formatCurrency(lineItem.amount)}</td>
                      <td className="px-5 py-4 text-right font-medium text-slate-800">{formatCurrency(lineItem.taxableAmount ?? 0)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={invoice.reviewStatus} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {invoice.flags.length ? (
                            invoice.flags.map((flag) => <StatusBadge key={flag} status={flag} />)
                          ) : (
                            <span className="text-xs text-slate-500">None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <h3 className="text-sm font-semibold text-slate-950">No export rows found</h3>
              <p className="mt-2 text-sm text-slate-500">Adjust the state, date range, or export type to preview rows.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="surface rounded-lg p-4">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function readable(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
