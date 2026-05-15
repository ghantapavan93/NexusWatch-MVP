import { NextRequest, NextResponse } from "next/server";
import { demoCompany } from "@/lib/demoData";
import { parseInvoiceText } from "@/lib/invoiceTextParser";
import { extractTextWithPdfOcr } from "@/lib/pdfOcr";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const PDF_BUCKET = "invoice-pdfs";
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ message: "Supabase is not configured. PDF was not uploaded." }, { status: 503 });
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase client is unavailable. PDF was not uploaded." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Upload request must include a PDF file." }, { status: 400 });
  }
  const file = formData.get("file");
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "draft-invoice");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Choose a PDF file before uploading." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ message: "Only PDF invoices can be uploaded." }, { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ message: "PDF must be 10 MB or smaller for this MVP upload flow." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id;
  const safeInvoiceNumber = invoiceNumber.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${companyId}/${safeInvoiceNumber}/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage.from(PDF_BUCKET).upload(storagePath, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (error) {
    return NextResponse.json(
      {
        message: error.message.includes("Bucket not found")
          ? "PDF bucket is not ready. Run the Supabase PDF storage SQL first."
          : error.message,
      },
      { status: 500 }
    );
  }

  const { data } = supabase.storage.from(PDF_BUCKET).getPublicUrl(storagePath);
  const textBasedExtraction = await extractTextFromTextBasedPdf(bytes);
  const ocrResult = textBasedExtraction ? null : await extractTextWithPdfOcr(bytes);
  const extractedText = sanitizeExtractedText(textBasedExtraction || ocrResult?.text || "");
  const detected = extractedText ? parseInvoiceText(extractedText) : null;
  const extractionMethod = textBasedExtraction ? "pdf_text" : ocrResult?.text ? "ocr" : "manual_review";
  const extractionStatus = detected ? (extractionMethod === "ocr" ? "ocr_needs_review" : "extracted_needs_review") : "manual_review_required";
  const validationWarnings = [
    ...(detected?.warnings ?? ["Manual review required. PDF fields could not be confidently detected."]),
    ...(ocrResult?.warnings ?? []),
    ...(extractionMethod === "ocr" ? ["OCR detected text from a scanned PDF. Review required before use."] : []),
  ];

  const { data: document, error: documentError } = await insertDocumentMetadataWithFallback(supabase, {
    company_id: companyId,
    original_file_name: file.name,
    storage_bucket: PDF_BUCKET,
    storage_path: storagePath,
    public_url: data.publicUrl,
    file_size_bytes: file.size,
    mime_type: "application/pdf",
    upload_status: "uploaded",
    extraction_status: extractionStatus,
    raw_text: extractedText ?? null,
    extracted_fields: detected ?? {},
    unknown_fields: detected?.unknownFields ?? {},
    field_confidence: detected?.fieldConfidence ?? {},
    validation_warnings: validationWarnings,
    extraction_method: extractionMethod,
    ocr_confidence: ocrResult?.confidence ?? null,
    detected_invoice_number: detected?.invoiceNumber ?? null,
    detected_total_amount: detected?.totalAmount ?? null,
    detected_ship_to_state: detected?.shipToState ?? null,
    detected_bill_to_state: detected?.billToState ?? null,
  });

  if (documentError || !document) {
    return NextResponse.json(
      { message: documentError?.message ?? "PDF uploaded, but document metadata could not be saved." },
      { status: 500 }
    );
  }

  await supabase.from("audit_logs").insert({
    company_id: companyId,
    entity_type: "invoice_pdf",
    action: "uploaded",
    actor: "Sara Demo User",
    message: `PDF ${file.name} uploaded for ${invoiceNumber}.`,
    metadata: {
      invoice_number: invoiceNumber,
      document_id: document.id,
      file_name: file.name,
      storage_path: storagePath,
      extraction_status: extractionStatus,
      extraction_method: extractionMethod,
      ocr_confidence: ocrResult?.confidence ?? null,
      warning_count: validationWarnings.length,
      source: "upload_pdf",
    },
  });

  return NextResponse.json({
    message: detected && extractionMethod === "ocr"
      ? "PDF uploaded and linked. OCR detected fields for manual review."
      : detected
      ? "PDF uploaded and linked. Text fields were detected for manual review."
      : "PDF uploaded and linked for manual review.",
    documentId: document.id,
    fileName: file.name,
    storagePath,
    publicUrl: data.publicUrl,
    extractedText: extractedText || undefined,
    extractionStatus,
    extractionMethod,
    ocrConfidence: ocrResult?.confidence ?? null,
    detectedFields: detected ?? undefined,
    unknownFields: detected?.unknownFields ?? {},
    fieldConfidence: detected?.fieldConfidence ?? {},
    validationWarnings,
    pdfUpload: {
      documentId: document.id,
      fileName: file.name,
      storagePath,
      publicUrl: data.publicUrl,
      contentType: file.type,
      size: file.size,
      extractedText: extractedText || undefined,
      extractionStatus,
      extractionMethod,
      ocrConfidence: ocrResult?.confidence ?? null,
      detectedFields: detected ?? undefined,
      unknownFields: detected?.unknownFields ?? {},
      fieldConfidence: detected?.fieldConfidence ?? {},
      validationWarnings,
    },
  });
}

