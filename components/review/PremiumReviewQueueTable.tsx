"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileImage,
  FileText,
  Info,
  MoreVertical,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Toast } from "@/components/shared/Toast";
import { formatCurrency, formatDate, formatPercent, stateLabel } from "@/lib/format";
import { buildInvoiceThresholdImpact, hasDetectedMismatch, hasLowConfidence } from "@/lib/thresholdImpact";
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
  const [activeTab, setActiveTab] = useState<ReviewTab>("all");
  const [toastMessage, setToastMessage] = useState("");
  const [busyInvoiceId, setBusyInvoiceId] = useState("");

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
    return enriched.filter(({ invoice, impact }) => {
      if (activeTab === "all") return true;
      if (activeTab === "needs_review") return invoice.reviewStatus === "needs_review";
      if (activeTab === "accounting_review") return invoice.reviewStatus === "accounting_review";
      if (activeTab === "ocr_needs_review") return invoice.extractionStatus === "ocr_needs_review" || hasLowConfidence(invoice);
      if (activeTab === "missing_fields") {
        return invoice.flags.includes("missing_ship_to") || invoice.flags.includes("missing_category") || !invoice.shipToState;
      }
      if (activeTab === "threshold_warnings") return impact.watch75 || impact.warning90 || impact.thresholdCrossingRisk;
      return invoice.reviewStatus === "approved";
    });
  }, [activeTab, enriched]);

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

            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950">{filteredItems.length} items</h2>
                <p className="mt-1 text-xs text-slate-500">Decision support queue for human, OCR, threshold, and accounting review.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="secondary-button px-3 py-2 text-sm" type="button">
                  Sort: Newest
                  <ChevronDown className="h-4 w-4" />
                </button>
                <Link href="/exports" className="secondary-button px-3 py-2 text-sm">
                  Export review queue
                </Link>
              </div>
            </div>

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
                        <input className="mt-2 h-4 w-4 rounded border-slate-300" type="checkbox" aria-label={`Select ${invoice.invoiceNumber}`} />
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
                        {invoice.pdfFileName || invoice.pdfPublicUrl ? (
                          <div>
                            <span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
                              PDF
                            </span>
                            <div className="mt-1 max-w-[120px] truncate text-xs text-slate-500">{invoice.pdfFileName ?? "Source PDF"}</div>
                          </div>
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
                          <div className="text-xs text-slate-500">May {new Date(invoice.invoiceDate).getDate()}, 2026</div>
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
              <span className="mr-auto text-sm font-bold text-slate-600">0 selected</span>
              <Link href={filteredItems[0] ? `/invoices/${filteredItems[0].invoice.id}` : "/invoices"} className="secondary-button px-3 py-2 text-sm">
                Open Invoice
              </Link>
              <button className="secondary-button px-3 py-2 text-sm" type="button">
                <Users className="h-4 w-4" />
                Send to Accounting Review
              </button>
              {filteredItems.find(({ invoice }) => invoice.reviewStatus === "accounting_review") ? (
                <>
                  <button
                    className="secondary-button px-3 py-2 text-sm"
                    type="button"
                    disabled={busyInvoiceId === filteredItems.find(({ invoice }) => invoice.reviewStatus === "accounting_review")?.invoice.id}
                    onClick={() => {
                      const item = filteredItems.find(({ invoice }) => invoice.reviewStatus === "accounting_review");
                      if (item) void updateAccountingStatus(item.invoice, "complete");
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Accounting Review Complete
                  </button>
                  <button
                    className="secondary-button px-3 py-2 text-sm"
                    type="button"
                    onClick={() => {
                      const item = filteredItems.find(({ invoice }) => invoice.reviewStatus === "accounting_review");
                      if (item) void updateAccountingStatus(item.invoice, "return");
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return to Review Queue
                  </button>
                </>
              ) : null}
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
  if (invoice.extractionStatus === "ocr_needs_review") {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
          Medium Confidence
        </span>
        <div className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">72%</div>
      </div>
    );
  }
  if (invoice.extractionStatus || invoice.pdfFileName) {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
          High Confidence
        </span>
        <div className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">95%</div>
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
