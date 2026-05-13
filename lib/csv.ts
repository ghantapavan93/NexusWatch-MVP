import type { Invoice, NexusRule, StateNexusSummary } from "@/types";

const headers = [
  "Invoice Number",
  "Invoice Date",
  "Customer",
  "Ship To",
  "Bill To",
  "Category",
  "Line Amount",
  "Taxable Amount",
  "Status",
  "Flags",
];

export function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function invoiceLineItemsToCsv(invoices: Invoice[]) {
  const rows = invoices.flatMap((invoice) =>
    invoice.lineItems.map((item) => [
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.customerName,
      invoice.shipToState ?? "",
      invoice.billToState ?? "",
      item.category,
      item.amount,
      item.taxableAmount ?? 0,
      invoice.reviewStatus,
      invoice.flags.join("; "),
    ])
  );

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function stateSummariesToCsv(states: StateNexusSummary[]) {
  const stateHeaders = ["State", "Threshold", "Taxable Total", "Percent Used", "Remaining", "Status", "Next Action"];
  const rows = states.map((state) => [
    state.stateCode,
    state.thresholdAmount,
    state.taxableTotal,
    state.percentUsed.toFixed(1),
    state.remaining,
    state.status,
    state.nextAction,
  ]);
  return [stateHeaders, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function rulesToCsv(rules: NexusRule[]) {
  const ruleHeaders = ["State", "Threshold", "SaaS Taxable", "Hardware Taxable", "Services Taxable", "Source URL", "Last Reviewed", "Notes"];
  const rows = rules.map((rule) => [
    rule.stateCode,
    rule.thresholdAmount,
    rule.saasTaxable ? "yes" : "no",
    rule.hardwareTaxable ? "yes" : "no",
    rule.servicesTaxable ? "yes" : "no",
    rule.sourceUrl ?? "",
    rule.lastReviewed ?? "",
    rule.notes ?? "",
  ]);
  return [ruleHeaders, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}
