import { LARGE_INVOICE_AMOUNT } from "@/lib/constants";
import { getExcludedAmount, getThresholdStatus, isLineTaxable, previewInvoiceImpact, shouldSkipInvoiceFromThreshold } from "@/lib/nexus";
import type { Invoice, NexusRule, OperationalStatus, ReviewFlag, ThresholdStatus } from "@/types";

export type ExecutiveRiskStatus = "healthy" | "watch" | "warning" | "review_needed" | "accounting_review" | "approved";

export type InvoiceThresholdImpact = {
  shipToState: string | null | undefined;
  billToState: string | null | undefined;
  taxableAmount: number;
  excludedAmount: number;
  thresholdAmount: number;
  currentExposureBeforeInvoice: number;
  projectedExposureAfterInvoice: number;
  percentBeforeInvoice: number;
  percentAfterInvoice: number;
  remainingAmount: number;
  invoiceImpactDelta: number;
  watch75: boolean;
  warning90: boolean;
  thresholdCrossingRisk: boolean;
  thresholdStatus: ThresholdStatus;
  riskStatus: ExecutiveRiskStatus;
  riskBadge: string;
  recommendedNextAction: string;
  riskReasons: string[];
  taxableCategories: string[];
  excludedCategories: string[];
  stateRuleUsed: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  saas: "SaaS",
  hardware: "Hardware",
  services: "Professional Services",
  other: "Other / review",
};

export function buildInvoiceThresholdImpact(invoice: Invoice, invoices: Invoice[], rules: NexusRule[]): InvoiceThresholdImpact {
  const rule = rules.find((item) => item.stateCode === invoice.shipToState);
  const stateApprovedInvoices = rule
    ? invoices.filter(
        (candidate) =>
          candidate.id !== invoice.id &&
          candidate.shipToState === rule.stateCode &&
          !shouldSkipInvoiceFromThreshold(candidate) &&
          (candidate.reviewStatus === "approved" || candidate.reviewStatus === "exported")
      )
    : [];
  const currentExposureBeforeInvoice = stateApprovedInvoices.reduce((sum, candidate) => sum + candidate.taxableAmount, 0);
  const thresholdAmount = rule?.thresholdAmount ?? 0;
  const impact = previewInvoiceImpact(currentExposureBeforeInvoice, invoice.taxableAmount, thresholdAmount);
  const thresholdStatus = impact.after.status;
  const riskReasons = buildRiskReasons(invoice, impact.after.percent, impact.mayPushOver);
  const riskStatus = getExecutiveRiskStatus(invoice, thresholdStatus, riskReasons);
  const categories = buildCategoryLists(invoice, rule);

  return {
    shipToState: invoice.shipToState,
    billToState: invoice.billToState,
    taxableAmount: invoice.taxableAmount,
    excludedAmount: getExcludedAmount(invoice),
    thresholdAmount,
    currentExposureBeforeInvoice,
    projectedExposureAfterInvoice: impact.newTotal,
    percentBeforeInvoice: impact.before.percent,
    percentAfterInvoice: impact.after.percent,
    remainingAmount: impact.remaining,
    invoiceImpactDelta: invoice.taxableAmount,
    watch75: impact.after.percent >= 75,
    warning90: impact.after.percent >= 90,
    thresholdCrossingRisk: impact.mayPushOver || impact.after.status === "crossed",
    thresholdStatus,
    riskStatus,
    riskBadge: getRiskBadge(riskStatus),
    recommendedNextAction: getRecommendedNextAction(invoice, riskStatus, riskReasons),
    riskReasons,
    taxableCategories: categories.taxableCategories,
    excludedCategories: categories.excludedCategories,
    stateRuleUsed: rule ? `${rule.stateName} configured demo rule` : "No state rule selected",
  };
}

