import { z } from "zod";

export const LineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Line item description is required"),
  category: z.enum(["saas", "hardware", "services", "other"]),
  amount: z.coerce.number(),
});

export const CreateInvoiceSchema = z.object({
  invoiceNumber: z
    .string()
    .min(1, "Invoice number is required")
    .max(50, "Invoice number is too long"),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required"),
  shipToState: z.string().length(2).optional().nullable(),
  billToState: z.string().length(2).optional().nullable(),
  notes: z.string().optional(),
  rawText: z.string().optional(),
  pdfUpload: z
    .object({
      documentId: z.string().uuid(),
      fileName: z.string().min(1),
      storagePath: z.string().min(1),
      publicUrl: z.string().url().optional(),
      contentType: z.string().optional(),
      size: z.number().optional(),
      extractionStatus: z.enum(["manual_review_required", "extracted_needs_review", "extraction_failed"]),
      detectedFields: z.record(z.unknown()).optional(),
      unknownFields: z.record(z.unknown()).optional(),
      fieldConfidence: z.record(z.unknown()).optional(),
      validationWarnings: z.array(z.string()).optional(),
    })
    .optional(),
  extractedFields: z.record(z.unknown()).optional(),
  unknownFields: z.record(z.unknown()).optional(),
  extractionConfidence: z.coerce.number().optional().nullable(),
  reviewNotes: z.string().optional(),
  lineItems: z.array(LineItemSchema).min(1, "At least one line item is required"),
});

export const NexusRuleSchema = z.object({
  stateCode: z.string().length(2),
  stateName: z.string().min(1),
  thresholdAmount: z.coerce.number().min(0),
  saasTaxable: z.boolean(),
  hardwareTaxable: z.boolean(),
  servicesTaxable: z.boolean(),
  notes: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  lastReviewed: z.coerce.date().optional().nullable(),
});

export const ExportFilterSchema = z.object({
  stateCode: z.string().length(2).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  exportType: z.enum([
    "state_transactions",
    "single_invoice",
    "review_queue",
    "threshold_summary",
    "rules_reference",
  ]),
  invoiceNumber: z.string().min(1).max(50).optional(),
});
