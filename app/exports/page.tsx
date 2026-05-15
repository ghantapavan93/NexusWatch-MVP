"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Toast } from "@/components/shared/Toast";
import { invoiceLineItemsToCsv, rulesToCsv, stateSummariesToCsv } from "@/lib/csv";
import { formatCurrency, formatDate, stateLabel } from "@/lib/format";
import { isNormalExportEligible, isReviewQueueInvoice } from "@/lib/thresholdImpact";
import type { ExportHistory, ExportType, Invoice, NexusRule, StateNexusSummary } from "@/types";

type PeriodType = "monthly" | "quarterly" | "half_year" | "yearly" | "custom";

type ExportData = {
  source: "supabase" | "local_demo_data";
  invoices: Invoice[];
  rules: NexusRule[];
  states: StateNexusSummary[];
  exports: ExportHistory[];
  metrics: {
    reviewedInvoices: number;
    reviewQueueItems: number;
    sourceDocumentsLinked: number;
    ocrNeedsReview: number;
  };
};

const exportTypes: { value: ExportType; label: string; detail: string }[] = [
  { value: "state_transactions", label: "Approved Transactions", detail: "Approved or exported invoices only" },
  { value: "review_queue", label: "Review Queue Items", detail: "Unresolved review and accounting items" },
  { value: "single_invoice", label: "Single Invoice", detail: "Full detail for one invoice" },
  { value: "threshold_summary", label: "Threshold Summary", detail: "Configured state exposure for the period" },
  { value: "rules_reference", label: "Rules Reference", detail: "Configured state rule reference" },
];

const months = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
] as const;

const years = ["2026", "2025", "2024"];