export function buildStateExposureDetails(rule: NexusRule, invoices: Invoice[]) {
  const stateInvoices = invoices.filter((invoice) => invoice.shipToState === rule.stateCode);
  const approvedInvoices = stateInvoices.filter((invoice) => !shouldSkipInvoiceFromThreshold(invoice) && isReviewedInvoice(invoice));
  const reviewInvoices = stateInvoices.filter((invoice) => isReviewQueueInvoice(invoice));
  const accountingInvoices = stateInvoices.filter((invoice) => invoice.reviewStatus === "accounting_review");
  const ocrNeedsReviewInvoices = stateInvoices.filter((invoice) => isOcrReviewInvoice(invoice));
  const sourceDocumentInvoices = stateInvoices.filter((invoice) => hasSourceDocument(invoice));
  const missingFieldInvoices = stateInvoices.filter((invoice) => isMissingFieldInvoice(invoice));
  const unknownCategoryInvoices = stateInvoices.filter((invoice) => hasUnknownCategory(invoice));
  const taxableTotal = approvedInvoices.reduce((sum, invoice) => sum + invoice.taxableAmount, 0);
  const status = getThresholdStatus(taxableTotal, rule.thresholdAmount);
  const highestRiskInvoice = [...stateInvoices].sort((a, b) => {
    const impactA = buildInvoiceThresholdImpact(a, invoices, [rule]);
    const impactB = buildInvoiceThresholdImpact(b, invoices, [rule]);
    return impactB.percentAfterInvoice - impactA.percentAfterInvoice || b.taxableAmount - a.taxableAmount;
  })[0];

  return {
    rule,
    taxableTotal,
    percentUsed: status.percent,
    remaining: Math.max(rule.thresholdAmount - taxableTotal, 0),
    status: status.status,
    reviewCount: reviewInvoices.length,
    approvedCount: approvedInvoices.length,
    accountingCount: accountingInvoices.length,
    ocrNeedsReviewCount: ocrNeedsReviewInvoices.length,
    sourceDocumentCount: sourceDocumentInvoices.length,
    missingFieldCount: missingFieldInvoices.length,
    unknownCategoryCount: unknownCategoryInvoices.length,
    inReviewCount: reviewInvoices.length,
    watch75: status.percent >= 75,
    warning90: status.percent >= 90,
    crossed: status.status === "crossed",
    highestRiskInvoice,
    nextAction: getStateNextAction(status.status, reviewInvoices.length, accountingInvoices.length, ocrNeedsReviewInvoices.length),
  };
}

export function hasSourceDocument(invoice: Invoice) {
  return Boolean(invoice.documentId || invoice.pdfFileName || invoice.pdfPublicUrl || invoice.sourceDocument);
}

export function isReviewedInvoice(invoice: Invoice) {
  return invoice.reviewStatus === "approved" || invoice.reviewStatus === "exported";
}

export function isDraftInvoice(invoice: Invoice) {
  return invoice.reviewStatus === "draft" || getOperationalStatus(invoice) === "draft";
}

export function isOcrReviewInvoice(invoice: Invoice) {
  return invoice.extractionStatus === "ocr_needs_review" || hasLowConfidence(invoice);
}

export function isManualReviewInvoice(invoice: Invoice) {
  return invoice.extractionStatus === "manual_review_required" || invoice.extractionStatus === "extracted_needs_review";
}

export function isReviewQueueInvoice(invoice: Invoice) {
  if (isReviewedInvoice(invoice) || isDraftInvoice(invoice)) return false;
  return (
    invoice.reviewStatus === "needs_review" ||
    invoice.reviewStatus === "accounting_review" ||
    invoice.flags.length > 0 ||
    isOcrReviewInvoice(invoice) ||
    isManualReviewInvoice(invoice)
  );
}

export function isMissingFieldInvoice(invoice: Invoice) {
  return (
    invoice.flags.includes("missing_ship_to") ||
    invoice.flags.includes("missing_category") ||
    !invoice.customerName ||
    !invoice.shipToState ||
    !invoice.billToState ||
    invoice.lineItems.length === 0
  );
}

