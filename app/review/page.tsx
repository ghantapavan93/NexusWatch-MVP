import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumReviewQueueTable } from "@/components/review/PremiumReviewQueueTable";
import { ReviewHeaderActions, ReviewSummaryCard } from "@/components/review/ReviewHeaderActions";
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
    needsReview: reviewInvoices.filter((invoice) => invoice.reviewStatus === "needs_review").length,
    accountingReview: reviewInvoices.filter((invoice) => invoice.reviewStatus === "accounting_review").length,
    approved: invoices.filter((invoice) => invoice.reviewStatus === "approved").length,
  };

  return (
    <>
      <PageHeader
        title="Review Queue"
        description="Review and action invoice items that need your attention."
        action={<ReviewHeaderActions />}
      />
      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <ReviewSummaryCard tone="indigo" label="Total Items" value={summary.totalReviewItems} detail="Across all queues" tab="all" />
        <ReviewSummaryCard tone="red" label="Needs Review" value={summary.needsReview} detail="Awaiting first review" tab="needs_review" />
        <ReviewSummaryCard tone="orange" label="Accounting Review" value={summary.accountingReview} detail="In accounting queue" tab="accounting_review" />
        <ReviewSummaryCard
          tone="violet"
          label="Missing Fields"
          value={summary.missingShipTo + summary.missingCategory}
          detail="Required data missing"
          tab="missing_fields"
        />
        <ReviewSummaryCard
          tone="amber"
          label="Threshold Warnings"
          value={summary.mayCrossThreshold + summary.crossedThreshold}
          detail="Approaching or exceeded"
          tab="threshold_warnings"
        />
        <ReviewSummaryCard tone="emerald" label="Approved" value={summary.approved} detail="Completed and approved" tab="approved" />
      </section>
      <PremiumReviewQueueTable invoices={reviewInvoices} allInvoices={invoices} rules={rules} />
    </>
  );
}
