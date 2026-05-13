export type Category = "saas" | "hardware" | "services" | "other";

export type JsonRecord = Record<string, unknown>;

export type InvoiceStatus = "draft" | "needs_review" | "accounting_review" | "approved" | "exported";

export type OperationalStatus = "draft" | "open" | "reviewed" | "exported";

export type ThresholdStatus = "safe" | "watch" | "warning" | "crossed";

export type ReviewFlag =
  | "missing_ship_to"
  | "missing_category"
  | "ship_bill_mismatch"
  | "may_cross_threshold"
  | "crossed_threshold"
  | "duplicate_invoice"
  | "large_invoice"
  | "category_review";

export type Company = {
  id: string;
  name: string;
};

export type NexusRule = {
  id: string;
  companyId: string;
  stateCode: string;
  stateName: string;
  thresholdAmount: number;
  saasTaxable: boolean;
  hardwareTaxable: boolean;
  servicesTaxable: boolean;
  notes?: string;
  sourceUrl?: string;
  lastReviewed?: string;
};

export type LineItem = {
  id: string;
  description: string;
  category: Category;
  amount: number;
  taxableAmount?: number;
  needsReview?: boolean;
};

export type Invoice = {
  id: string;
  companyId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  customerName: string;
  shipToState?: string | null;
  billToState?: string | null;
  totalAmount: number;
  taxableAmount: number;
  sourceType: "manual" | "paste" | "pdf_preview";
  reviewStatus: InvoiceStatus;
  riskStatus: ThresholdStatus | "needs_review";
  notes?: string;
  rawText?: string;
  documentId?: string | null;
  pdfFileName?: string | null;
  pdfStoragePath?: string | null;
  pdfPublicUrl?: string | null;
  pdfUploadedAt?: string | null;
  extractionStatus?: "manual_review_required" | string | null;
  extractedFields?: JsonRecord | null;
  unknownFields?: JsonRecord | null;
  extractionConfidence?: number | null;
  reviewNotes?: string | null;
  accountingReviewReason?: string | null;
  accountingReviewCompletedAt?: string | null;
  sourceDocument?: {
    detectedInvoiceNumber?: string | null;
    detectedTotalAmount?: number | null;
    detectedShipToState?: string | null;
    detectedBillToState?: string | null;
    fieldConfidence?: JsonRecord | null;
    validationWarnings?: string[] | null;
    extractionMethod?: string | null;
    ocrConfidence?: number | null;
  } | null;
  lineItems: LineItem[];
  flags: ReviewFlag[];
};

export type StateNexusSummary = {
  stateCode: string;
  stateName: string;
  thresholdAmount: number;
  taxableTotal: number;
  invoiceTotal: number;
  excludedTotal: number;
  percentUsed: number;
  remaining: number;
  status: ThresholdStatus;
  latestInvoice?: Invoice;
  nextAction: string;
};

export type ExportType =
  | "state_transactions"
  | "single_invoice"
  | "review_queue"
  | "threshold_summary"
  | "rules_reference";
