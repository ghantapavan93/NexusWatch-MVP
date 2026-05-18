import type { InvoiceStatus, ReviewFlag, ThresholdStatus } from "@/types";

const statusStyles: Record<string, string> = {
  safe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  healthy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  watch: "bg-amber-50 text-amber-700 ring-amber-200",
  warning: "bg-orange-50 text-orange-700 ring-orange-200",
  crossed: "bg-red-50 text-red-700 ring-red-200",
  needs_review: "bg-blue-50 text-blue-700 ring-blue-200",
  review_needed: "bg-blue-50 text-blue-700 ring-blue-200",
  accounting_review: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  open: "bg-blue-50 text-blue-700 ring-blue-200",
  reviewed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  exported: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  manual_review_required: "bg-blue-50 text-blue-700 ring-blue-200",
  extracted_needs_review: "bg-blue-50 text-blue-700 ring-blue-200",
  ocr_needs_review: "bg-amber-50 text-amber-700 ring-amber-200",
  extraction_failed: "bg-red-50 text-red-700 ring-red-200",
  low_confidence: "bg-amber-50 text-amber-700 ring-amber-200",
  missing_field: "bg-blue-50 text-blue-700 ring-blue-200",
  negative_amount: "bg-red-50 text-red-700 ring-red-200",
  zero_amount: "bg-amber-50 text-amber-700 ring-amber-200",
  missing_ship_to: "bg-blue-50 text-blue-700 ring-blue-200",
  missing_category: "bg-blue-50 text-blue-700 ring-blue-200",
  ship_bill_mismatch: "bg-amber-50 text-amber-700 ring-amber-200",
  may_cross_threshold: "bg-orange-50 text-orange-700 ring-orange-200",
  crossed_threshold: "bg-red-50 text-red-700 ring-red-200",
  duplicate_invoice: "bg-violet-50 text-violet-700 ring-violet-200",
  large_invoice: "bg-orange-50 text-orange-700 ring-orange-200",
  category_review: "bg-blue-50 text-blue-700 ring-blue-200",
};

const labels: Record<string, string> = {
  safe: "Safe",
  healthy: "Healthy",
  watch: "75% Watch",
  warning: "90% Warning",
  crossed: "Crossed",
  needs_review: "Needs Review",
  review_needed: "Review Needed",
  accounting_review: "Accounting Review",
  draft: "Draft",
  open: "Open",
  reviewed: "Reviewed",
  approved: "Approved",
  exported: "Exported",
  manual_review_required: "Manual Review Required",
  extracted_needs_review: "Fields Detected",
  ocr_needs_review: "OCR Needs Review",
  extraction_failed: "Extraction Failed",
  low_confidence: "Low Confidence",
  missing_field: "Missing Field",
  missing_ship_to: "Missing Ship-To",
  missing_category: "Missing Category",
  ship_bill_mismatch: "Ship/Bill Mismatch",
  may_cross_threshold: "May Push Threshold",
  crossed_threshold: "Crossed Threshold",
  duplicate_invoice: "Duplicate",
  large_invoice: "Large Invoice",
  category_review: "Category Review",
  negative_amount: "Negative Amount",
  zero_amount: "Zero Amount",
};

export function StatusBadge({ status }: { status: ThresholdStatus | InvoiceStatus | ReviewFlag | "needs_review" | string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {labels[status] ?? status}
    </span>
  );
}
