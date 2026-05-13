import { LARGE_INVOICE_AMOUNT, US_STATES_AND_DC } from "@/lib/constants";
import { roundCurrency } from "@/lib/format";

export type DetectedCategory = "saas" | "hardware" | "services" | "unknown";

export type ParsedInvoiceLineItem = {
  description: string;
  quantity?: number;
  rate?: number;
  amount: number;
  category: DetectedCategory;
  taxableAmount: number;
  taxabilityReason: string;
};

export type ParsedInvoiceText = {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  customerName?: string;
  billToName?: string;
  billToAddress?: string;
  billToState?: string;
  shipToName?: string;
  shipToAddress?: string;
  shipToState?: string;
  subtotal?: number;
  totalAmount?: number;
  currency: string;
  lineItems: ParsedInvoiceLineItem[];
  missingFields: string[];
  warnings: string[];
  fieldConfidence: Record<string, "high" | "medium" | "low">;
  unknownFields: Record<string, string>;
};

const STATE_CODES = new Set<string>(US_STATES_AND_DC.map((state) => state.code));

const FIELD_PATTERNS = {
  invoiceNumber: /(?:invoice\s*(?:number|no\.?|#)|inv\s*(?:no\.?|#))\s*[:#-]?\s*([A-Z0-9][A-Z0-9._-]{2,})/i,
  invoiceDate: /(?:invoice\s*date|date)\s*[:#-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  dueDate: /(?:due\s*date|payment\s*due)\s*[:#-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  customerName: /(?:customer|client|sold\s*to)\s*[:#-]?\s*(.+)/i,
  subtotal: /(?:subtotal)\s*[:#-]?\s*\$?\s*([-\d,]+(?:\.\d{2})?)/i,
  totalAmount: /(?:total\s*(?:amount|due)?|amount\s*due|balance\s*due)\s*[:#-]?\s*\$?\s*([-\d,]+(?:\.\d{2})?)/i,
};

const BARE_INVOICE_NUMBER_PATTERN = /\bINV[-\s]?\d{3,8}[A-Z0-9._-]*\b/i;

const UNKNOWN_FIELD_PATTERNS: Record<string, RegExp> = {
  po_number: /(?:po\s*(?:number|#)|purchase\s*order)\s*[:#-]?\s*(.+)/i,
  terms: /terms\s*[:#-]?\s*(.+)/i,
  balance_due: /balance\s*due\s*[:#-]?\s*(.+)/i,
  sales_tax: /sales\s*tax\s*[:#-]?\s*(.+)/i,
  discount: /discount\s*[:#-]?\s*(.+)/i,
  shipping: /shipping\s*[:#-]?\s*(.+)/i,
  tracking_number: /tracking\s*(?:number|#)\s*[:#-]?\s*(.+)/i,
  ship_via: /ship\s*via\s*[:#-]?\s*(.+)/i,
  customer_email: /customer\s*email\s*[:#-]?\s*(.+)/i,
  ap_email: /(?:ap|accounts\s*payable)\s*email\s*[:#-]?\s*(.+)/i,
  quickbooks_id: /quickbooks\s*(?:id|ref)\s*[:#-]?\s*(.+)/i,
  project: /project\s*[:#-]?\s*(.+)/i,
  class: /class\s*[:#-]?\s*(.+)/i,
  location: /location\s*[:#-]?\s*(.+)/i,
};

export function parseInvoiceText(text: string): ParsedInvoiceText {
  const normalized = text.replace(/\r/g, "").trim();
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const invoiceNumber = normalizeInvoiceNumber(
    matchField(normalized, FIELD_PATTERNS.invoiceNumber) ?? normalized.match(BARE_INVOICE_NUMBER_PATTERN)?.[0]
  );
  const invoiceDate = normalizeDate(matchField(normalized, FIELD_PATTERNS.invoiceDate));
  const dueDate = normalizeDate(matchField(normalized, FIELD_PATTERNS.dueDate));
  const customerName = cleanName(matchField(normalized, FIELD_PATTERNS.customerName));
  const subtotal = parseMoney(matchField(normalized, FIELD_PATTERNS.subtotal));
  const totalAmount = parseMoney(matchField(normalized, FIELD_PATTERNS.totalAmount)) ?? subtotal;
  const billToBlock = extractAddressBlock(lines, ["bill to", "billing"]);
  const shipToBlock = extractAddressBlock(lines, ["ship to", "shipping"]);
  const billToState = findStateCode(billToBlock.join(" "));
  const shipToState = findStateCode(shipToBlock.join(" "));
  const lineItems = extractLineItems(lines);
  const unknownFields = extractUnknownFields(normalized);
  const missingFields = [
    !invoiceNumber ? "invoice number" : null,
    !invoiceDate ? "invoice date" : null,
    !shipToState ? "ship-to state" : null,
    totalAmount == null ? "total amount" : null,
    lineItems.length === 0 ? "line items" : null,
  ].filter(Boolean) as string[];

  const warnings = buildWarnings({
    invoiceNumber,
    invoiceDate,
    totalAmount,
    shipToState,
    billToState,
    lineItems,
  });

  return {
    invoiceNumber,
    invoiceDate,
    dueDate,
    customerName: bestCustomerName(customerName, billToBlock, shipToBlock),
    billToName: firstNonAddressLine(billToBlock),
    billToAddress: billToBlock.join(", ") || undefined,
    billToState,
    shipToName: firstNonAddressLine(shipToBlock),
    shipToAddress: shipToBlock.join(", ") || undefined,
    shipToState,
    subtotal,
    totalAmount,
    currency: normalized.includes("$") ? "USD" : "USD",
    lineItems,
    missingFields,
    warnings,
    fieldConfidence: buildConfidence({
      invoiceNumber,
      invoiceDate,
      dueDate,
      customerName,
      shipToState,
      billToState,
      totalAmount,
      lineItems,
    }),
    unknownFields,
  };
}

export function detectCategory(description: string): { category: DetectedCategory; reason: string } {
  const text = description.toLowerCase();
  if (/\b(saas|subscription|seats?|licenses?|software|platform)\b/.test(text)) {
    return { category: "saas", reason: "Matched SaaS/software keyword." };
  }
  if (/\b(scanner|rfid|hardware|device|tags?|reader|gateway)\b/.test(text)) {
    return { category: "hardware", reason: "Matched hardware/device keyword." };
  }
  if (/\b(implementation|advisory|consulting|services?|professional services|onboarding)\b/.test(text)) {
    return { category: "services", reason: "Matched professional services keyword." };
  }
  return { category: "unknown", reason: "No category keyword matched; manual review required." };
}

function extractLineItems(lines: string[]) {
  const items: ParsedInvoiceLineItem[] = [];
  const ignored = /^(invoice|date|due|bill to|ship to|subtotal|total|terms|balance|amount due|customer|description\s+qty)/i;
  const candidateLines = lineItemSection(lines);

  for (const line of candidateLines) {
    if (ignored.test(line)) continue;
    const moneyMatches = Array.from(line.matchAll(/\$?\s*(-?\d[\d,]*(?:\.\d{2})?)/g));
    if (!moneyMatches.length) continue;

    const amount = parseMoney(moneyMatches[moneyMatches.length - 1][1]);
    if (amount == null) continue;

    const description = line.slice(0, moneyMatches[moneyMatches.length - 1].index).replace(/\s{2,}/g, " ").trim();
    if (!description || description.length < 3) continue;
    if (looksLikeAddressOrSummary(description)) continue;

    const quantity = moneyMatches.length >= 3 ? parseNumber(moneyMatches[0][1]) : undefined;
    const rate = moneyMatches.length >= 3 ? parseMoney(moneyMatches[1][1]) : undefined;
    const detected = detectCategory(description);

    items.push({
      description,
      quantity,
      rate,
      amount,
      category: detected.category,
      taxableAmount: detected.category === "unknown" ? 0 : amount,
      taxabilityReason: detected.reason,
    });
  }

  return items.slice(0, 20);
}

function lineItemSection(lines: string[]) {
  const start = lines.findIndex((line) =>
    /^(description|product|item|service|activity|line items?|qty|quantity)\b/i.test(line)
  );
  if (start === -1) return lines;

  const section: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^(subtotal|total|sales tax|tax|balance due|amount due|notes?|terms|thank you)\b/i.test(line)) break;
    section.push(line);
  }

  return section.length ? section : lines;
}

function looksLikeAddressOrSummary(description: string) {
  const hasCategorySignal = detectCategory(description).category !== "unknown";
  if (hasCategorySignal) return false;

  if (/@/.test(description)) return true;
  if (/\b(receiving dock|loading dock|dock)\b/i.test(description)) return true;
  if (/\b(street|st\.|avenue|ave\.|road|rd\.|drive|dr\.|boulevard|blvd\.|lane|ln\.|suite|ste\.|floor|zip)\b/i.test(description)) {
    return true;
  }

  if (/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(description)) return true;
  if (/\b[A-Z][a-z]+,\s*[A-Z]{2}\b/.test(description)) return true;
  if (/\b(bill to|ship to|billing|shipping|remit to)\b/i.test(description)) return true;
  if (/\b(subtotal|total|amount due|balance due|sales tax|discount|taxable amount|configured threshold|nexuswatch demo)\b/i.test(description)) {
    return true;
  }

  return false;
}

function buildWarnings({
  invoiceNumber,
  invoiceDate,
  totalAmount,
  shipToState,
  billToState,
  lineItems,
}: {
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  shipToState?: string;
  billToState?: string;
  lineItems: ParsedInvoiceLineItem[];
}) {
  const warnings: string[] = [];
  if (!shipToState) warnings.push("Missing ship-to state.");
  if (!invoiceNumber) warnings.push("Missing invoice number.");
  if (!invoiceDate) warnings.push("Missing invoice date.");
  if (totalAmount == null) warnings.push("Missing total amount.");
  if (lineItems.length === 0) warnings.push("Missing line items.");
  if (lineItems.some((item) => item.category === "unknown")) warnings.push("Unknown category requires review.");
  if (shipToState && billToState && shipToState !== billToState) warnings.push("Bill-to state differs from ship-to state.");
  if (lineItems.some((item) => item.amount < 0) || (totalAmount ?? 0) < 0) warnings.push("Negative amount detected.");
  if (lineItems.some((item) => item.amount === 0) || totalAmount === 0) warnings.push("Zero amount detected.");
  if (Math.abs(totalAmount ?? 0) >= LARGE_INVOICE_AMOUNT) warnings.push("Large invoice recommended for accounting review.");
  return warnings;
}

function buildConfidence(fields: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      const present = Array.isArray(value) ? value.length > 0 : Boolean(value);
      return [key, present ? "medium" : "low"];
    })
  ) as ParsedInvoiceText["fieldConfidence"];
}

function extractAddressBlock(lines: string[], labels: string[]) {
  const start = lines.findIndex((line) => labels.some((label) => line.toLowerCase().startsWith(label)));
  if (start === -1) return [];
  const block: string[] = [];

  for (const line of lines.slice(start, start + 6)) {
    if (block.length && /^(bill to|ship to|invoice|date|due|description|subtotal|total|terms)/i.test(line)) break;
    block.push(line.replace(/^(bill to|billing|ship to|shipping)\s*[:#-]?\s*/i, "").trim());
  }

  return block.filter(Boolean);
}

function findStateCode(value: string) {
  const upper = value.toUpperCase();
  const codeMatch = upper.match(/\b([A-Z]{2})\b/g)?.find((code) => STATE_CODES.has(code));
  if (codeMatch) return codeMatch;

  const state = US_STATES_AND_DC.find((item) => new RegExp(`\\b${item.name}\\b`, "i").test(value));
  return state?.code;
}

function extractUnknownFields(text: string) {
  const fields: Record<string, string> = {};
  for (const [key, pattern] of Object.entries(UNKNOWN_FIELD_PATTERNS)) {
    const value = matchField(text, pattern);
    if (value) fields[key] = value;
  }
  return fields;
}

function matchField(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1]?.trim();
}

function parseMoney(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? roundCurrency(parsed) : undefined;
}

function parseNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function cleanName(value?: string) {
  if (!value) return undefined;
  const cleaned = value.replace(/^\s*[:#-]\s*/, "").trim();
  if (/^(bill to|ship to|billing|shipping|sold to|customer)$/i.test(cleaned)) return undefined;
  return cleaned && cleaned !== "." && cleaned.length > 1 ? cleaned : undefined;
}

function firstNonAddressLine(block: string[]) {
  return block.find((line) => {
    const cleaned = cleanName(line);
    return cleaned && !/\b[A-Z]{2}\b\s+\d{5}/.test(cleaned) && !/\d/.test(cleaned);
  });
}

function bestCustomerName(customerName: string | undefined, billToBlock: string[], shipToBlock: string[]) {
  return customerName ?? firstNonAddressLine(billToBlock) ?? firstNonAddressLine(shipToBlock);
}

function normalizeInvoiceNumber(value?: string) {
  if (!value) return undefined;
  return value.trim().replace(/\s+/, "-").toUpperCase();
}
