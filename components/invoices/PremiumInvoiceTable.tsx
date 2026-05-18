"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  FileCheck2,
  FileQuestion,
  FileText,
  FilterX,
  Mail,
  Search,
  Server,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatPercent, stateLabel } from "@/lib/format";
import {
  buildInvoiceThresholdImpact,
  getInvoiceActivityDate,
  getOperationalStatus,
  hasSourceDocument,
  hasUnknownCategory,
  isDraftInvoice,
  isLargeInvoice,
  isMissingFieldInvoice,
  isOcrReviewInvoice,
  isReviewQueueInvoice,
  isReviewedInvoice,
  isThresholdWarningInvoice,
} from "@/lib/thresholdImpact";
import type { Invoice, NexusRule } from "@/types";

type Segment =
  | "all"
  | "draft"
  | "needs_review"
  | "accounting_review"
  | "approved"
  | "ocr_needs_review"
  | "source_document"
  | "missing_fields"
  | "threshold_warning"
  | "crossed"
  | "large_invoice"
  | "unknown_category";

type SortKey = "invoice_date" | "amount" | "risk" | "updated_date";

const SEGMENTS: { id: Segment; label: string; icon: typeof FileText }[] = [
  { id: "all", label: "All Invoices", icon: FileText },
  { id: "draft", label: "Draft", icon: FileText },
  { id: "needs_review", label: "Needs Review", icon: AlertTriangle },
  { id: "accounting_review", label: "Accounting Review", icon: Search },
  { id: "approved", label: "Approved / Reviewed", icon: ShieldCheck },
  { id: "ocr_needs_review", label: "OCR Needs Review", icon: FileCheck2 },
  { id: "source_document", label: "Source Document Linked", icon: CloudUpload },
  { id: "missing_fields", label: "Missing Fields", icon: FileQuestion },
  { id: "threshold_warning", label: "Threshold Warning", icon: AlertTriangle },
  { id: "crossed", label: "Above Configured Threshold", icon: AlertTriangle },
  { id: "large_invoice", label: "Large Invoice", icon: AlertTriangle },
  { id: "unknown_category", label: "Unknown Category", icon: FileQuestion },
];