export function hasUnknownCategory(invoice: Invoice) {
  return invoice.flags.includes("category_review") || invoice.lineItems.some((item) => item.category === "other" || item.needsReview);
}

export function isLargeInvoice(invoice: Invoice) {
  return invoice.flags.includes("large_invoice") || Math.abs(invoice.totalAmount) >= LARGE_INVOICE_AMOUNT;
}

export function isThresholdWarningInvoice(invoice: Invoice, invoices: Invoice[], rules: NexusRule[]) {
  const impact = buildInvoiceThresholdImpact(invoice, invoices, rules);
  return impact.watch75 || impact.warning90 || impact.thresholdCrossingRisk;
}

export function getOperationalStatus(invoice: Invoice): OperationalStatus {
  if (invoice.status) return invoice.status;
  if (invoice.reviewStatus === "draft") return "draft";
  if (invoice.reviewStatus === "approved") return "reviewed";
  if (invoice.reviewStatus === "exported") return "exported";
  return "open";
}

export function getInvoiceActivityDate(invoice: Invoice) {
  return invoice.updatedAt || invoice.createdAt || invoice.pdfUploadedAt || invoice.invoiceDate;
}

export function shouldRouteToAccountingReview(invoice: Invoice, impact: InvoiceThresholdImpact) {
  return (
    invoice.reviewStatus === "accounting_review" ||
    invoice.flags.includes("ship_bill_mismatch") ||
    invoice.flags.includes("missing_category") ||
    invoice.flags.includes("category_review") ||
    invoice.flags.includes("large_invoice") ||
    impact.watch75 ||
    impact.warning90 ||
    impact.thresholdCrossingRisk ||
    invoice.extractionStatus === "ocr_needs_review" ||
    hasLowConfidence(invoice) ||
    hasDetectedMismatch(invoice)
  );
}

export function hasDetectedMismatch(invoice: Invoice) {
  const detectedInvoiceNumber = invoice.sourceDocument?.detectedInvoiceNumber;
  return Boolean(detectedInvoiceNumber && detectedInvoiceNumber.toLowerCase() !== invoice.invoiceNumber.toLowerCase());
}

export function hasLowConfidence(invoice: Invoice) {
  const values = Object.values(invoice.sourceDocument?.fieldConfidence ?? {});
  return values.some((value) => value === "low");
}

export function isNormalExportEligible(invoice: Invoice) {
  return (
    invoice.reviewStatus === "approved" &&
    Boolean(invoice.shipToState) &&
    !invoice.flags.includes("missing_ship_to") &&
    !invoice.flags.includes("missing_category") &&
    invoice.extractionStatus !== "ocr_needs_review"
  );
}

export function isReviewQueueExportEligible(invoice: Invoice) {
  return (
    invoice.reviewStatus === "needs_review" ||
    invoice.reviewStatus === "accounting_review" ||
    invoice.flags.length > 0 ||
    invoice.extractionStatus === "ocr_needs_review" ||
    invoice.extractionStatus === "manual_review_required"
  );
}