export default function ExportsPage() {
  const [data, setData] = useState<ExportData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [stateCode, setStateCode] = useState("all");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("05");
  const [quarter, setQuarter] = useState("Q2");
  const [half, setHalf] = useState("H1");
  const [customFrom, setCustomFrom] = useState("2026-01-01");
  const [customTo, setCustomTo] = useState("2026-12-31");
  const [exportType, setExportType] = useState<ExportType>("state_transactions");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [message, setMessage] = useState("Choose an accounting period, preview rows, then generate a CSV.");
  const [toastMessage, setToastMessage] = useState("");
  const [generatedCsv, setGeneratedCsv] = useState("");
  const [generatedFileName, setGeneratedFileName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/exports", { cache: "no-store" });
      const result = (await response.json()) as ExportData & { message?: string };
      if (!response.ok) {
        setLoadError(result.message ?? "Export data could not be loaded.");
        return;
      }
      setData(result);
      const requestedInvoice =
        typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("invoice") ?? "";
      if (requestedInvoice) {
        setInvoiceNumber(requestedInvoice);
        setExportType("single_invoice");
      } else if (!invoiceNumber && result.invoices.length) {
        setInvoiceNumber(result.invoices[0].invoiceNumber);
      }
    } catch {
      setLoadError("Export data could not be loaded. Check the local server and Supabase connection.");
    } finally {
      setIsLoading(false);
    }
  }, [invoiceNumber]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const period = useMemo(
    () => buildPeriod({ periodType, year, month, quarter, half, customFrom, customTo }),
    [customFrom, customTo, half, month, periodType, quarter, year]
  );

  const filteredInvoices = useMemo(() => {
    const invoices = data?.invoices ?? [];
    return invoices.filter((invoice) => {
      const matchesState = stateCode === "all" || invoice.shipToState === stateCode;
      const matchesStart = !period.dateFrom || invoice.invoiceDate >= period.dateFrom;
      const matchesEnd = !period.dateTo || invoice.invoiceDate <= period.dateTo;
      return matchesState && matchesStart && matchesEnd;
    });
  }, [data?.invoices, period.dateFrom, period.dateTo, stateCode]);

  const reviewedInvoices = useMemo(() => filteredInvoices.filter(isNormalExportEligible), [filteredInvoices]);
  const reviewQueueInvoices = useMemo(() => filteredInvoices.filter(isReviewQueueInvoice), [filteredInvoices]);
  const singleInvoice = useMemo(
    () => data?.invoices.find((invoice) => invoice.invoiceNumber === invoiceNumber) ?? null,
    [data?.invoices, invoiceNumber]
  );
  const periodStates = useMemo(
    () => buildPeriodStateSummaries(data?.states ?? [], reviewedInvoices),
    [data?.states, reviewedInvoices]
  );

  const previewRows = useMemo(() => {
    if (exportType === "single_invoice") return singleInvoice ? toLineRows([singleInvoice]) : [];
    if (exportType === "review_queue") return toLineRows(reviewQueueInvoices);
    if (exportType === "state_transactions") return toLineRows(reviewedInvoices);
    return [];
  }, [exportType, reviewedInvoices, reviewQueueInvoices, singleInvoice]);

  const previewCsv = useMemo(() => {
    if (!data) return "";
    if (exportType === "threshold_summary") return stateSummariesToCsv(periodStates);
    if (exportType === "rules_reference") return rulesToCsv(data.rules);
    if (exportType === "single_invoice") return invoiceLineItemsToCsv(singleInvoice ? [singleInvoice] : []);
    if (exportType === "review_queue") return invoiceLineItemsToCsv(reviewQueueInvoices);
    return invoiceLineItemsToCsv(reviewedInvoices);
  }, [data, exportType, periodStates, reviewQueueInvoices, reviewedInvoices, singleInvoice]);

  const previewCount =
    exportType === "threshold_summary"
      ? periodStates.length
      : exportType === "rules_reference"
        ? data?.rules.length ?? 0
        : previewRows.length;

  async function generateCsv(typeOverride?: ExportType) {
    const selectedExportType = typeOverride ?? exportType;
    setExportType(selectedExportType);
    setIsGenerating(true);
    setMessage("Generating accounting-period CSV and saving export metadata...");

    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: selectedExportType,
          stateCode: stateCode === "all" ? undefined : stateCode,
          dateFrom: period.dateFrom || undefined,
          dateTo: period.dateTo || undefined,
          periodType,
          periodLabel: period.label,
          invoiceNumber: selectedExportType === "single_invoice" ? invoiceNumber : undefined,
        }),
      });
      const result = (await response.json()) as {
        csv?: string;
        fileName?: string;
        rowCount?: number;
        invoiceCount?: number;
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
        `${readable(selectedExportType)} generated for ${period.label}: ${result.rowCount ?? 0} rows across ${result.invoiceCount ?? 0} records. ${
          result.exportHistorySaved ? "Export metadata saved to Supabase." : result.message ?? "Export metadata was not saved."
        }`
      );
      if (result.exportHistorySaved) setToastMessage(`${result.fileName ?? "Export"} saved to export history.`);
      await refreshData();
      return result.csv;
    } catch {
      setMessage("CSV could not be generated. Check the local server and Supabase connection.");
      return "";
    } finally {
      setIsGenerating(false);
    }
  }

  async function downloadCsv() {
    const csvToDownload = generatedCsv || (await generateCsv()) || previewCsv;
    const blob = new Blob([csvToDownload], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = generatedFileName || `nexuswatch-${exportType}-${period.fileToken}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToastMessage("CSV download prepared.");
  }

  async function copySummary() {
    const summary = `NexusWatch export: ${readable(exportType)} | Period: ${period.label} | State: ${stateCode === "all" ? "All states" : stateCode} | Preview rows: ${previewCount}`;
    await navigator.clipboard.writeText(summary);
    setMessage("Export summary copied to clipboard.");
  }

  return (
    <>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      <PageHeader
        title="Accounting Export Command Center"
        description="Generate monthly, quarterly, half-year, yearly, and custom transaction lists for accounting review."
      />

      {loadError ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {loadError}
        </div>
      ) : null}

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Approved Transactions" value={reviewedInvoices.length} detail={`${toLineRows(reviewedInvoices).length} line rows in period`} />
        <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Review Queue Items" value={reviewQueueInvoices.length} detail="Excluded from approved transaction export" tone="orange" />
        <MetricCard icon={<FileText className="h-5 w-5" />} label="Source Documents" value={data?.metrics.sourceDocumentsLinked ?? 0} detail="Linked PDF records in live data" tone="indigo" />
        <MetricCard icon={<FileCheck2 className="h-5 w-5" />} label="OCR Needs Review" value={data?.metrics.ocrNeedsReview ?? 0} detail="Review assistant records" tone="amber" />
      </section>

      <section className="mb-5 grid gap-4 xl:grid-cols-3">
        <QuickExportCard
          icon={<FileCheck2 className="h-5 w-5" />}
          title="Approved Period Transactions"
          detail="Approved/exported invoices only, filtered by accounting period and state."
          value={`${toLineRows(reviewedInvoices).length} rows`}
          onClick={() => generateCsv("state_transactions")}
          disabled={isGenerating || isLoading}
        />
        <QuickExportCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Review Queue Period Export"
          detail="Unresolved review, OCR, and accounting review items for cleanup."
          value={`${toLineRows(reviewQueueInvoices).length} rows`}
          onClick={() => generateCsv("review_queue")}
          disabled={isGenerating || isLoading}
          tone="orange"
        />
        <QuickExportCard
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title="Period Threshold Summary"
          detail="State exposure summary calculated from approved records in the selected period."
          value={`${periodStates.length} states`}
          onClick={() => generateCsv("threshold_summary")}
          disabled={isGenerating || isLoading}
          tone="indigo"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="premium-card p-5 xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-950 p-3 text-white">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-950">Accounting Period</h2>
              <p className="mt-1 text-xs text-slate-500">{period.label}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <SegmentedControl
              value={periodType}
              onChange={(value) => setPeriodType(value as PeriodType)}
              options={[
                ["monthly", "Monthly"],
                ["quarterly", "Quarterly"],
                ["half_year", "Half Year"],
                ["yearly", "Yearly"],
                ["custom", "Custom"],
              ]}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Year" value={year} onChange={setYear} options={years.map((item) => [item, item])} />
              {periodType === "monthly" ? <Select label="Month" value={month} onChange={setMonth} options={months.map(([value, label]) => [value, label])} /> : null}
              {periodType === "quarterly" ? <Select label="Quarter" value={quarter} onChange={setQuarter} options={[["Q1", "Q1"], ["Q2", "Q2"], ["Q3", "Q3"], ["Q4", "Q4"]]} /> : null}
              {periodType === "half_year" ? <Select label="Half Year" value={half} onChange={setHalf} options={[["H1", "Jan-Jun"], ["H2", "Jul-Dec"]]} /> : null}
            </div>

            {periodType === "custom" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DateInput label="From" value={customFrom} onChange={setCustomFrom} />
                <DateInput label="To" value={customTo} onChange={setCustomTo} />
              </div>
            ) : null}

            <Select
              label="State"
              value={stateCode}
              onChange={setStateCode}
              options={[["all", "All states"], ...(data?.rules ?? []).map((rule) => [rule.stateCode, `${rule.stateCode} - ${rule.stateName}`] as [string, string])]}
              icon={<MapPin className="h-4 w-4" />}
            />

            <Select
              label="Export Type"
              value={exportType}
              onChange={(value) => setExportType(value as ExportType)}
              options={exportTypes.map((type) => [type.value, type.label])}
              icon={<FileSpreadsheet className="h-4 w-4" />}
            />

            {exportType === "single_invoice" ? (
              <Select
                label="Invoice"
                value={invoiceNumber}
                onChange={setInvoiceNumber}
                options={(data?.invoices ?? []).map((invoice) => [invoice.invoiceNumber, `${invoice.invoiceNumber} - ${invoice.customerName}`])}
                icon={<Search className="h-4 w-4" />}
              />
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" disabled={isGenerating || isLoading} onClick={() => generateCsv()} className="primary-button px-3 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Generate
            </button>
            <button type="button" disabled={isGenerating || isLoading} onClick={downloadCsv} className="secondary-button px-3 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
              Download
            </button>
            <button type="button" onClick={copySummary} className="secondary-button px-3 py-3 text-sm">
              <Copy className="h-4 w-4" />
              Copy Summary
            </button>
            <button type="button" onClick={refreshData} className="secondary-button px-3 py-3 text-sm">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">{message}</p>
        </section>

        <section className="data-grid">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Live Export Preview</h2>
              <p className="mt-1 text-xs text-slate-500">
                {exportTypes.find((type) => type.value === exportType)?.detail}. Period: {period.label}.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
              {previewCount} rows
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading export data...
            </div>
          ) : exportType === "threshold_summary" ? (
            <StatePreview states={periodStates} />
          ) : exportType === "rules_reference" ? (
            <RulesPreview rules={data?.rules ?? []} />
          ) : previewRows.length ? (
            <TransactionPreview rows={previewRows} />
          ) : (
            <div className="px-5 py-12 text-center">
              <h3 className="text-sm font-semibold text-slate-950">No export rows found</h3>
              <p className="mt-2 text-sm text-slate-500">Adjust the accounting period, state, or export type.</p>
            </div>
          )}
        </section>
      </div>

      <RecentExports rows={data?.exports ?? []} onRefresh={refreshData} />
    </>
  );
}

function TransactionPreview({ rows }: { rows: ReturnType<typeof toLineRows> }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1120px] divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">Invoice</th>
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3">Customer</th>
            <th className="px-5 py-3">State</th>
            <th className="px-5 py-3">Category</th>
            <th className="px-5 py-3 text-right">Line Amount</th>
            <th className="px-5 py-3 text-right">Taxable</th>
            <th className="px-5 py-3">Review</th>
            <th className="px-5 py-3">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map(({ invoice, lineItem }) => (
            <tr key={`${invoice.id}-${lineItem.id}`} className="transition hover:bg-slate-50">
              <td className="px-5 py-4 font-semibold text-slate-950">{invoice.invoiceNumber}</td>
              <td className="px-5 py-4 text-slate-600">{formatDate(invoice.invoiceDate)}</td>
              <td className="px-5 py-4 text-slate-700">{invoice.customerName}</td>
              <td className="px-5 py-4 text-slate-600">{stateLabel(invoice.shipToState)}</td>
              <td className="px-5 py-4 capitalize text-slate-600">{lineItem.category}</td>
              <td className="px-5 py-4 text-right font-medium text-slate-800">{formatCurrency(lineItem.amount)}</td>
              <td className="px-5 py-4 text-right font-medium text-slate-800">{formatCurrency(lineItem.taxableAmount ?? 0)}</td>
              <td className="px-5 py-4"><StatusBadge status={invoice.reviewStatus} /></td>
              <td className="px-5 py-4 text-xs text-slate-500">{invoice.documentId || invoice.pdfFileName ? "Source linked" : "No source document linked"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatePreview({ states }: { states: StateNexusSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">State</th>
            <th className="px-5 py-3 text-right">Threshold</th>
            <th className="px-5 py-3 text-right">Taxable Total</th>
            <th className="px-5 py-3 text-right">Remaining</th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {states.map((state) => (
            <tr key={state.stateCode}>
              <td className="px-5 py-4 font-semibold text-slate-950">{state.stateName} ({state.stateCode})</td>
              <td className="px-5 py-4 text-right">{formatCurrency(state.thresholdAmount)}</td>
              <td className="px-5 py-4 text-right">{formatCurrency(state.taxableTotal)}</td>
              <td className="px-5 py-4 text-right">{formatCurrency(state.remaining)}</td>
              <td className="px-5 py-4"><StatusBadge status={state.status === "safe" ? "healthy" : state.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RulesPreview({ rules }: { rules: NexusRule[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">State</th>
            <th className="px-5 py-3 text-right">Threshold</th>
            <th className="px-5 py-3">SaaS</th>
            <th className="px-5 py-3">Hardware</th>
            <th className="px-5 py-3">Services</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td className="px-5 py-4 font-semibold text-slate-950">{rule.stateName} ({rule.stateCode})</td>
              <td className="px-5 py-4 text-right">{formatCurrency(rule.thresholdAmount)}</td>
              <td className="px-5 py-4">{rule.saasTaxable ? "Taxable" : "Excluded"}</td>
              <td className="px-5 py-4">{rule.hardwareTaxable ? "Taxable" : "Excluded"}</td>
              <td className="px-5 py-4">{rule.servicesTaxable ? "Taxable" : "Excluded"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, tone = "green" }: { icon: ReactNode; label: string; value: number; detail: string; tone?: "green" | "orange" | "indigo" | "amber" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  }[tone];
  return (
    <div className="premium-card p-5">
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${tones}`}>{icon}</span>
      <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-black text-slate-950">{value.toLocaleString()}</div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div>
    </div>
  );
}

