import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateSupabaseInvoiceStatus } from "@/lib/supabaseWrites";

const StatusSchema = z.object({
  status: z.enum(["draft", "open", "reviewed", "exported"]),
  reviewStatus: z.enum(["draft", "needs_review", "accounting_review", "approved", "exported"]),
  auditSource: z.string().optional(),
  auditAction: z.string().optional(),
  riskReasons: z.array(z.string()).optional(),
  accountingReviewCompleted: z.boolean().optional(),
  pdfUpload: z
    .object({
      documentId: z.string().uuid(),
      fileName: z.string().min(1),
      storagePath: z.string().min(1),
      publicUrl: z.string().url().optional(),
      contentType: z.string().optional(),
      size: z.number().optional(),
      extractionStatus: z.enum(["manual_review_required", "extracted_needs_review", "ocr_needs_review", "extraction_failed"]),
      extractionMethod: z.enum(["pdf_text", "ocr", "manual_review"]).optional(),
      ocrConfidence: z.number().nullable().optional(),
      detectedFields: z.record(z.unknown()).optional(),
      unknownFields: z.record(z.unknown()).optional(),
      fieldConfidence: z.record(z.unknown()).optional(),
      validationWarnings: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = StatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const result = await updateSupabaseInvoiceStatus(id, parsed.data.status, parsed.data.reviewStatus, {
    auditSource: parsed.data.auditSource,
    auditAction: parsed.data.auditAction,
    riskReasons: parsed.data.riskReasons,
    accountingReviewCompleted: parsed.data.accountingReviewCompleted,
    pdfUpload: parsed.data.pdfUpload,
  });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({
    mode: "supabase_write",
    message: result.message,
    invoice: result.invoice,
  });
}
