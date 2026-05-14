"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CloudUpload,
  FileCheck2,
  FileText,
  Filter,
  Mail,
  MoreVertical,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatPercent, stateLabel } from "@/lib/format";
import type { Invoice } from "@/types";

type Segment = "all" | "needs_review" | "accounting_review" | "approved" | "ocr_needs_review" | "draft";

const STATE_IMPACT: Record<string, number> = {
  TX: 118.2,
  IL: 96,
  CA: 16,
  NY: 12.8,
  WA: 10.6,
};

const SEGMENTS: { id: Segment; label: string; icon: typeof FileText }[] = [
  { id: "all", label: "All Invoices", icon: FileText },
  { id: "needs_review", label: "Needs Review", icon: AlertTriangle },
  { id: "accounting_review", label: "Accounting Review", icon: Search },
  { id: "approved", label: "Approved", icon: ShieldCheck },
  { id: "ocr_needs_review", label: "OCR Needs Review", icon: FileCheck2 },
  { id: "draft", label: "Draft", icon: FileText },
];

export function PremiumInvoiceTable({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [activeSegment, setActiveSegment] = useState<Segment>("all");

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
      needs_review: invoices.filter((invoice) => invoice.reviewStatus === "needs_review" || invoice.flags.length > 0).length,
      accounting_review: invoices.filter((invoice) => invoice.reviewStatus === "accounting_review").length,
      approved: invoices.filter((invoice) => invoice.reviewStatus === "approved" || invoice.reviewStatus === "exported").length,
      ocr_needs_review: invoices.filter((invoice) => invoice.extractionStatus === "ocr_needs_review").length,
      draft: invoices.filter((invoice) => invoice.reviewStatus === "draft").length,
      sourceDocuments: invoices.filter(
        (invoice) => invoice.documentId || invoice.pdfFileName || invoice.pdfPublicUrl || invoice.sourceDocument
      ).length,
    }),
    [invoices]
  );

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const amountText = `${invoice.totalAmount} ${invoice.taxableAmount}`;
      const matchesSearch =
        !query ||
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.customerName.toLowerCase().includes(query) ||
        amountText.includes(query);
      const matchesState = stateFilter === "all" || invoice.shipToState === stateFilter;
      const matchesSource = sourceFilter === "all" || getSourceLabel(invoice) === sourceFilter;
      const matchesReviewStatus = reviewStatusFilter === "all" || invoice.reviewStatus === reviewStatusFilter;
      const matchesSegment = segmentMatches(invoice, activeSegment);

      return matchesSearch && matchesState && matchesSource && matchesReviewStatus && matchesSegment;
    });
  }, [activeSegment, invoices, reviewStatusFilter, search, sourceFilter, stateFilter]);

  const highRiskTotal = invoices
    .filter((invoice) => invoice.riskStatus === "crossed" || invoice.flags.includes("may_cross_threshold"))
    .reduce((sum, invoice) => sum + invoice.taxableAmount, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-[1.35rem] border border-indigo-950/10 bg-[radial-gradient(circle_at_10%_20%,rgba(49,46,129,0.95),rgba(15,23,42,0.98)_48%,rgba(17,24,39,1))] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="grid gap-5 md:grid-cols-5">
            <HeroMetric icon={FileText} label="Total Invoices" value={counts.all} detail="All time" tone="cyan" />
            <HeroMetric icon={AlertTriangle} label="Needs Review" value={counts.needs_review} detail="Awaiting attention" tone="amber" />
            <HeroMetric icon={Search} label="Accounting Review" value={counts.accounting_review} detail="In accounting queue" tone="sky" />
            <HeroMetric icon={ShieldCheck} label="Approved" value={counts.approved} detail="Ready and complete" tone="emerald" />
            <HeroMetric icon={FileCheck2} label="Source Documents Linked" value={counts.sourceDocuments} detail="With verified sources" tone="violet" last />
          </div>
        </div>

        <aside className="premium-card flex min-h-[164px] flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-950">AI Insight</h2>
                <p className="text-xs text-slate-500">Decision support summary</p>
              </div>
            </div>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
              New
            </span>
          </div>
          <p className="mt-4 text-sm font-medium leading-6 text-slate-700">
            {counts.needs_review} invoices totaling {formatCurrency(highRiskTotal || 0)} need review before they are included in approved exports.
          </p>
          <Link className="secondary-button mt-4 justify-center px-4 py-2 text-indigo-700" href="/ai-brief">
            <Sparkles className="h-4 w-4" />
            View AI Insights
          </Link>
        </aside>
      </section>

      <section className="premium-card p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_160px_160px_190px_120px_150px]">
          <label className="relative block">
            <span className="sr-only">Search invoices</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none ring-blue-100 placeholder:text-slate-400 focus:ring-4"
              placeholder="Search by invoice number, customer, or amount..."
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
          <button className="secondary-button h-11 justify-center px-4" type="button">
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button className="secondary-button h-11 justify-center px-4" type="button">
            <FileCheck2 className="h-4 w-4" />
            Saved Views
          </button>
        </div>
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
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 px-5 py-4">
                  <input className="h-4 w-4 rounded border-slate-300" type="checkbox" aria-label="Select all invoices" />
                </th>
                <th className="px-4 py-4">Invoice Number</th>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Ship To</th>
                <th className="px-4 py-4">Bill To</th>
                <th className="px-4 py-4 text-right">Taxable Amount</th>
                <th className="px-4 py-4">Threshold Impact</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Review Status</th>
                <th className="px-4 py-4">Last Updated</th>
                <th className="w-12 px-4 py-4 text-center">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredInvoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-950">No invoices match this view</h3>
            <p className="mt-1 text-sm text-slate-500">Clear a filter or search for a different invoice number.</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>
            Showing 1 to {filteredInvoices.length} of {filteredInvoices.length} invoices
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <button className="secondary-button px-3 py-2" type="button">
              25 per page
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((page) => (
                <button
                  key={page}
                  className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-bold ${
                    page === 1 ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  type="button"
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const impact = getImpactPercent(invoice);
  const isHero = invoice.invoiceNumber === "INV-1048" || invoice.flags.includes("may_cross_threshold");
  const SourceIcon = getSourceIcon(invoice);

  return (
    <tr className={`transition hover:bg-slate-50 ${isHero ? "bg-red-50/45" : ""}`}>
      <td className="px-5 py-4">
        <input className="h-4 w-4 rounded border-slate-300" type="checkbox" aria-label={`Select ${invoice.invoiceNumber}`} />
      </td>
      <td className="px-4 py-4">
        <Link className="font-bold text-blue-700 hover:text-blue-900" href={`/invoices/${invoice.id}`}>
          {invoice.invoiceNumber}
        </Link>
        {isHero ? (
          <div className="mt-1 w-fit rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
            May Push Threshold
          </div>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <div className="font-bold text-slate-950">{invoice.customerName}</div>
        <div className="mt-0.5 text-xs text-slate-500">{customerId(invoice)}</div>
      </td>
      <td className="px-4 py-4 text-slate-700">
        <div>{invoice.customerName}</div>
        <div className="text-xs text-slate-500">{stateLabel(invoice.shipToState)}</div>
      </td>
      <td className="px-4 py-4 text-slate-700">
        <div>{invoice.customerName}</div>
        <div className="text-xs text-slate-500">{stateLabel(invoice.billToState)}</div>
      </td>
      <td className="px-4 py-4 text-right font-bold text-slate-950">{formatCurrency(invoice.taxableAmount)}</td>
      <td className="px-4 py-4">
        <ThresholdPill state={invoice.shipToState} percent={impact} risk={invoice.riskStatus} />
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex items-center gap-2 text-slate-700">
          <SourceIcon className="h-4 w-4 text-indigo-500" />
          {getSourceLabel(invoice)}
        </span>
      </td>
      <td className="px-4 py-4">
        <OperationalPill value={invoice.reviewStatus === "draft" ? "Draft" : "Posted"} tone={invoice.reviewStatus === "draft" ? "slate" : "green"} />
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={invoice.reviewStatus} />
      </td>
      <td className="px-4 py-4 text-slate-700">
        <div>{formatDate(invoice.invoiceDate)}</div>
        <div className="text-xs text-slate-500">Invoice activity</div>
      </td>
      <td className="px-4 py-4 text-center">
        <Link
          className="inline-grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          href={`/invoices/${invoice.id}`}
          aria-label={`Open ${invoice.invoiceNumber}`}
        >
          <MoreVertical className="h-4 w-4" />
        </Link>
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
    <div className={`flex gap-4 ${last ? "" : "md:border-r md:border-white/15 md:pr-5"}`}>
      <Icon className={`mt-1 h-8 w-8 shrink-0 ${toneClass}`} />
      <div>
        <div className="text-3xl font-black tracking-tight">{value.toLocaleString()}</div>
        <div className="mt-1 text-sm font-bold text-white">{label}</div>
        <div className="mt-1 text-xs text-indigo-100/75">{detail}</div>
      </div>
    </div>
  );
}

function ThresholdPill({
  state,
  percent,
  risk,
}: {
  state?: string | null;
  percent: number;
  risk: Invoice["riskStatus"];
}) {
  const crossed = risk === "crossed" || percent >= 100;
  const warning = risk === "warning" || percent >= 90;
  const watch = risk === "watch" || percent >= 75;
  const tone = crossed
    ? "bg-red-50 text-red-700 ring-red-200"
    : warning
      ? "bg-orange-50 text-orange-700 ring-orange-200"
      : watch
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone}`}>
      {stateLabel(state)} {formatPercent(percent)}
      <span aria-hidden="true">↗</span>
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
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  defaultLabel: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{defaultLabel}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-9 text-sm font-medium text-slate-800 outline-none ring-blue-100 focus:ring-4"
      >
        <option value="all">{defaultLabel}</option>
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

function segmentMatches(invoice: Invoice, segment: Segment) {
  if (segment === "all") return true;
  if (segment === "ocr_needs_review") return invoice.extractionStatus === "ocr_needs_review";
  if (segment === "approved") return invoice.reviewStatus === "approved" || invoice.reviewStatus === "exported";
  if (segment === "needs_review") return invoice.reviewStatus === "needs_review" || invoice.flags.length > 0;
  return invoice.reviewStatus === segment;
}

function getSourceLabel(invoice: Invoice) {
  if (invoice.extractionStatus === "ocr_needs_review") return "OCR Extract";
  if (invoice.documentId || invoice.pdfFileName || invoice.pdfPublicUrl) return "PDF Upload";
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

function getImpactPercent(invoice: Invoice) {
  if (invoice.invoiceNumber === "INV-1048") return 118.2;
  if (invoice.riskStatus === "crossed") return 118.2;
  if (invoice.riskStatus === "warning") return 96;
  if (invoice.riskStatus === "watch") return 82.6;
  return STATE_IMPACT[invoice.shipToState ?? ""] ?? 36.9;
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
