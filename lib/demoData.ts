import { REVIEW_FLAGS } from "@/lib/constants";
import type { Company, Invoice, NexusRule } from "@/types";

export const demoCompany: Company = {
  id: "company-xemelgo-demo",
  name: "Xemelgo Demo Operations",
};

export const demoRules: NexusRule[] = [
  {
    id: "rule-tx",
    companyId: demoCompany.id,
    stateCode: "TX",
    stateName: "Texas",
    thresholdAmount: 500000,
    saasTaxable: true,
    hardwareTaxable: true,
    servicesTaxable: false,
    sourceUrl: "https://comptroller.texas.gov/",
    lastReviewed: "2026-01-08",
    notes: "Demo rule: SaaS and hardware counted, services excluded pending accounting review.",
  },
  {
    id: "rule-ca",
    companyId: demoCompany.id,
    stateCode: "CA",
    stateName: "California",
    thresholdAmount: 600000,
    saasTaxable: false,
    hardwareTaxable: true,
    servicesTaxable: false,
    sourceUrl: "https://www.cdtfa.ca.gov/",
    lastReviewed: "2026-01-08",
    notes: "Demo rule: SaaS and professional services excluded; hardware counted.",
  },
  {
    id: "rule-il",
    companyId: demoCompany.id,
    stateCode: "IL",
    stateName: "Illinois",
    thresholdAmount: 500000,
    saasTaxable: true,
    hardwareTaxable: true,
    servicesTaxable: true,
    sourceUrl: "https://tax.illinois.gov/",
    lastReviewed: "2026-01-09",
    notes: "Demo rule: all configured categories counted.",
  },
  {
    id: "rule-ny",
    companyId: demoCompany.id,
    stateCode: "NY",
    stateName: "New York",
    thresholdAmount: 500000,
    saasTaxable: true,
    hardwareTaxable: true,
    servicesTaxable: true,
    sourceUrl: "https://www.tax.ny.gov/",
    lastReviewed: "2026-01-09",
    notes: "Demo rule: category completeness is emphasized for review queue scenarios.",
  },
  {
    id: "rule-wa",
    companyId: demoCompany.id,
    stateCode: "WA",
    stateName: "Washington",
    thresholdAmount: 500000,
    saasTaxable: false,
    hardwareTaxable: true,
    servicesTaxable: false,
    sourceUrl: "https://dor.wa.gov/",
    lastReviewed: "2026-01-10",
    notes: "Demo rule: hardware counted; SaaS and services excluded.",
  },
];