async function insertDocumentMetadataWithFallback(
  supabase: NonNullable<ReturnType<typeof createSupabaseClient>>,
  payload: Record<string, unknown>
) {
  const insert = (documentPayload: Record<string, unknown>) =>
    supabase.from("invoice_documents").insert(documentPayload).select("id").single();

  const result = await insert(payload);
  if (!isMissingReviewColumnError(result.error)) return result;

  const fallbackPayload = { ...payload };
  delete fallbackPayload.raw_text;
  delete fallbackPayload.field_confidence;
  delete fallbackPayload.validation_warnings;
  delete fallbackPayload.detected_invoice_number;
  delete fallbackPayload.detected_total_amount;
  delete fallbackPayload.detected_ship_to_state;
  delete fallbackPayload.detected_bill_to_state;
  delete fallbackPayload.extraction_method;
  delete fallbackPayload.ocr_confidence;
  return insert(fallbackPayload);
}

async function extractTextFromTextBasedPdf(bytes: Buffer) {
  const pdfJsText = await extractTextWithPdfJs(bytes);
  if (looksLikeInvoiceText(pdfJsText)) return pdfJsText.slice(0, 40000);

  const raw = bytes.toString("latin1");
  const literalStrings = Array.from(raw.matchAll(/\(([^()]{3,})\)/g))
    .map((match) => decodePdfString(match[1]))
    .filter((value) => /[A-Za-z0-9]/.test(value));
  const text = sanitizeExtractedText(literalStrings.join("\n").replace(/\s+\n/g, "\n").trim());
  return looksLikeInvoiceText(text) ? text.slice(0, 40000) : "";
}

async function extractTextWithPdfJs(bytes: Buffer) {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const document = await pdfjs.getDocument({
      data: new Uint8Array(bytes),
      disableFontFace: true,
      isEvalSupported: false,
      useSystemFonts: true,
    } as never).promise;
    const pageLimit = Math.min(document.numPages, 10);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = rebuildPdfTextLines(content.items);
      if (pageText) pages.push(pageText);
    }

    return sanitizeExtractedText(pages.join("\n\n"));
  } catch {
    return "";
  }
}

function rebuildPdfTextLines(items: unknown[]) {
  const textItems = items
    .map((item) => {
      const textItem = item as { str?: unknown; transform?: unknown; width?: unknown };
      const transform = Array.isArray(textItem.transform) ? textItem.transform : [];
      const str = typeof textItem.str === "string" ? textItem.str.trim() : "";
      const x = typeof transform[4] === "number" ? transform[4] : 0;
      const y = typeof transform[5] === "number" ? transform[5] : 0;
      const width = typeof textItem.width === "number" ? textItem.width : str.length * 5;
      return { str, x, y, width };
    })
    .filter((item) => item.str);

  const rows: { y: number; items: typeof textItems }[] = [];
  for (const item of textItems.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
    if (row) {
      row.items.push(item);
      row.y = (row.y + item.y) / 2;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .reduce<{ text: string; right: number }>(
          (line, item) => {
            const gap = item.x - line.right;
            const separator = line.text && gap > 80 ? "\t" : line.text && gap > 8 ? " " : "";
            return {
              text: `${line.text}${separator}${item.str}`.trim(),
              right: Math.max(line.right, item.x + item.width),
            };
          },
          { text: "", right: 0 }
        ).text
    )
    .filter(Boolean)
    .join("\n");
}

function looksLikeInvoiceText(text: string) {
  return text.length > 40 && /\b(invoice|total|amount|customer|ship\s*to|bill\s*to|due\s*date)\b/i.test(text);
}

function decodePdfString(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .trim();
}

function sanitizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[^\S\t\r\n]+/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .trim();
}

function isMissingReviewColumnError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.message?.includes("raw_text") ||
        error.message?.includes("field_confidence") ||
        error.message?.includes("validation_warnings") ||
        error.message?.includes("detected_invoice_number") ||
        error.message?.includes("detected_total_amount") ||
        error.message?.includes("detected_ship_to_state") ||
        error.message?.includes("detected_bill_to_state") ||
        error.message?.includes("extraction_method") ||
        error.message?.includes("ocr_confidence"))
  );
}
