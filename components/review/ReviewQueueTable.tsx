"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, FileText, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Toast } from "@/components/shared/Toast";
import { formatCurrency, formatPercent, stateLabel } from "@/lib/format";
import { buildInvoiceThresholdImpact, hasDetectedMismatch, hasLowConfidence } from "@/lib/thresholdImpact";
import type { Invoice, NexusRule } from "@/types";

type ReviewTab =
  | "all"
  | "needs_review"
  | "accounting_review"
  | "missing_fields"
  | "threshold_warnings"
  | "ocr_needs_review"
  | "approved";

const tabs: { id: ReviewTab; label: string }[] = [
  { id: "all", label: "All Review Items" },
  { id: "needs_review", label: "Needs Review" },
  { id: "accounting_review", label: "Accounting Review" },
  { id: "missing_fields", label: "Missing Fields" },
  { id: "threshold_warnings", label: "Threshold Warnings" },
  { id: "ocr_needs_review", label: "OCR Needs Review" },
  { id: "approved", label: "Approved" },
];

export function ReviewQueueTable({
  invoices,
  allInvoices,
  rules,
}: {
  invoices: Invoice[];
  allInvoices: Invoice[];
  rules: NexusRule[];
}) {
  const [activeTab, setActiveTab] = useState<ReviewTab>("all");
  const [toastMessage, setToastMessage] = useState("");
  const [busyInvoiceId, setBusyInvoiceId] = useState("");

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const impact = buildInvoiceThresholdImpact(invoice, allInvoices, rules);
      if (activeTab === "all") return true;
      if (activeTab === "needs_review") return invoice.reviewStatus === "needs_review";
      if (activeTab === "accounting_review") return invoice.reviewStatus === "accounting_review";
      if (activeTab === "missing_fields") {
        return invoice.flags.includes("missing_ship_to") || invoice.flags.includes("missing_category") || !invoice.shipToState;
      }
      if (activeTab === "threshold_warnings") return impact.watch75 || impact.warning90 || impact.thresholdCrossingRisk;
      if (activeTab === "ocr_needs_review") return invoice.extractionStatus === "ocr_needs_review" || hasLowConfidence(invoice);
      return invoice.reviewStatus === "approved";
    });
  }, [activeTab, allInvoices, invoices, rules]);

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
    } catch {
      setToastMessage("Review status could not be saved. Check the local server and Supabase connection.");
    } finally {
      setBusyInvoiceId("");
    }
  }

  return (
    <>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      <div className="data-grid">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Operations queue for human, OCR, threshold, and accounting review before final NexusWatch reporting.
            </p>
            <Link href="/exports" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              Export review queue
            </Link>
          </div>
        </div>

        <div className="divide-y divide-slate-100 bg-white">
          {filteredInvoices.map((invoice) => {
            const impact = buildInvoiceThresholdImpact(invoice, allInvoices, rules);
            const recommendedActions = getRecommendedActions(invoice, impact);

            return (
              <article key={invoice.id} className="p-5 transition hover:bg-blue-50/30">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/invoices/${invoice.id}`} className="text-base font-semibold text-slate-950 hover:text-blue-700">
                        {invoice.invoiceNumber}
                      </Link>
                      <StatusBadge status={invoice.reviewStatus} />
                      <StatusBadge status={impact.riskStatus} />
                      {invoice.pdfFileName ? <SourceBadge label="Source document linked" /> : null}
                      {invoice.extractionStatus ? <StatusBadge status={invoice.extractionStatus} /> : null}
                      {hasLowConfidence(invoice) ? <StatusBadge status="low_confidence" /> : null}
                      {hasDetectedMismatch(invoice) ? <SourceBadge label="PDF/OCR mismatch" tone="amber" /> : null}
                    </div>
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                      <Info label="Customer" value={invoice.customerName} />
                      <Info label="Ship To" value={stateLabel(invoice.shipToState)} />
                      <Info label="Bill To" value={stateLabel(invoice.billToState)} />
                      <Info label="Taxable Amount" value={formatCurrency(invoice.taxableAmount)} />
                    </div>
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                        <span>Projected threshold impact</span>
                        <span>{formatPercent(impact.percentAfterInvoice)}</span>
                      </div>
                      <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.min(impact.percentAfterInvoice, 100)}%` }} />
                        <div className="absolute left-[75%] top-0 h-full w-px bg-yellow-600/70" />
                        <div className="absolute left-[90%] top-0 h-full w-px bg-orange-700/80" />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {impact.riskReasons.length ? (
                        impact.riskReasons.map((reason) => (
                          <span key={reason} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                            {reason}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No active review reason.</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-medium uppercase text-slate-500">Recommended next action</div>
                    <div className="mt-2 text-sm font-semibold text-slate-950">{impact.recommendedNextAction}</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {recommendedActions.map((action) => (
                        <span key={action} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                          {action}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="primary-button px-3 py-2 text-sm"
                      >
                        Open invoice review
                      </Link>
                      {invoice.pdfPublicUrl ? (
                        <a
                          href={invoice.pdfPublicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="secondary-button px-3 py-2 text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          Open source document
                        </a>
                      ) : null}
                      {invoice.reviewStatus === "accounting_review" ? (
                        <>
                          <button
                            type="button"
                            disabled={busyInvoiceId === invoice.id}
                            onClick={() => updateAccountingStatus(invoice, "complete")}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark Accounting Review Complete
                          </button>
                          <button
                            type="button"
                            disabled={busyInvoiceId === invoice.id}
                            onClick={() => updateAccountingStatus(invoice, "return")}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Return to Review Queue
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {filteredInvoices.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No review items match this tab.</div>
        ) : null}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function SourceBadge({ label, tone = "blue" }: { label: string; tone?: "blue" | "amber" }) {
  const style = tone === "amber" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-blue-50 text-blue-700 ring-blue-200";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${style}`}>{label}</span>;
}

function getRecommendedActions(invoice: Invoice, impact: ReturnType<typeof buildInvoiceThresholdImpact>) {
  const actions = new Set<string>();
  actions.add("Review invoice fields");
  if (invoice.reviewStatus !== "accounting_review") actions.add("Send to accounting review");
  if (invoice.reviewStatus === "accounting_review") actions.add("Mark reviewed");
  if (invoice.pdfPublicUrl) actions.add("Open source document");
  if (invoice.extractionStatus === "ocr_needs_review") actions.add("Review OCR fields");
  if (impact.thresholdCrossingRisk || impact.warning90 || impact.watch75) actions.add("Review threshold impact");
  actions.add("Export review queue");
  return Array.from(actions);
}
