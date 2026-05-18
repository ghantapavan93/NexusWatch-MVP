"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileImage,
  FileText,
  Filter,
  Info,
  MoreVertical,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Toast } from "@/components/shared/Toast";
import { formatCurrency, formatDate, formatPercent, stateLabel } from "@/lib/format";
import { buildInvoiceThresholdImpact, getInvoiceActivityDate, hasDetectedMismatch, hasLowConfidence } from "@/lib/thresholdImpact";
import type { Invoice, NexusRule } from "@/types";

type ReviewTab =
  | "all"
  | "needs_review"
  | "accounting_review"
  | "ocr_needs_review"
  | "missing_fields"
  | "threshold_warnings"
  | "approved";

const TABS: { id: ReviewTab; label: string }[] = [
  { id: "all", label: "All Review Items" },
  { id: "needs_review", label: "Needs Review" },
  { id: "accounting_review", label: "Accounting Review" },
  { id: "ocr_needs_review", label: "OCR Needs Review" },
  { id: "missing_fields", label: "Missing Fields" },
  { id: "threshold_warnings", label: "Threshold Warnings" },
  { id: "approved", label: "Approved" },
];

export function PremiumReviewQueueTable({
  invoices,
  allInvoices,
  rules,
}: {
  invoices: Invoice[];
  allInvoices: Invoice[];
  rules: NexusRule[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ReviewTab>("all");
  const [toastMessage, setToastMessage] = useState("");
  const [busyInvoiceId, setBusyInvoiceId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "crossed" | "warning" | "watch" | "missing">("all");
  const [sortKey, setSortKey] = useState<"newest" | "oldest" | "highest_taxable" | "highest_risk">("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && TABS.some((entry) => entry.id === tab)) {
      setActiveTab(tab as ReviewTab);
    }
    if (params.get("filters") === "open") setFiltersOpen(true);
    if (params.get("note") === "open") setNoteFormOpen(true);
  }, []);

  useEffect(() => {
    function onPanelEvent(event: Event) {
      const detail = (event as CustomEvent<{ panel?: string }>).detail;
      if (!detail) return;
      if (detail.panel === "filters") setFiltersOpen(true);
      if (detail.panel === "note") setNoteFormOpen(true);
    }
    function onTabEvent(event: Event) {
      const detail = (event as CustomEvent<{ tab?: string }>).detail;
      if (!detail?.tab) return;
      if (TABS.some((tab) => tab.id === detail.tab)) {
        setActiveTab(detail.tab as ReviewTab);
      }
    }
    window.addEventListener("nexuswatch:review-panel", onPanelEvent as EventListener);
    window.addEventListener("nexuswatch:review-tab", onTabEvent as EventListener);
    return () => {
      window.removeEventListener("nexuswatch:review-panel", onPanelEvent as EventListener);
      window.removeEventListener("nexuswatch:review-tab", onTabEvent as EventListener);
    };
  }, []);

  const stateOptions = useMemo(
    () =>
      Array.from(
        new Set(
          invoices
            .map((invoice) => invoice.shipToState)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [invoices]
  );

  const enriched = useMemo(
    () =>
      invoices.map((invoice) => ({
        invoice,
        impact: buildInvoiceThresholdImpact(invoice, allInvoices, rules),
      })),
    [allInvoices, invoices, rules]
  );

  const counts = useMemo(
    () => ({
      all: enriched.length,
      needs_review: enriched.filter(({ invoice }) => invoice.reviewStatus === "needs_review").length,
      accounting_review: enriched.filter(({ invoice }) => invoice.reviewStatus === "accounting_review").length,
      ocr_needs_review: enriched.filter(({ invoice }) => invoice.extractionStatus === "ocr_needs_review" || hasLowConfidence(invoice)).length,
      missing_fields: enriched.filter(({ invoice }) => invoice.flags.includes("missing_ship_to") || invoice.flags.includes("missing_category") || !invoice.shipToState).length,
      threshold_warnings: enriched.filter(({ impact }) => impact.watch75 || impact.warning90 || impact.thresholdCrossingRisk).length,
      approved: allInvoices.filter((invoice) => invoice.reviewStatus === "approved").length,
    }),
    [allInvoices, enriched]
  );

  const filteredItems = useMemo(() => {
    return enriched
      .filter(({ invoice, impact }) => {
        if (activeTab === "needs_review" && invoice.reviewStatus !== "needs_review") return false;
        if (activeTab === "accounting_review" && invoice.reviewStatus !== "accounting_review") return false;
        if (activeTab === "ocr_needs_review" && invoice.extractionStatus !== "ocr_needs_review" && !hasLowConfidence(invoice)) return false;
        if (activeTab === "missing_fields") {
          if (
            !invoice.flags.includes("missing_ship_to") &&
            !invoice.flags.includes("missing_category") &&
            invoice.shipToState
          ) {
            return false;
          }
        }
        if (activeTab === "threshold_warnings" && !impact.watch75 && !impact.warning90 && !impact.thresholdCrossingRisk) return false;
        if (activeTab === "approved" && invoice.reviewStatus !== "approved") return false;

        if (stateFilter !== "all" && invoice.shipToState !== stateFilter) return false;
        if (severityFilter === "crossed" && !impact.thresholdCrossingRisk) return false;
        if (severityFilter === "warning" && !impact.warning90 && !impact.thresholdCrossingRisk) return false;
        if (severityFilter === "watch" && !impact.watch75 && !impact.warning90 && !impact.thresholdCrossingRisk) return false;
        if (
          severityFilter === "missing" &&
          !invoice.flags.includes("missing_ship_to") &&
          !invoice.flags.includes("missing_category") &&
          invoice.shipToState
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortKey === "oldest") return getInvoiceActivityDate(a.invoice).localeCompare(getInvoiceActivityDate(b.invoice));
        if (sortKey === "highest_taxable") return b.invoice.taxableAmount - a.invoice.taxableAmount;
        if (sortKey === "highest_risk") {
          const ra = a.impact.thresholdCrossingRisk ? 3 : a.impact.warning90 ? 2 : a.impact.watch75 ? 1 : 0;
          const rb = b.impact.thresholdCrossingRisk ? 3 : b.impact.warning90 ? 2 : b.impact.watch75 ? 1 : 0;
          if (rb !== ra) return rb - ra;
          return b.impact.percentAfterInvoice - a.impact.percentAfterInvoice;
        }
        return getInvoiceActivityDate(b.invoice).localeCompare(getInvoiceActivityDate(a.invoice));
      });
  }, [activeTab, enriched, severityFilter, sortKey, stateFilter]);

  const sortLabel: Record<typeof sortKey, string> = {
    newest: "Newest",
    oldest: "Oldest",
    highest_taxable: "Highest taxable",
    highest_risk: "Highest risk",
  };

  const filterChipsActive =
    stateFilter !== "all" || severityFilter !== "all" ? 1 + (stateFilter !== "all" ? 1 : 0) + (severityFilter !== "all" ? 1 : 0) - 1 : 0;

  async function updateAccountingStatus(invoice: Invoice, action: "complete" | "return") {
    const impact = buildInvoiceThresholdImpact(invoice, allInvoices, rules);
    setBusyInvoiceId(invoice.id);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "complete"
            ? {
                status: "reviewed",
                reviewStatus: "approved",
                accountingReviewCompleted: true,
                auditAction: "accounting_review_completed",
                auditSource: "review_queue",
                riskReasons: impact.riskReasons,
              }
            : {
                status: "open",
                reviewStatus: "needs_review",
                auditAction: "accounting_review_returned",
                auditSource: "review_queue",
                riskReasons: impact.riskReasons,
              }
        ),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setToastMessage(result.message ?? "Review status could not be saved.");
        return;
      }
      setToastMessage(action === "complete" ? "Accounting review completed." : "Invoice returned to review queue.");
      router.refresh();
    } catch {
      setToastMessage("Review status could not be saved. Check the local server and Supabase connection.");
    } finally {
      setBusyInvoiceId("");
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getSelectedInvoices() {
    return filteredItems.map(({ invoice }) => invoice).filter((invoice) => selectedIds.has(invoice.id));
  }

  async function submitReviewNote() {
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      setToastMessage("Type a review note before saving.");
      return;
    }
    const targets = getSelectedInvoices();
    const target = targets[0];
    if (!target) {
      setToastMessage("Select an invoice in the queue to attach the review note.");
      return;
    }
    setIsSavingNote(true);
    try {
      const response = await fetch(`/api/invoices/${target.id}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed, auditSource: "review_queue" }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setToastMessage(result.message ?? "Review note could not be saved.");
        return;
      }
      setToastMessage(`Review note added to ${target.invoiceNumber}.`);
      setNoteDraft("");
      setNoteFormOpen(false);
      router.refresh();
    } catch {
      setToastMessage("Review note could not be saved. Check the local server and Supabase connection.");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function bulkSendToAccountingReview() {
    const candidates = getSelectedInvoices().filter(
      (invoice) => invoice.reviewStatus !== "accounting_review" && invoice.reviewStatus !== "approved" && invoice.reviewStatus !== "exported"
    );
    if (!candidates.length) {
      setToastMessage("Select one or more needs-review items to send to accounting review.");
      return;
    }
    setIsBulkSaving(true);
    try {
      let ok = 0;
      for (const invoice of candidates) {
        const impact = buildInvoiceThresholdImpact(invoice, allInvoices, rules);
        const response = await fetch(`/api/invoices/${invoice.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "open",
            reviewStatus: "accounting_review",
            auditAction: "sent_to_accounting_review",
            auditSource: "review_queue_bulk",
            riskReasons: impact.riskReasons,
          }),
        });
        if (response.ok) ok += 1;
      }
      setToastMessage(`${ok} of ${candidates.length} invoice${candidates.length === 1 ? "" : "s"} sent to accounting review.`);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      setToastMessage("Some statuses could not be saved. Check the local server and Supabase connection.");
    } finally {
      setIsBulkSaving(false);
    }
  }

  return (
    <>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <div className="premium-card overflow-hidden">
            <div className="flex gap-3 overflow-x-auto border-b border-slate-200 px-4 pt-3">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-bold transition ${
                      active
                        ? "border-indigo-600 text-indigo-700"
                        : "border-transparent text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {tab.label}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                      {counts[tab.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              id="review-queue-toolbar"
              className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h2 className="text-sm font-black text-slate-950">{filteredItems.length} items</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Decision support queue for human, OCR, threshold, and accounting review. Sorted by {sortLabel[sortKey].toLowerCase()}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  className={`secondary-button px-3 py-2 text-sm ${filtersOpen ? "ring-2 ring-indigo-200" : ""}`}
                  aria-expanded={filtersOpen}
                >
                  <Filter className="h-4 w-4" />
                  Manage Filters
                  {filterChipsActive ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      {(stateFilter !== "all" ? 1 : 0) + (severityFilter !== "all" ? 1 : 0)}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setNoteFormOpen((open) => !open)}
                  className="primary-button px-3 py-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Review Note
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSortMenuOpen((open) => !open)}
                    className="secondary-button px-3 py-2 text-sm"
                    aria-haspopup="menu"
                    aria-expanded={sortMenuOpen}
                  >
                    Sort: {sortLabel[sortKey]}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {sortMenuOpen ? (
                    <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {(Object.keys(sortLabel) as Array<keyof typeof sortLabel>).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSortKey(key);
                            setSortMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                            sortKey === key ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {sortLabel[key]}
                          {sortKey === key ? <CheckCircle2 className="h-4 w-4" /> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Link href="/exports" className="secondary-button px-3 py-2 text-sm">
                  Export review queue
                </Link>
              </div>
            </div>

            {filtersOpen ? (
              <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Ship-to state
                    <select
                      value={stateFilter}
                      onChange={(event) => setStateFilter(event.target.value)}
                      className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
                    >
                      <option value="all">All states</option>
                      {stateOptions.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Severity
                    <select
                      value={severityFilter}
                      onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}
                      className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
                    >
                      <option value="all">All severities</option>
                      <option value="crossed">Crossed configured threshold</option>
                      <option value="warning">90% warning band or above</option>
                      <option value="watch">75% watch band or above</option>
                      <option value="missing">Missing required fields</option>
                    </select>
                  </label>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setStateFilter("all");
                        setSeverityFilter("all");
                      }}
                      className="secondary-button px-3 py-2 text-sm"
                    >
                      <X className="h-4 w-4" />
                      Clear filters
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Filters combine with the tab selection. {filteredItems.length} items match the current view.
                </p>
              </div>
            ) : null}

            {noteFormOpen ? (
              <div className="border-b border-slate-200 bg-amber-50/70 px-5 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-slate-950">Add Review Note</h3>
                      <button type="button" onClick={() => setNoteFormOpen(false)} aria-label="Close" className="text-slate-500 hover:text-slate-900">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Select an invoice in the queue first. The note is appended to the invoice&apos;s review notes and written to audit logs.
                      {(() => {
                        const target = getSelectedInvoices()[0];
                        return target ? ` Target: ${target.invoiceNumber} (${target.customerName}).` : " No invoice selected yet.";
                      })()}
                    </p>
                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder="e.g. Confirmed ship-to with customer; mismatch resolved."
                      className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:w-44">
                    <button
                      type="button"
                      disabled={isSavingNote || getSelectedInvoices().length === 0}
                      onClick={() => void submitReviewNote()}
                      className="primary-button justify-center px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingNote ? "Saving..." : "Save Note"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNoteDraft("");
                        setNoteFormOpen(false);
                      }}
                      className="secondary-button justify-center px-3 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-[1180px] divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-11 px-4 py-3"></th>
                    <th className="px-4 py-3">Invoice & Vendor</th>
                    <th className="px-4 py-3">Risk Reason</th>
                    <th className="px-4 py-3">Ship-To State</th>
                    <th className="px-4 py-3 text-right">Taxable Amount</th>
                    <th className="px-4 py-3">Threshold Impact</th>
                    <th className="px-4 py-3">Source Doc</th>
                    <th className="px-4 py-3">OCR</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Review Status</th>
                    <th className="w-12 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredItems.map(({ invoice, impact }) => (
                    <tr key={invoice.id} className="transition hover:bg-indigo-50/25">
                      <td className="px-4 py-5 align-top">
                        <input
                          className="mt-2 h-4 w-4 rounded border-slate-300"
                          type="checkbox"
                          aria-label={`Select ${invoice.invoiceNumber}`}
                          checked={selectedIds.has(invoice.id)}
                          onChange={() => toggleSelected(invoice.id)}
                        />
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="flex gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                            <FileText className="h-5 w-5" />
                          </span>
                          <div>
                            <Link href={`/invoices/${invoice.id}`} className="font-black text-blue-700 hover:text-blue-900">
                              {invoice.invoiceNumber}
                            </Link>
                            <div className="mt-1 text-xs font-semibold text-slate-700">{invoice.customerName}</div>
                            <div className="mt-0.5 text-xs text-slate-500">Received {formatDate(invoice.invoiceDate)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 align-top">
                        <RiskReason invoice={invoice} impact={impact} />
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="font-bold text-slate-950">{stateLabel(invoice.shipToState)}</div>
                        <div className="text-xs text-slate-500">{invoice.shipToState ? invoice.shipToState : "Missing"}</div>
                      </td>
                      <td className="px-4 py-5 text-right align-top">
                        <div className="font-black text-slate-950">{formatCurrency(invoice.taxableAmount)}</div>
                        <div className="text-xs text-slate-500">Taxable</div>
                      </td>
                      <td className="px-4 py-5 align-top">
                        <ThresholdBar percent={impact.percentAfterInvoice} amount={impact.projectedExposureAfterInvoice} threshold={impact.thresholdAmount} />
                      </td>
                      <td className="px-4 py-5 align-top">
                        {invoice.pdfPublicUrl ? (
                          <a
                            href={invoice.pdfPublicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-[160px]"
                            title={invoice.pdfFileName ?? "Open source PDF"}
                          >
                            <span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 ring-1 ring-red-200 hover:bg-red-100">
                              PDF
                            </span>
                            <div className="mt-1 truncate text-xs font-semibold text-blue-700">
                              {invoice.pdfFileName ?? "Open source PDF"}
                            </div>
                          </a>
                        ) : invoice.pdfFileName ? (
                          <Link href={`/invoices/${invoice.id}`} className="block max-w-[160px]">
                            <span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
                              PDF
                            </span>
                            <div className="mt-1 truncate text-xs text-slate-500">{invoice.pdfFileName}</div>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">No source</span>
                        )}
                      </td>
                      <td className="px-4 py-5 align-top">
                        <OcrBadge invoice={invoice} />
                      </td>
                      <td className="px-4 py-5 align-top">
                        <StatusBadge status={impact.riskStatus} />
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="space-y-1">
                          <StatusBadge status={invoice.reviewStatus} />
                          <div className="text-xs text-slate-500">{formatDate(getInvoiceActivityDate(invoice))}</div>
                        </div>
                      </td>
                      <td className="px-4 py-5 align-top">
                        <Link
                          className="inline-grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                          href={`/invoices/${invoice.id}`}
                          aria-label={`Open ${invoice.invoiceNumber}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredItems.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                  <Eye className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-950">No review items in this view</h3>
                <p className="mt-1 text-sm text-slate-500">Try another queue tab or clear completed items.</p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <span className="mr-auto text-sm font-bold text-slate-600">{selectedIds.size} selected</span>
              {(() => {
                const selectedInvoices = getSelectedInvoices();
                const firstSelected = selectedInvoices[0];
                const selectedAccountingReview = selectedInvoices.find((invoice) => invoice.reviewStatus === "accounting_review");
                return (
                  <>
                    <Link
                      href={firstSelected ? `/invoices/${firstSelected.id}` : filteredItems[0] ? `/invoices/${filteredItems[0].invoice.id}` : "/invoices"}
                      className="secondary-button px-3 py-2 text-sm"
                    >
                      Open Invoice
                    </Link>
                    <button
                      className="secondary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={isBulkSaving || selectedInvoices.length === 0}
                      onClick={() => void bulkSendToAccountingReview()}
                    >
                      <Users className="h-4 w-4" />
                      Send to Accounting Review
                    </button>
                    {selectedAccountingReview ? (
                      <>
                        <button
                          className="secondary-button px-3 py-2 text-sm"
                          type="button"
                          disabled={busyInvoiceId === selectedAccountingReview.id}
                          onClick={() => void updateAccountingStatus(selectedAccountingReview, "complete")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark Accounting Review Complete
                        </button>
                        <button
                          className="secondary-button px-3 py-2 text-sm"
                          type="button"
                          disabled={busyInvoiceId === selectedAccountingReview.id}
                          onClick={() => void updateAccountingStatus(selectedAccountingReview, "return")}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Return to Review Queue
                        </button>
                      </>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <GuidanceCard />
          <AiBriefCard counts={counts} />
        </aside>
      </div>
    </>
  );
}

function RiskReason({
  invoice,
  impact,
}: {
  invoice: Invoice;
  impact: ReturnType<typeof buildInvoiceThresholdImpact>;
}) {
  if (!invoice.shipToState) {
    return <Reason icon={Info} tone="slate" title="Missing Fields" detail="Ship-to state" />;
  }
  if (invoice.extractionStatus === "ocr_needs_review" || hasLowConfidence(invoice)) {
    return <Reason icon={FileImage} tone="violet" title="OCR Data Verification" detail="Review extracted data" />;
  }
  if (impact.thresholdCrossingRisk) {
    return <Reason icon={AlertTriangle} tone="red" title="Threshold Exceeded" detail={`${formatCurrency(Math.max(impact.projectedExposureAfterInvoice - impact.thresholdAmount, 0))} over`} />;
  }
  if (impact.warning90 || impact.watch75) {
    return <Reason icon={AlertTriangle} tone="orange" title="Approaching Threshold" detail={`${formatCurrency(impact.remainingAmount)} remaining`} />;
  }
  if (hasDetectedMismatch(invoice)) {
    return <Reason icon={Info} tone="amber" title="PDF/OCR Mismatch" detail="Review required" />;
  }
  return <Reason icon={ShieldCheck} tone="emerald" title="Within Threshold" detail="Review complete" />;
}

function Reason({
  icon: Icon,
  tone,
  title,
  detail,
}: {
  icon: typeof AlertTriangle;
  tone: "red" | "orange" | "violet" | "slate" | "amber" | "emerald";
  title: string;
  detail: string;
}) {
  const styles = {
    red: "text-red-600",
    orange: "text-orange-600",
    violet: "text-violet-600",
    slate: "text-slate-500",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="flex gap-2">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${styles[tone]}`} />
      <div>
        <div className="font-black text-slate-950">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function ThresholdBar({ percent, amount, threshold }: { percent: number; amount: number; threshold: number }) {
  const tone = percent >= 100 ? "bg-red-500" : percent >= 90 ? "bg-orange-500" : percent >= 75 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="min-w-[190px]">
      <div className="mb-1 text-right text-xs font-black text-red-600">{formatPercent(percent)}</div>
      <div className="relative h-2.5 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        <div className="absolute left-[75%] top-[-3px] h-4 w-px bg-slate-400" />
        <div className="absolute left-[90%] top-[-3px] h-4 w-px bg-slate-600" />
      </div>
      <div className="mt-2 text-center text-xs text-slate-500">
        {threshold ? `${formatCurrency(amount)} / ${formatCurrency(threshold)}` : "State missing"}
      </div>
    </div>
  );
}

function OcrBadge({ invoice }: { invoice: Invoice }) {
  const rawConfidence =
    invoice.sourceDocument?.ocrConfidence ??
    (typeof invoice.extractionConfidence === "number" ? invoice.extractionConfidence : null);
  const confidencePercent =
    rawConfidence == null || !Number.isFinite(rawConfidence)
      ? null
      : Math.round(rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence);
  const confidenceLabel = confidencePercent == null ? null : `${confidencePercent}%`;

  if (invoice.extractionStatus === "ocr_needs_review" || hasLowConfidence(invoice)) {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
          Review OCR
        </span>
        {confidenceLabel ? (
          <div className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{confidenceLabel}</div>
        ) : null}
      </div>
    );
  }
  if (invoice.extractionStatus || invoice.pdfFileName) {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
          Extracted
        </span>
        {confidenceLabel ? (
          <div className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{confidenceLabel}</div>
        ) : null}
      </div>
    );
  }
  return <span className="text-xs text-slate-400">Manual</span>;
}

function GuidanceCard() {
  const items = [
    { icon: Eye, title: "Needs Review", detail: "Items requiring your review", tone: "text-indigo-600 bg-indigo-50" },
    { icon: Users, title: "Accounting Review", detail: "Items sent to accounting", tone: "text-violet-600 bg-violet-50" },
    { icon: FileText, title: "OCR Needs Review", detail: "Verify OCR extracted data", tone: "text-blue-600 bg-blue-50" },
    { icon: Info, title: "Missing Fields", detail: "Add required information", tone: "text-slate-600 bg-slate-100" },
    { icon: AlertTriangle, title: "Threshold Warnings", detail: "Monitor exposure closely", tone: "text-orange-600 bg-orange-50" },
    { icon: ShieldCheck, title: "Approved", detail: "Completed and approved", tone: "text-emerald-600 bg-emerald-50" },
  ];
  return (
    <div className="premium-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <h2 className="font-black text-slate-950">Queue Guidance</h2>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">Use this queue to triage and route invoices based on risk, completeness, and review stage.</p>
      <div className="mt-5 space-y-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-black text-slate-950">{item.title}</div>
                <div className="text-xs text-slate-500">{item.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AiBriefCard({ counts }: { counts: Record<ReviewTab, number> }) {
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h2 className="font-black text-slate-950">AI Brief</h2>
        </div>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
          Template MVP
        </span>
      </div>
      <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
        <p>{counts.threshold_warnings} invoices have threshold warnings and should be reviewed before approval.</p>
        <p>{counts.accounting_review} invoices are in accounting review and awaiting completion.</p>
        <p>{counts.ocr_needs_review} invoices need OCR or extracted field verification.</p>
        <p>{counts.missing_fields} invoices have missing fields that must be completed.</p>
      </div>
      <Link href="/ai-brief" className="primary-button mt-6 justify-center px-4 py-3">
        <Sparkles className="h-4 w-4" />
        View AI Insights
      </Link>
    </div>
  );
}