function buildRiskReasons(invoice: Invoice, percentAfterInvoice: number, mayPushOver: boolean) {
  const reasons = new Set<string>();
  const flagLabels: Record<ReviewFlag, string> = {
    missing_ship_to: "Missing ship-to state",
    missing_category: "Missing category",
    ship_bill_mismatch: "Bill-to and ship-to differ",
    may_cross_threshold: "May cross configured threshold",
    crossed_threshold: "Crossed configured threshold",
    duplicate_invoice: "Potential duplicate invoice",
    large_invoice: "Large invoice",
    category_review: "Category treatment needs confirmation",
    negative_amount: "Negative invoice amount",
    zero_amount: "Zero invoice amount",
  };
  invoice.flags.forEach((flag) => reasons.add(flagLabels[flag]));
  if (!invoice.shipToState) reasons.add("Missing ship-to state");
  if (invoice.shipToState && invoice.billToState && invoice.shipToState !== invoice.billToState) reasons.add("Bill-to and ship-to differ");
  if (Math.abs(invoice.totalAmount) >= LARGE_INVOICE_AMOUNT) reasons.add("Large invoice");
  if (percentAfterInvoice >= 75) reasons.add("Projected exposure reaches 75% watch band");
  if (percentAfterInvoice >= 90) reasons.add("Projected exposure reaches 90% warning band");
  if (mayPushOver) reasons.add("Invoice may cross the configured threshold");
  if (invoice.extractionStatus === "ocr_needs_review") reasons.add("OCR fields need review");
  if (hasLowConfidence(invoice)) reasons.add("Low confidence detected field");
  if (hasDetectedMismatch(invoice)) reasons.add("PDF/OCR invoice number mismatch");
  if (invoice.reviewStatus === "accounting_review") reasons.add("Accounting review in progress");
  return Array.from(reasons);
}

function getExecutiveRiskStatus(invoice: Invoice, thresholdStatus: ThresholdStatus, riskReasons: string[]): ExecutiveRiskStatus {
  if (invoice.reviewStatus === "approved" || invoice.reviewStatus === "exported") return "approved";
  if (invoice.reviewStatus === "accounting_review") return "accounting_review";
  if (riskReasons.length || invoice.reviewStatus === "needs_review" || invoice.reviewStatus === "draft") return "review_needed";
  if (thresholdStatus === "warning" || thresholdStatus === "crossed") return "warning";
  if (thresholdStatus === "watch") return "watch";
  return "healthy";
}

function getRiskBadge(status: ExecutiveRiskStatus) {
  if (status === "approved") return "Approved";
  if (status === "accounting_review") return "Accounting review";
  if (status === "review_needed") return "Review needed";
  if (status === "warning") return "Warning";
  if (status === "watch") return "Watch";
  return "Healthy";
}

function getRecommendedNextAction(invoice: Invoice, status: ExecutiveRiskStatus, riskReasons: string[]) {
  if (status === "approved") return "Ready for reviewed NexusWatch reporting";
  if (status === "accounting_review") return "Complete accounting verification before approval";
  if (hasDetectedMismatch(invoice)) return "Review PDF/OCR mismatch against manual invoice fields";
  if (invoice.extractionStatus === "ocr_needs_review") return "Review OCR fields before approving";
  if (riskReasons.some((reason) => reason.includes("Missing"))) return "Review invoice fields";
  if (riskReasons.some((reason) => reason.includes("90%") || reason.includes("threshold"))) return "Send to accounting review";
  if (riskReasons.length) return "Review invoice details";
  return "Monitor invoice activity";
}

function buildCategoryLists(invoice: Invoice, rule?: NexusRule) {
  const taxableCategories = new Set<string>();
  const excludedCategories = new Set<string>();

  for (const item of invoice.lineItems) {
    const label = CATEGORY_LABELS[item.category] ?? item.category;
    if (rule && isLineTaxable(rule, item.category)) taxableCategories.add(label);
    else excludedCategories.add(label);
  }

  return {
    taxableCategories: Array.from(taxableCategories),
    excludedCategories: Array.from(excludedCategories),
  };
}

function getStateNextAction(status: ThresholdStatus, reviewCount: number, accountingCount: number, ocrNeedsReviewCount: number) {
  if (accountingCount) return "Complete accounting review";
  if (ocrNeedsReviewCount) return "Review OCR fields before approval";
  if (reviewCount) return "Clear review queue items";
  if (status === "crossed") return "Accounting review before additional invoices";
  if (status === "warning") return "Review large upcoming invoices";
  if (status === "watch") return "Monitor invoice activity weekly";
  return "Healthy. Continue monitoring";
}
