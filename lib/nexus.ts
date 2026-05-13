import { CALCULATION_RULES, LARGE_INVOICE_AMOUNT, REVIEW_FLAGS } from "@/lib/constants";
import { roundCurrency } from "@/lib/format";
import type { Category, Invoice, LineItem, NexusRule, ReviewFlag, StateNexusSummary } from "@/types";

export function isLineTaxable(rule: Pick<NexusRule, "saasTaxable" | "hardwareTaxable" | "servicesTaxable">, category: Category) {
  if (category === "saas") return rule.saasTaxable;
  if (category === "hardware") return rule.hardwareTaxable;
  if (category === "services") return rule.servicesTaxable;
  return false;
}

export function calculateTaxableAmount(rule: NexusRule, items: Pick<LineItem, "category" | "amount">[]) {
  return roundCurrency(
    items.reduce((sum, item) => sum + (isLineTaxable(rule, item.category) ? item.amount : 0), 0)
  );
}

export function getThresholdStatus(total: number, threshold: number) {
  const percent = threshold > 0 ? (total / threshold) * 100 : 0;

  if (percent >= 100) return { status: "crossed" as const, percent, label: "Crossed Threshold" };
  if (percent >= 90) return { status: "warning" as const, percent, label: "90% Warning" };
  if (percent >= 75) return { status: "watch" as const, percent, label: "75% Watch" };
  return { status: "safe" as const, percent, label: "Safe" };
}

export function previewInvoiceImpact(currentTotal: number, invoiceTaxableAmount: number, threshold: number) {
  const before = getThresholdStatus(currentTotal, threshold);
  const after = getThresholdStatus(roundCurrency(currentTotal + invoiceTaxableAmount), threshold);
  const mayPushOver = before.percent < 100 && after.percent >= 100;
  const warningChanged = before.status !== after.status;

  return {
    before,
    after,
    mayPushOver,
    warningChanged,
    newTotal: roundCurrency(currentTotal + invoiceTaxableAmount),
    remaining: Math.max(roundCurrency(threshold - (currentTotal + invoiceTaxableAmount)), 0),
  };
}

export function shouldSkipInvoiceFromThreshold(invoice: Pick<Invoice, "shipToState">) {
  return CALCULATION_RULES.REQUIRE_SHIP_TO_FOR_THRESHOLD && !invoice.shipToState;
}

export function getExcludedAmount(invoice: Pick<Invoice, "totalAmount" | "taxableAmount">) {
  return roundCurrency(invoice.totalAmount - invoice.taxableAmount);
}

export function getInvoiceFlags(invoice: Invoice, allInvoices: Invoice[], currentStateTotal = 0, rule?: NexusRule): ReviewFlag[] {
  const flags = new Set<ReviewFlag>(invoice.flags ?? []);

  if (!invoice.shipToState) flags.add(REVIEW_FLAGS.MISSING_SHIP_TO);
  if (invoice.lineItems.some((item) => item.category === "other")) flags.add(REVIEW_FLAGS.MISSING_CATEGORY);
  if (invoice.shipToState && invoice.billToState && invoice.shipToState !== invoice.billToState) flags.add(REVIEW_FLAGS.SHIP_BILL_MISMATCH);
  if (Math.abs(invoice.totalAmount) >= LARGE_INVOICE_AMOUNT) flags.add(REVIEW_FLAGS.LARGE_INVOICE);

  const duplicateCount = allInvoices.filter((candidate) => candidate.invoiceNumber === invoice.invoiceNumber).length;
  if (duplicateCount > 1) flags.add(REVIEW_FLAGS.DUPLICATE_INVOICE);

  if (rule && invoice.shipToState) {
    const impact = previewInvoiceImpact(currentStateTotal, invoice.taxableAmount, rule.thresholdAmount);
    if (impact.mayPushOver) flags.add(REVIEW_FLAGS.MAY_CROSS_THRESHOLD);
    if (impact.after.status === "crossed") flags.add(REVIEW_FLAGS.CROSSED_THRESHOLD);
  }

  return Array.from(flags);
}

export function buildStateSummaries(rules: NexusRule[], invoices: Invoice[]): StateNexusSummary[] {
  return rules.map((rule) => {
    const stateInvoices = invoices.filter(
      (invoice) =>
        invoice.shipToState === rule.stateCode &&
        !shouldSkipInvoiceFromThreshold(invoice) &&
        invoice.reviewStatus !== "draft" &&
        invoice.reviewStatus !== "needs_review" &&
        invoice.reviewStatus !== "accounting_review"
    );
    const taxableTotal = roundCurrency(stateInvoices.reduce((sum, invoice) => sum + invoice.taxableAmount, 0));
    const invoiceTotal = roundCurrency(stateInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0));
    const excludedTotal = roundCurrency(invoiceTotal - taxableTotal);
    const threshold = getThresholdStatus(taxableTotal, rule.thresholdAmount);
    const latestInvoice = [...stateInvoices].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))[0];

    return {
      stateCode: rule.stateCode,
      stateName: rule.stateName,
      thresholdAmount: rule.thresholdAmount,
      taxableTotal,
      invoiceTotal,
      excludedTotal,
      percentUsed: threshold.percent,
      remaining: Math.max(roundCurrency(rule.thresholdAmount - taxableTotal), 0),
      status: threshold.status,
      latestInvoice,
      nextAction: getNextAction(threshold.status),
    };
  });
}

function getNextAction(status: StateNexusSummary["status"]) {
  if (status === "crossed") return "Accounting review before additional invoices";
  if (status === "warning") return "Review large upcoming invoices";
  if (status === "watch") return "Monitor invoice activity weekly";
  return "No immediate action";
}
