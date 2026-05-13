import { PageHeader } from "@/components/layout/PageHeader";
import { ReviewQueueTable } from "@/components/review/ReviewQueueTable";
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
      <PageHeader title="Review Queue" description="Invoices routed for missing data, category review, threshold risk, duplicate checks, or accounting review." />
      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Total Review Items" value={summary.totalReviewItems} detail="Open review records" />
        <SummaryCard label="Missing Ship To" value={summary.missingShipTo} detail="Skipped from thresholds" />
        <SummaryCard label="Missing Category" value={summary.missingCategory} detail="Category cleanup needed" />
        <SummaryCard label="May Push Threshold" value={summary.mayCrossThreshold} detail="Threshold risk invoices" />
        <SummaryCard label="Crossed Threshold" value={summary.crossedThreshold} detail="Configured threshold exceeded" />
        <SummaryCard label="Accounting Review Needed" value={summary.accountingReviewNeeded} detail="Needs final review" />
      </section>
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Review flags are generated from configured demo rules. Final tax treatment should be reviewed with accounting.
      </div>
      <ReviewQueueTable invoices={reviewInvoices} allInvoices={invoices} rules={rules} />
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