export function PremiumInvoiceTable({ invoices, rules }: { invoices: Invoice[]; rules: NexusRule[] }) {
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_date");
  const [activeSegment, setActiveSegment] = useState<Segment>("all");
  const [savedViewMessage, setSavedViewMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    const source = params.get("source");
    const queryParam = params.get("q");
    if (queryParam) setSearch(queryParam);
    if (filter && SEGMENTS.some((segment) => segment.id === filter)) {
      setActiveSegment(filter as Segment);
      return;
    }
    if (source === "document") {
      setActiveSegment("source_document");
      return;
    }
    try {
      const raw = window.localStorage.getItem("nexuswatch_invoices_saved_view");
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<{
        segment: Segment;
        search: string;
        stateFilter: string;
        sourceFilter: string;
        reviewStatusFilter: string;
        sortKey: SortKey;
      }>;
      if (saved.segment && SEGMENTS.some((segment) => segment.id === saved.segment)) {
        setActiveSegment(saved.segment);
      }
      if (typeof saved.search === "string") setSearch(saved.search);
      if (typeof saved.stateFilter === "string") setStateFilter(saved.stateFilter);
      if (typeof saved.sourceFilter === "string") setSourceFilter(saved.sourceFilter);
      if (typeof saved.reviewStatusFilter === "string") setReviewStatusFilter(saved.reviewStatusFilter);
      if (saved.sortKey === "invoice_date" || saved.sortKey === "amount" || saved.sortKey === "risk" || saved.sortKey === "updated_date") {
        setSortKey(saved.sortKey);
      }
    } catch {
      // Ignore unreadable saved view; fall back to defaults.
    }
  }, []);

  const enriched = useMemo(
    () =>
      invoices.map((invoice) => ({
        invoice,
        impact: buildInvoiceThresholdImpact(invoice, invoices, rules),
      })),
    [invoices, rules]
  );

  const states = useMemo(
    () =>
      Array.from(
        new Set(invoices.map((invoice) => invoice.shipToState).filter((state): state is string => Boolean(state)))
      ).sort(),
    [invoices]
  );

  const sources = useMemo(
    () => Array.from(new Set(invoices.map((invoice) => getSourceLabel(invoice)))).sort(),
    [invoices]
  );

  const reviewStatuses = useMemo(
    () => Array.from(new Set(invoices.map((invoice) => invoice.reviewStatus))).sort(),
    [invoices]
  );

  const counts = useMemo(
    () => ({
      all: invoices.length,
      draft: invoices.filter(isDraftInvoice).length,
      needs_review: invoices.filter(isReviewQueueInvoice).length,
      accounting_review: invoices.filter((invoice) => invoice.reviewStatus === "accounting_review").length,
      approved: invoices.filter(isReviewedInvoice).length,
      ocr_needs_review: invoices.filter(isOcrReviewInvoice).length,
      source_document: invoices.filter(hasSourceDocument).length,
      missing_fields: invoices.filter(isMissingFieldInvoice).length,
      threshold_warning: invoices.filter((invoice) => isThresholdWarningInvoice(invoice, invoices, rules)).length,
      crossed: enriched.filter(({ impact }) => impact.thresholdStatus === "crossed").length,
      large_invoice: invoices.filter(isLargeInvoice).length,
      unknown_category: invoices.filter(hasUnknownCategory).length,
    }),
    [enriched, invoices, rules]
  );

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enriched
      .filter(({ invoice, impact }) => {
        const searchable = [
          invoice.invoiceNumber,
          invoice.customerName,
          invoice.shipToState,
          invoice.billToState,
          invoice.reviewStatus,
          getOperationalStatus(invoice),
          invoice.extractionStatus,
          formatCurrency(invoice.totalAmount),
          formatCurrency(invoice.taxableAmount),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = !query || searchable.includes(query);
        const matchesState = stateFilter === "all" || invoice.shipToState === stateFilter;
        const matchesSource = sourceFilter === "all" || getSourceLabel(invoice) === sourceFilter;
        const matchesReviewStatus = reviewStatusFilter === "all" || invoice.reviewStatus === reviewStatusFilter;
        const matchesSegment = segmentMatches(invoice, activeSegment, impact.thresholdStatus, invoices, rules);

        return matchesSearch && matchesState && matchesSource && matchesReviewStatus && matchesSegment;
      })
      .sort((a, b) => compareInvoices(a, b, sortKey))
      .map(({ invoice }) => invoice);
  }, [activeSegment, enriched, invoices, reviewStatusFilter, rules, search, sortKey, sourceFilter, stateFilter]);

  function clearFilters() {
    setSearch("");
    setStateFilter("all");
    setSourceFilter("all");
    setReviewStatusFilter("all");
    setSortKey("updated_date");
    setActiveSegment("all");
    setSavedViewMessage("");
    try {
      window.localStorage.removeItem("nexuswatch_invoices_saved_view");
    } catch {
      // Ignore storage unavailability.
    }
  }

  function saveView() {
    const label = SEGMENTS.find((segment) => segment.id === activeSegment)?.label ?? "Current view";
    try {
      window.localStorage.setItem(
        "nexuswatch_invoices_saved_view",
        JSON.stringify({
          segment: activeSegment,
          search,
          stateFilter,
          sourceFilter,
          reviewStatusFilter,
          sortKey,
        })
      );
      setSavedViewMessage(`${label} saved. Filters will restore next time you open Invoices.`);
    } catch {
      setSavedViewMessage(`${label} could not be saved (local storage unavailable).`);
    }
  }

  function syncHorizontalScroll(source: "top" | "table") {
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    if (!top || !table) return;
    const maxTop = Math.max(top.scrollWidth - top.clientWidth, 1);
    const maxTable = Math.max(table.scrollWidth - table.clientWidth, 1);

    if (source === "top") {
      const next = (top.scrollLeft / maxTop) * maxTable;
      if (Math.abs(table.scrollLeft - next) > 1) table.scrollLeft = next;
    }
    if (source === "table") {
      const next = (table.scrollLeft / maxTable) * maxTop;
      if (Math.abs(top.scrollLeft - next) > 1) top.scrollLeft = next;
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.35rem] border border-indigo-950/10 bg-[radial-gradient(circle_at_10%_20%,rgba(49,46,129,0.95),rgba(15,23,42,0.98)_48%,rgba(17,24,39,1))] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-6">
          <HeroMetric icon={FileText} label="Total Invoices" value={counts.all} detail="Live invoice records" tone="cyan" />
          <HeroMetric icon={AlertTriangle} label="Needs Review" value={counts.needs_review} detail="Unresolved review items" tone="amber" />
          <HeroMetric icon={Search} label="Accounting Review" value={counts.accounting_review} detail="In accounting queue" tone="sky" />
          <HeroMetric icon={ShieldCheck} label="Approved / Reviewed" value={counts.approved} detail="Ready for reviewed export" tone="emerald" />
          <HeroMetric icon={FileCheck2} label="OCR Needs Review" value={counts.ocr_needs_review} detail="OCR assisted records" tone="violet" />
          <HeroMetric icon={CloudUpload} label="Source Documents" value={counts.source_document} detail="Linked PDF records" tone="violet" last />
        </div>
      </section>

      <section className="premium-card p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_150px_160px_190px_170px_120px_150px]">
          <label className="relative block">
            <span className="sr-only">Search invoices</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none ring-blue-100 placeholder:text-slate-400 focus:ring-4"
              placeholder="Search invoice, customer, state, status, or amount..."
            />
          </label>
          <FilterSelect value={stateFilter} onChange={setStateFilter} options={states.map((state) => ({ label: state, value: state }))} defaultLabel="All States" />
          <FilterSelect value={sourceFilter} onChange={setSourceFilter} options={sources.map((source) => ({ label: source, value: source }))} defaultLabel="All Sources" />
          <FilterSelect
            value={reviewStatusFilter}
            onChange={setReviewStatusFilter}
            options={reviewStatuses.map((status) => ({ label: readable(status), value: status }))}
            defaultLabel="All Review Status"
          />
          <FilterSelect
            value={sortKey}
            onChange={(value) => setSortKey(value as SortKey)}
            options={[
              { label: "Invoice Date", value: "invoice_date" },
              { label: "Amount", value: "amount" },
              { label: "Risk", value: "risk" },
              { label: "Updated Date", value: "updated_date" },
            ]}
            defaultLabel="Sort By"
            includeDefault={false}
          />
          <button className="secondary-button h-11 justify-center px-4" type="button" onClick={clearFilters}>
            <FilterX className="h-4 w-4" />
            Clear
          </button>
          <button className="secondary-button h-11 justify-center px-4" type="button" onClick={saveView}>
            <CheckCircle2 className="h-4 w-4" />
            Save View
          </button>
        </div>
        {savedViewMessage ? <p className="mt-3 text-xs font-medium text-emerald-700">{savedViewMessage}</p> : null}
      </section>

      <section className="flex gap-3 overflow-x-auto pb-1">
        {SEGMENTS.map((segment) => {
          const Icon = segment.icon;
          const active = activeSegment === segment.id;

          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => setActiveSegment(segment.id)}
              className={`flex min-w-[190px] items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition ${
                active
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {segment.label}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                {counts[segment.id]}
              </span>
            </button>
          );
        })}
      </section>

      <section className="data-grid overflow-hidden rounded-[1.15rem]">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <ArrowUpDown className="h-4 w-4" />
            Sorted by {readable(sortKey)}
          </span>
        </div>
        <div
          ref={topScrollRef}
          onScroll={() => syncHorizontalScroll("top")}
          className="overflow-x-auto border-b border-slate-200 bg-slate-50/80 py-2"
          aria-label="Scroll invoice columns"
        >
          <div className="h-2 min-w-[1540px]" />
        </div>
        <div ref={tableScrollRef} onScroll={() => syncHorizontalScroll("table")} className="overflow-x-auto">
          <table className="min-w-[1540px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50/95 px-4 py-4 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]">Invoice</th>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Invoice Date</th>
                <th className="px-4 py-4">Ship To</th>
                <th className="px-4 py-4">Bill To</th>
                <th className="px-4 py-4 text-right">Total</th>
                <th className="px-4 py-4 text-right">Taxable</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Review</th>
                <th className="px-4 py-4">Extraction</th>
                <th className="px-4 py-4">Source Document</th>
                <th className="px-4 py-4">Risk</th>
                <th className="px-4 py-4">Threshold Impact</th>
                <th className="px-4 py-4">Next Action</th>
                <th className="px-4 py-4">Updated</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredInvoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} invoices={invoices} rules={rules} />
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-950">
              {invoices.length === 0 ? "No live invoices yet." : "No invoices match this filter."}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {invoices.length === 0 ? "No invoices yet. Upload or enter an invoice to begin monitoring." : "Clear filters or search for a different invoice."}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function InvoiceRow({ invoice, invoices, rules }: { invoice: Invoice; invoices: Invoice[]; rules: NexusRule[] }) {
  const impact = buildInvoiceThresholdImpact(invoice, invoices, rules);
  const sourceLinked = hasSourceDocument(invoice);
  const SourceIcon = getSourceIcon(invoice);
  const thresholdUnavailable = !invoice.shipToState || impact.thresholdAmount <= 0;

  return (
    <tr className={`transition hover:bg-slate-50 ${impact.thresholdStatus === "crossed" ? "bg-red-50/35" : ""}`}>
      <td className="sticky left-0 z-10 bg-inherit px-4 py-4 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]">
        <Link className="font-bold text-blue-700 hover:text-blue-900" href={`/invoices/${invoice.id}`}>
          {invoice.invoiceNumber}
        </Link>
        {impact.thresholdCrossingRisk ? (
          <div className="mt-1 w-fit rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
            Crossing risk
          </div>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <div className="font-bold text-slate-950">{invoice.customerName || "Missing customer"}</div>
        <div className="mt-0.5 text-xs text-slate-500">{customerId(invoice)}</div>
      </td>
      <td className="px-4 py-4 text-slate-700">{formatDate(invoice.invoiceDate)}</td>
      <td className="px-4 py-4 text-slate-700">{stateLabel(invoice.shipToState)}</td>
      <td className="px-4 py-4 text-slate-700">{stateLabel(invoice.billToState)}</td>
      <td className="px-4 py-4 text-right font-semibold text-slate-800">{formatCurrency(invoice.totalAmount)}</td>
      <td className="px-4 py-4 text-right font-bold text-slate-950">{formatCurrency(invoice.taxableAmount)}</td>
      <td className="px-4 py-4">
        <OperationalPill value={readable(getOperationalStatus(invoice))} tone={getOperationalStatus(invoice) === "draft" ? "slate" : "green"} />
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={invoice.reviewStatus} />
      </td>
      <td className="px-4 py-4">
        {invoice.extractionStatus ? <StatusBadge status={invoice.extractionStatus} /> : <span className="text-xs text-slate-500">No extraction status</span>}
      </td>
      <td className="px-4 py-4">
        {invoice.pdfPublicUrl ? (
          <a
            href={invoice.pdfPublicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-900"
            title={invoice.pdfFileName ?? "Open source PDF"}
          >
            <SourceIcon className="h-4 w-4" />
            {getSourceLabel(invoice)}
          </a>
        ) : sourceLinked ? (
          <Link
            href={`/invoices/${invoice.id}`}
            className="inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-900"
          >
            <SourceIcon className="h-4 w-4" />
            {getSourceLabel(invoice)}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 text-slate-500">
            <SourceIcon className="h-4 w-4 text-slate-400" />
            No source document linked
          </span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={impact.riskStatus} />
          {invoice.flags.slice(0, 2).map((flag) => (
            <StatusBadge key={flag} status={flag} />
          ))}
          {isOcrReviewInvoice(invoice) ? <StatusBadge status="ocr_needs_review" /> : null}
        </div>
      </td>
      <td className="px-4 py-4">
        {thresholdUnavailable ? (
          <span className="text-xs font-medium text-slate-500">Threshold preview unavailable. Review invoice fields and state rule.</span>
        ) : (
          <ThresholdPill state={invoice.shipToState} percent={impact.percentAfterInvoice} status={impact.thresholdStatus} />
        )}
      </td>
      <td className="px-4 py-4 text-sm font-medium text-slate-700">{impact.recommendedNextAction}</td>
      <td className="px-4 py-4 text-slate-700">
        <div>{formatDate(getInvoiceActivityDate(invoice))}</div>
        <div className="text-xs text-slate-500">{invoice.updatedAt ? "Updated" : invoice.createdAt ? "Created" : "Invoice activity"}</div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <Link className="secondary-button px-3 py-2 text-xs" href={`/invoices/${invoice.id}`}>
            View Invoice
          </Link>
          <Link className="secondary-button px-3 py-2 text-xs" href={`/exports?invoice=${encodeURIComponent(invoice.invoiceNumber)}`}>
            Export
          </Link>
        </div>
      </td>
    </tr>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  last,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  detail: string;
  tone: "cyan" | "amber" | "sky" | "emerald" | "violet";
  last?: boolean;
}) {
  const toneClass = {
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
    emerald: "text-emerald-300",
    violet: "text-violet-300",
  }[tone];

  return (
    <div className={`flex gap-4 ${last ? "" : "xl:border-r xl:border-white/15 xl:pr-5"}`}>
      <Icon className={`mt-1 h-8 w-8 shrink-0 ${toneClass}`} />
      <div>
        <div className="text-3xl font-black tracking-tight">{value.toLocaleString()}</div>
        <div className="mt-1 text-sm font-bold text-white">{label}</div>
        <div className="mt-1 text-xs text-indigo-100/75">{detail}</div>
      </div>
    </div>
  );
}

function ThresholdPill({ state, percent, status }: { state?: string | null; percent: number; status: string }) {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const crossed = status === "crossed" || safePercent >= 100;
  const warning = status === "warning" || safePercent >= 90;
  const watch = status === "watch" || safePercent >= 75;
  const tone = crossed
    ? "bg-red-50 text-red-700 ring-red-200"
    : warning
      ? "bg-orange-50 text-orange-700 ring-orange-200"
      : watch
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone}`}>
      {stateLabel(state)} {formatPercent(safePercent)}
    </span>
  );
}

function OperationalPill({ value, tone }: { value: string; tone: "green" | "slate" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
        tone === "green"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {value}
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  defaultLabel,
  includeDefault = true,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  defaultLabel: string;
  includeDefault?: boolean;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{defaultLabel}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-9 text-sm font-medium text-slate-800 outline-none ring-blue-100 focus:ring-4"
      >
        {includeDefault ? <option value="all">{defaultLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function segmentMatches(invoice: Invoice, segment: Segment, thresholdStatus: string, invoices: Invoice[], rules: NexusRule[]) {
  if (segment === "all") return true;
  if (segment === "draft") return isDraftInvoice(invoice);
  if (segment === "needs_review") return isReviewQueueInvoice(invoice);
  if (segment === "accounting_review") return invoice.reviewStatus === "accounting_review";
  if (segment === "approved") return isReviewedInvoice(invoice);
  if (segment === "ocr_needs_review") return isOcrReviewInvoice(invoice);
  if (segment === "source_document") return hasSourceDocument(invoice);
  if (segment === "missing_fields") return isMissingFieldInvoice(invoice);
  if (segment === "threshold_warning") return isThresholdWarningInvoice(invoice, invoices, rules);
  if (segment === "crossed") return thresholdStatus === "crossed";
  if (segment === "large_invoice") return isLargeInvoice(invoice);
  return hasUnknownCategory(invoice);
}

function getSourceLabel(invoice: Invoice) {
  if (invoice.extractionStatus === "ocr_needs_review") return "OCR Extract";
  if (hasSourceDocument(invoice)) return "PDF Upload";
  if (invoice.sourceType === "paste") return "Paste Text";
  if (invoice.sourceType === "pdf_preview") return "PDF Upload";
  return "Manual Entry";
}

function getSourceIcon(invoice: Invoice) {
  const label = getSourceLabel(invoice);
  if (label === "OCR Extract") return Server;
  if (label === "PDF Upload") return CloudUpload;
  if (label === "Paste Text") return Mail;
  return UploadCloud;
}

function compareInvoices(
  a: { invoice: Invoice; impact: ReturnType<typeof buildInvoiceThresholdImpact> },
  b: { invoice: Invoice; impact: ReturnType<typeof buildInvoiceThresholdImpact> },
  sortKey: SortKey
) {
  if (sortKey === "amount") return b.invoice.totalAmount - a.invoice.totalAmount;
  if (sortKey === "risk") return riskRank(b.impact) - riskRank(a.impact);
  if (sortKey === "updated_date") return getInvoiceActivityDate(b.invoice).localeCompare(getInvoiceActivityDate(a.invoice));
  return (b.invoice.invoiceDate || "").localeCompare(a.invoice.invoiceDate || "");
}

function riskRank(impact: ReturnType<typeof buildInvoiceThresholdImpact>) {
  if (impact.thresholdStatus === "crossed" || impact.thresholdCrossingRisk) return 4;
  if (impact.warning90) return 3;
  if (impact.watch75) return 2;
  if (impact.riskReasons.length) return 1;
  return 0;
}

function customerId(invoice: Invoice) {
  const digits = invoice.invoiceNumber.replace(/\D/g, "").slice(-5).padStart(5, "0");
  return `ID: CUS-${digits}`;
}

function readable(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
