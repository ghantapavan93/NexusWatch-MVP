import { Filter, Plus, AlertTriangle, Eye, FileQuestion, Files, Users, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumReviewQueueTable } from "@/components/review/PremiumReviewQueueTable";
import { getNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const { invoices, rules } = await getNexusWatchData();
  const reviewInvoices = invoices.filter(
    (invoice) =>
      invoice.reviewStatus === "needs_review" ||
      invoice.reviewStatus === "accounting_review" ||
      invoice.flags.length > 0 ||
      invoice.extractionStatus === "ocr_needs_review" ||
      invoice.extractionStatus === "manual_review_required"
  );
  const summary = {
    totalReviewItems: reviewInvoices.length,
    missingShipTo: reviewInvoices.filter((invoice) => invoice.flags.includes("missing_ship_to")).length,
    missingCategory: reviewInvoices.filter((invoice) => invoice.flags.includes("missing_category")).length,
    mayCrossThreshold: reviewInvoices.filter((invoice) => invoice.flags.includes("may_cross_threshold")).length,
    crossedThreshold: reviewInvoices.filter((invoice) => invoice.flags.includes("crossed_threshold")).length,
    accountingReviewNeeded: reviewInvoices.filter(
      (invoice) =>
        invoice.reviewStatus === "accounting_review" ||
        invoice.reviewStatus === "needs_review" ||
        invoice.flags.includes("may_cross_threshold") ||
        invoice.flags.includes("crossed_threshold") ||
        invoice.flags.includes("large_invoice") ||
        invoice.flags.includes("category_review") ||
        invoice.extractionStatus === "ocr_needs_review"
    ).length,
  };

  return (
    <>
      <PageHeader
        title="Review Queue"
        description="Review and action invoice items that need your attention."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button className="secondary-button px-4 py-2" type="button">
              <Filter className="h-4 w-4" />
              Manage Filters
            </button>
            <button className="primary-button px-4 py-2" type="button">
              <Plus className="h-4 w-4" />
              Add Review Note
            </button>
          </div>
        }
      />
      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard icon={Files} tone="indigo" label="Total Items" value={summary.totalReviewItems} detail="Across all queues" />
        <SummaryCard icon={Eye} tone="red" label="Needs Review" value={summary.accountingReviewNeeded} detail="Require your attention" />
        <SummaryCard icon={Users} tone="orange" label="Accounting Review" value={reviewInvoices.filter((invoice) => invoice.reviewStatus === "accounting_review").length} detail="In accounting queue" />
        <SummaryCard icon={FileQuestion} tone="violet" label="Missing Fields" value={summary.missingShipTo + summary.missingCategory} detail="Required data missing" />
        <SummaryCard icon={AlertTriangle} tone="amber" label="Threshold Warnings" value={summary.mayCrossThreshold + summary.crossedThreshold} detail="Approaching or exceeded" />
        <SummaryCard icon={ShieldCheck} tone="emerald" label="Approved" value={invoices.filter((invoice) => invoice.reviewStatus === "approved").length} detail="Completed and approved" />
      </section>
      <PremiumReviewQueueTable invoices={reviewInvoices} allInvoices={invoices} rules={rules} />
    </>
  );
}

function SummaryCard({
  icon: Icon,
  tone,
  label,
  value,
  detail,
}: {
  icon: typeof Files;
  tone: "indigo" | "red" | "orange" | "violet" | "amber" | "emerald";
  label: string;
  value: number;
  detail: string;
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="premium-card flex items-center gap-4 p-5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs font-bold text-slate-600">{label}</div>
        <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{detail}</div>
      </div>
    </div>
  );
}