function QuickExportCard({ icon, title, detail, value, onClick, disabled, tone = "green" }: { icon: ReactNode; title: string; detail: string; value: string; onClick: () => void; disabled: boolean; tone?: "green" | "orange" | "indigo" }) {
  const tones = {
    green: "bg-emerald-600 hover:bg-emerald-700",
    orange: "bg-orange-600 hover:bg-orange-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
  }[tone];
  return (
    <div className="premium-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">{icon}</span>
        <div>
          <h2 className="font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-700">{value}</span>
        <button type="button" disabled={disabled} onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${tones}`}>
          Generate
        </button>
      </div>
    </div>
  );
}

function SegmentedControl({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          className={`rounded-xl px-3 py-2 text-xs font-black ring-1 ${
            value === optionValue ? "bg-indigo-50 text-indigo-700 ring-indigo-200" : "bg-white text-slate-600 ring-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Select({ label, value, onChange, options, icon }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][]; icon?: ReactNode }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <span className="relative mt-1 block">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span> : null}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4 ${icon ? "pl-10" : ""}`}
        >
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
      />
    </label>
  );
}

function RecentExports({ rows, onRefresh }: { rows: ExportHistory[]; onRefresh: () => void }) {
  return (
    <section className="data-grid mt-6">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-black text-slate-950">Recent Export Metadata</h2>
        <button className="secondary-button px-3 py-2 text-sm" type="button" onClick={onRefresh}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Export Type</th>
                <th className="px-5 py-3">Scope</th>
                <th className="px-5 py-3 text-right">Rows</th>
                <th className="px-5 py-3">File Name</th>
                <th className="px-5 py-3">Date Range</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-black text-slate-950">{readable(row.exportType)}</td>
                  <td className="px-5 py-4 text-slate-700">{row.stateCode ?? "All states"}</td>
                  <td className="px-5 py-4 text-right font-black text-slate-950">{row.rowCount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-slate-700">{row.fileName ?? "CSV export"}</td>
                  <td className="px-5 py-4 text-slate-700">{row.dateFrom ?? "Any"} to {row.dateTo ?? "Any"}</td>
                  <td className="px-5 py-4 text-slate-700">{formatDate(row.createdAt ?? undefined)}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-10 text-sm text-slate-500">No export metadata saved yet.</div>
      )}
    </section>
  );
}

