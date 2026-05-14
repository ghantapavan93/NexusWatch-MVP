"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  MapPin,
  MoreVertical,
  RefreshCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
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

  async function generateCsv(typeOverride?: ExportType) {
    const selectedExportType = typeOverride ?? exportType;
    setIsGenerating(true);
    setMessage("Generating CSV and recording export history...");
    setExportType(selectedExportType);

    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: selectedExportType,
          stateCode: stateCode === "all" ? undefined : stateCode,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          invoiceNumber: selectedExportType === "single_invoice" ? invoiceNumber : undefined,
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
          ? `Generated ${readable(selectedExportType)} CSV with ${result.rowCount ?? previewRows.length} rows. Export history saved to Supabase.`
          : result.message ?? `Generated ${readable(selectedExportType)} CSV.`
      );
      if (result.exportHistorySaved) {
        setToastMessage(`${result.fileName ?? readable(selectedExportType)} saved to export history.`);
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
        description="Generate exports for reviewed and review-queue transaction data with audit-ready detail."
      />

      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid gap-5 lg:grid-cols-3">
          <ExportCard
            icon={FileCheck2}
            tone="green"
            title="Reviewed Export"
            badge="Approved Only"
            description="Export only invoices that are approved and post threshold."
            notice="Includes only approved invoices"
            button="Generate Reviewed Export"
            disabled={isGenerating}
            onGenerate={() => generateCsv("state_transactions")}
          >
            <MiniSelect icon={CalendarDays} label="Date Range" value="Last 30 Days" />
            <MiniSelect icon={MapPin} label="States" value={stateCode === "all" ? "All States" : stateCode} />
          </ExportCard>
          <ExportCard
            icon={FileSpreadsheet}
            tone="orange"
            title="Review Queue Export"
            badge="Includes Review Items"
            description="Export invoices in the review queue, including pending and needs review."
            notice="Includes items in review"
            button="Generate Review Queue Export"
            disabled={isGenerating}
            onGenerate={() => generateCsv("review_queue")}
          >
            <MiniSelect icon={CalendarDays} label="Date Range" value="Last 30 Days" />
            <MiniSelect icon={AlertTriangle} label="Review Status" value="All Review Statuses" />
          </ExportCard>
          <ExportCard
            icon={FileText}
            tone="violet"
            title="Single Invoice Export"
            description="Export all data for a single invoice with full line-item and decision details."
            notice="Includes full invoice and rule evaluation"
            button="Generate Single Invoice Export"
            disabled={isGenerating}
            onGenerate={() => generateCsv("single_invoice")}
          >
            <label className="relative block">
              <span className="sr-only">Search invoice</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-800 outline-none ring-indigo-100 focus:ring-4"
              >
                {demoInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.invoiceNumber}>
                    {invoice.invoiceNumber} - {invoice.customerName}
                  </option>
                ))}
              </select>
            </label>
          </ExportCard>
        </section>

        <ExportGuidance />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="premium-card p-5 xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-950 p-3 text-white">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-950">Export Builder</h2>
              <p className="mt-1 text-xs text-slate-500">Configure your export and generate a CSV for accounting review.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              State
              <select
                value={stateCode}
                onChange={(event) => setStateCode(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
              >
                <option value="all">All states</option>
                {demoRules.map((rule) => (
                  <option key={rule.stateCode} value={rule.stateCode}>
                    {rule.stateCode} - {rule.stateName}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">
                Date From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Date To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
                />
              </label>
            </div>

            <label className="block text-sm font-bold text-slate-700">
              Export Type
              <select
                value={exportType}
                onChange={(event) => setExportType(event.target.value as ExportType)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
              >
                {exportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            {exportType === "single_invoice" ? (
              <label className="block text-sm font-bold text-slate-700">
                Single Invoice
                <select
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
                >
                  {demoInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.invoiceNumber}>
                      {invoice.invoiceNumber} - {invoice.customerName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div>
              <div className="text-sm font-bold text-slate-700">Include</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className={`rounded-lg px-3 py-2 text-xs font-black ring-1 ${exportType === "state_transactions" ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-white text-slate-600 ring-slate-200"}`} type="button" onClick={() => setExportType("state_transactions")}>
                  All Invoices
                </button>
                <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200" type="button" onClick={() => setExportType("state_transactions")}>
                  Reviewed Only
                </button>
                <button className={`rounded-lg px-3 py-2 text-xs font-black ring-1 ${exportType === "review_queue" ? "bg-orange-50 text-orange-700 ring-orange-200" : "bg-white text-slate-600 ring-slate-200"}`} type="button" onClick={() => setExportType("review_queue")}>
                  Review Items Only
                </button>
                <button className={`rounded-lg px-3 py-2 text-xs font-black ring-1 ${exportType === "threshold_summary" ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-white text-slate-600 ring-slate-200"}`} type="button" onClick={() => setExportType("threshold_summary")}>
                  Threshold Items
                </button>
              </div>
            </div>

            <button className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50" type="button">
              Advanced Filters
              <span>›</span>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" disabled={isGenerating} onClick={() => generateCsv()} className="primary-button px-3 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
              <Download className="h-4 w-4" />
              Generate CSV
            </button>
            <button type="button" disabled={isGenerating} onClick={downloadCsv} className="secondary-button px-3 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
              Download CSV
            </button>
            <button type="button" onClick={copySummary} className="secondary-button px-3 py-3 text-sm">
              <Copy className="h-4 w-4" />
              Copy Summary
            </button>
            <button type="button" onClick={() => setExportType("single_invoice")} className="secondary-button px-3 py-3 text-sm">
              <FileText className="h-4 w-4" />
              Single Invoice Export
            </button>
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">{message}</p>
        </section>

        <section className="data-grid">
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

      <RecentExports generatedFileName={generatedFileName} generatedType={exportType} generatedRows={previewRows.length} />
    </>
  );
}

function ExportCard({
  icon: Icon,
  tone,
  title,
  badge,
  description,
  notice,
  button,
  disabled,
  onGenerate,
  children,
}: {
  icon: typeof FileText;
  tone: "green" | "orange" | "violet";
  title: string;
  badge?: string;
  description: string;
  notice: string;
  button: string;
  disabled: boolean;
  onGenerate: () => void;
  children: ReactNode;
}) {
  const toneStyles = {
    green: {
      icon: "bg-emerald-50 text-emerald-600",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      notice: "bg-emerald-50 text-emerald-800",
      button: "bg-emerald-600 hover:bg-emerald-700",
    },
    orange: {
      icon: "bg-orange-50 text-orange-600",
      badge: "bg-orange-50 text-orange-700 ring-orange-200",
      notice: "bg-orange-50 text-orange-800",
      button: "bg-orange-600 hover:bg-orange-700",
    },
    violet: {
      icon: "bg-violet-50 text-violet-600",
      badge: "bg-violet-50 text-violet-700 ring-violet-200",
      notice: "bg-violet-50 text-violet-800",
      button: "bg-indigo-600 hover:bg-indigo-700",
    },
  }[tone];

  return (
    <div className="premium-card p-5">
      <div className="flex items-start gap-4">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${toneStyles.icon}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-950">{title}</h2>
            {badge ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${toneStyles.badge}`}>{badge}</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">{children}</div>
      <div className={`mt-5 rounded-xl px-3 py-3 text-sm font-bold ${toneStyles.notice}`}>{notice}</div>
      <button
        type="button"
        disabled={disabled}
        onClick={onGenerate}
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${toneStyles.button}`}
      >
        <Download className="h-4 w-4" />
        {button}
      </button>
    </div>
  );
}

function MiniSelect({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm">
      <span className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function ExportGuidance() {
  return (
    <aside className="premium-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <BookOpen className="h-5 w-5" />
        </span>
        <h2 className="font-black text-indigo-700">Export Guidance</h2>
      </div>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
        <li><span className="font-black text-slate-950">Reviewed Export</span> includes only approved invoices above the configured threshold.</li>
        <li><span className="font-black text-slate-950">Review Queue Export</span> includes all items pending or in review.</li>
        <li><span className="font-black text-slate-950">Single Invoice Export</span> provides full detail for audit or research.</li>
      </ul>
      <div className="mt-5 border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 font-black text-slate-950">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          Audit Readiness
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          All exports include decision metadata, thresholds, and state exposure details for accounting review.
        </p>
      </div>
    </aside>
  );
}

function RecentExports({
  generatedFileName,
  generatedType,
  generatedRows,
}: {
  generatedFileName: string;
  generatedType: ExportType;
  generatedRows: number;
}) {
  const rows = [
    {
      type: generatedFileName ? readable(generatedType) : "Reviewed Export",
      scope: "All States",
      rows: generatedFileName ? generatedRows : 12458,
      file: generatedFileName || "reviewed_export_2026-05-14_0915.csv",
      created: "May 14, 2026 9:15 AM",
      badge: generatedType === "review_queue" ? "Includes Review Items" : "Approved Only",
    },
    { type: "Review Queue Export", scope: "Texas, Illinois", rows: 2731, file: "review_queue_2026-05-14_0832.csv", created: "May 14, 2026 8:32 AM", badge: "Includes Review Items" },
    { type: "Single Invoice Export", scope: "Invoice INV-1048", rows: 3, file: "invoice_INV-1048_2026-05-14_0740.csv", created: "May 14, 2026 7:40 AM", badge: "Full Invoice Detail" },
    { type: "Reviewed Export", scope: "California, New York", rows: 8921, file: "reviewed_export_2026-05-13_1635.csv", created: "May 13, 2026 4:35 PM", badge: "Approved Only" },
  ];

  return (
    <section className="data-grid">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-black text-slate-950">Recent Exports</h2>
        <button className="secondary-button px-3 py-2 text-sm" type="button">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Export Type</th>
              <th className="px-5 py-3">Scope</th>
              <th className="px-5 py-3 text-right">Row Count</th>
              <th className="px-5 py-3">File Name</th>
              <th className="px-5 py-3">Generated By</th>
              <th className="px-5 py-3">Created At</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={`${row.type}-${row.file}`} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                      <FileCheck2 className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-black text-slate-950">{row.type}</div>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${row.badge.includes("Review") ? "bg-orange-50 text-orange-700 ring-orange-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
                        {row.badge}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-700">{row.scope}<div className="text-xs text-slate-500">Last 30 Days</div></td>
                <td className="px-5 py-4 text-right font-black text-slate-950">{row.rows.toLocaleString()}</td>
                <td className="px-5 py-4 text-slate-700">{row.file}<div className="text-xs text-slate-500">CSV</div></td>
                <td className="px-5 py-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">XO</span>
                  <span className="ml-2 text-slate-700">Xemelgo Demo Operations</span>
                </td>
                <td className="px-5 py-4 text-slate-700">{row.created}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" type="button">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
        <span>Showing 1 to {rows.length} of {rows.length} exports</span>
        <div className="flex items-center gap-2">
          <button className="secondary-button px-3 py-2 text-sm opacity-60" type="button">Prev</button>
          <button className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 font-bold text-indigo-700 ring-1 ring-indigo-200" type="button">1</button>
          <button className="secondary-button px-3 py-2 text-sm opacity-60" type="button">Next</button>
        </div>
      </div>
    </section>
  );
}

function readable(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