export const demoInvoices: Invoice[] = [
  invoice("inv-1001", "INV-1001", "2026-01-12", "Lone Star Foods", "TX", "TX", 98000, 98000, "approved", "safe", [
    line("li-1001-1", "Connected operations platform annual subscription", "saas", 98000, 98000),
  ]),
  invoice("inv-1006", "INV-1006", "2026-02-20", "Austin Cold Storage", "TX", "TX", 124000, 124000, "approved", "watch", [
    line("li-1006-1", "Workflow software license", "saas", 84000, 84000),
    line("li-1006-2", "Gateway hardware bundle", "hardware", 40000, 40000),
  ]),
  invoice("inv-1012", "INV-1012", "2026-03-18", "Fort Worth Manufacturing", "TX", "TX", 88000, 88000, "approved", "watch", [
    line("li-1012-1", "Plant visibility modules", "hardware", 88000, 88000),
  ]),
  invoice("inv-1027", "INV-1027", "2026-04-06", "Gulf Coast Robotics", "TX", "LA", 132000, 132000, "approved", "watch", [
    line("li-1027-1", "Nexus software suite", "saas", 92000, 92000),
    line("li-1027-2", "Deployment hardware", "hardware", 40000, 40000),
  ], [REVIEW_FLAGS.SHIP_BILL_MISMATCH]),
  invoice("inv-1048", "INV-1048", "2026-05-08", "Dallas Fulfillment Group", "TX", "TX", 62000, 52000, "needs_review", "warning", [
    line("li-1048-1", "SaaS expansion seats", "saas", 32000, 32000),
    line("li-1048-2", "Warehouse scanner hardware", "hardware", 20000, 20000),
    line("li-1048-3", "Implementation advisory", "services", 10000, 0),
  ], [REVIEW_FLAGS.MAY_CROSS_THRESHOLD, REVIEW_FLAGS.LARGE_INVOICE]),
  invoice("inv-1015", "INV-1015", "2026-03-26", "Sacramento Biologics", "CA", "CA", 175000, 45000, "approved", "safe", [
    line("li-1015-1", "Operations SaaS platform", "saas", 130000, 0),
    line("li-1015-2", "Device kits", "hardware", 45000, 45000),
  ]),
  invoice("inv-1021", "INV-1021", "2026-04-16", "Bay Area Fresh", "CA", "CA", 92000, 22000, "approved", "safe", [
    line("li-1021-1", "Subscription renewal", "saas", 70000, 0),
    line("li-1021-2", "Tablet stands", "hardware", 22000, 22000),
  ]),
  invoice("inv-1034", "INV-1034", "2026-04-28", "Anaheim Assembly", "CA", "CA", 118000, 38000, "approved", "safe", [
    line("li-1034-1", "License expansion", "saas", 80000, 0),
    line("li-1034-2", "Sensor hardware", "hardware", 38000, 38000),
  ]),
  invoice("inv-1041", "INV-1041", "2026-05-02", "Fresno Cold Chain", "CA", "CA", -9000, -9000, "approved", "safe", [
    line("li-1041-1", "Credit memo for returned hardware", "hardware", -9000, -9000),
  ]),
  invoice("inv-1003", "INV-1003", "2026-01-15", "Chicago Logistics", "IL", "IL", 115000, 115000, "approved", "warning", [
    line("li-1003-1", "Platform subscription", "saas", 115000, 115000),
  ]),
  invoice("inv-1009", "INV-1009", "2026-02-28", "Evanston Packaging", "IL", "IL", 135000, 135000, "approved", "warning", [
    line("li-1009-1", "Hardware and connected devices", "hardware", 135000, 135000),
  ]),
  invoice("inv-1019", "INV-1019", "2026-04-12", "Peoria Food Systems", "IL", "IL", 128000, 128000, "approved", "warning", [
    line("li-1019-1", "Professional services rollout", "services", 128000, 128000),
  ]),
  invoice("inv-1030", "INV-1030", "2026-04-21", "Naperville Supply", "IL", "IL", 102000, 102000, "approved", "warning", [
    line("li-1030-1", "Annual software and support", "saas", 102000, 102000),
  ]),
  invoice("inv-1049", "INV-1049", "2026-05-09", "Rockford Kitchens", "IL", "IL", 26000, 26000, "needs_review", "crossed", [
    line("li-1049-1", "Hardware expansion pack", "hardware", 26000, 26000),
  ], [REVIEW_FLAGS.CROSSED_THRESHOLD]),
  invoice("inv-1007", "INV-1007", "2026-02-22", "Brooklyn Provisions", "NY", "NY", 64000, 64000, "approved", "safe", [
    line("li-1007-1", "Monitoring platform", "saas", 64000, 64000),
  ]),
  invoice("inv-1024", "INV-1024", "2026-04-18", "Queens Distribution", "NY", "NJ", 71000, 71000, "needs_review", "needs_review", [
    line("li-1024-1", "Unclassified invoice bundle", "other", 71000, 71000, true),
  ], [REVIEW_FLAGS.MISSING_CATEGORY, REVIEW_FLAGS.CATEGORY_REVIEW, REVIEW_FLAGS.SHIP_BILL_MISMATCH]),
  invoice("inv-1038", "INV-1038", "2026-04-30", "Buffalo Medical Supply", "NY", "NY", 0, 0, "draft", "safe", [
    line("li-1038-1", "Draft placeholder line", "services", 0, 0),
  ]),
  invoice("inv-1043", "INV-1043", "2026-05-04", "Manhattan Food Labs", "NY", "NY", 58000, 58000, "needs_review", "needs_review", [
    line("li-1043-1", "Invoice text requires category confirmation", "other", 58000, 58000, true),
  ], [REVIEW_FLAGS.MISSING_CATEGORY, REVIEW_FLAGS.CATEGORY_REVIEW, REVIEW_FLAGS.LARGE_INVOICE]),
  invoice("inv-1004", "INV-1004", "2026-01-18", "Seattle Farms", "WA", "WA", 87000, 27000, "approved", "safe", [
    line("li-1004-1", "SaaS access", "saas", 60000, 0),
    line("li-1004-2", "Edge devices", "hardware", 27000, 27000),
  ]),
  invoice("inv-1017", "INV-1017", "2026-04-04", "Spokane Packaging", "WA", "WA", 76000, 26000, "approved", "safe", [
    line("li-1017-1", "Cloud subscription", "saas", 50000, 0),
    line("li-1017-2", "Hardware replenishment", "hardware", 26000, 26000),
  ]),
  invoice("inv-1035", "INV-1035", "2026-04-29", "Tacoma Wholesale", "WA", "WA", 38000, 0, "approved", "safe", [
    line("li-1035-1", "Professional services workshop", "services", 38000, 0),
  ]),
  invoice("inv-1028", "INV-1028", "2026-04-20", "Portland Specialty Foods", null, "OR", 44000, 0, "needs_review", "needs_review", [
    line("li-1028-1", "Invoice missing ship-to state", "saas", 44000, 0),
  ], [REVIEW_FLAGS.MISSING_SHIP_TO]),
  invoice("inv-1033", "INV-1033", "2026-04-26", "Denver Cold Chain", "CO", "CO", 54000, 0, "needs_review", "needs_review", [
    line("li-1033-1", "Large invoice pending state rule configuration", "saas", 54000, 0),
  ], [REVIEW_FLAGS.LARGE_INVOICE]),
  invoice("inv-1039-a", "INV-1039", "2026-05-01", "Phoenix Fresh", "AZ", "AZ", 18000, 0, "needs_review", "needs_review", [
    line("li-1039-1", "Potential duplicate import", "hardware", 18000, 0),
  ], [REVIEW_FLAGS.DUPLICATE_INVOICE]),
  invoice("inv-1039-b", "INV-1039", "2026-05-01", "Phoenix Fresh", "AZ", "AZ", 18000, 0, "needs_review", "needs_review", [
    line("li-1039-2", "Potential duplicate import", "hardware", 18000, 0),
  ], [REVIEW_FLAGS.DUPLICATE_INVOICE]),
];

function invoice(
  id: string,
  invoiceNumber: string,
  invoiceDate: string,
  customerName: string,
  shipToState: string | null,
  billToState: string | null,
  totalAmount: number,
  taxableAmount: number,
  reviewStatus: Invoice["reviewStatus"],
  riskStatus: Invoice["riskStatus"],
  lineItems: Invoice["lineItems"],
  flags: Invoice["flags"] = []
): Invoice {
  return {
    id,
    companyId: demoCompany.id,
    invoiceNumber,
    invoiceDate,
    dueDate: "2026-06-15",
    customerName,
    shipToState,
    billToState,
    totalAmount,
    taxableAmount,
    sourceType: "manual",
    reviewStatus,
    riskStatus,
    notes: flags.includes(REVIEW_FLAGS.MISSING_SHIP_TO) ? "Skipped from threshold totals until ship-to state is added." : undefined,
    lineItems,
    flags,
  };
}

function line(
  id: string,
  description: string,
  category: Invoice["lineItems"][number]["category"],
  amount: number,
  taxableAmount: number,
  needsReview = false
) {
  return { id, description, category, amount, taxableAmount, needsReview };
}