function toLineRows(invoices: Invoice[]) {
  return invoices.flatMap((invoice) => invoice.lineItems.map((lineItem) => ({ invoice, lineItem })));
}

function buildPeriod({
  periodType,
  year,
  month,
  quarter,
  half,
  customFrom,
  customTo,
}: {
  periodType: PeriodType;
  year: string;
  month: string;
  quarter: string;
  half: string;
  customFrom: string;
  customTo: string;
}) {
  if (periodType === "custom") {
    return {
      dateFrom: customFrom,
      dateTo: customTo,
      label: `${customFrom || "Any"} to ${customTo || "Any"}`,
      fileToken: `${customFrom || "any"}_${customTo || "any"}`,
    };
  }
  if (periodType === "yearly") {
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31`, label: `Year ${year}`, fileToken: year };
  }
  if (periodType === "half_year") {
    const isFirst = half === "H1";
    return {
      dateFrom: `${year}-${isFirst ? "01" : "07"}-01`,
      dateTo: `${year}-${isFirst ? "06-30" : "12-31"}`,
      label: `${half} ${year}`,
      fileToken: `${half.toLowerCase()}_${year}`,
    };
  }
  if (periodType === "quarterly") {
    const ranges: Record<string, [string, string, string]> = {
      Q1: ["01-01", "03-31", "Q1"],
      Q2: ["04-01", "06-30", "Q2"],
      Q3: ["07-01", "09-30", "Q3"],
      Q4: ["10-01", "12-31", "Q4"],
    };
    const [from, to, label] = ranges[quarter] ?? ranges.Q1;
    return { dateFrom: `${year}-${from}`, dateTo: `${year}-${to}`, label: `${label} ${year}`, fileToken: `${label.toLowerCase()}_${year}` };
  }
  const monthName = months.find(([value]) => value === month)?.[1] ?? "Month";
  const lastDay = new Date(Number(year), Number(month), 0).getDate().toString().padStart(2, "0");
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${lastDay}`,
    label: `${monthName} ${year}`,
    fileToken: `${year}_${month}`,
  };
}

function buildPeriodStateSummaries(states: StateNexusSummary[], reviewedInvoices: Invoice[]) {
  return states.map((state) => {
    const stateInvoices = reviewedInvoices.filter((invoice) => invoice.shipToState === state.stateCode);
    const taxableTotal = stateInvoices.reduce((sum, invoice) => sum + invoice.taxableAmount, 0);
    const invoiceTotal = stateInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const percentUsed = state.thresholdAmount > 0 ? (taxableTotal / state.thresholdAmount) * 100 : 0;
    const status: StateNexusSummary["status"] =
      percentUsed >= 100 ? "crossed" : percentUsed >= 90 ? "warning" : percentUsed >= 75 ? "watch" : "safe";
    return {
      ...state,
      taxableTotal,
      invoiceTotal,
      excludedTotal: invoiceTotal - taxableTotal,
      percentUsed,
      remaining: Math.max(state.thresholdAmount - taxableTotal, 0),
      status,
      nextAction: status === "safe" ? "Continue monitoring" : "Review period transactions with accounting",
    };
  });
}

function readable(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
