"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Plus, Send, Sparkles, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Toast } from "@/components/shared/Toast";
import { demoInvoices, demoRules } from "@/lib/demoData";
import { formatCurrency, formatPercent } from "@/lib/format";
import { parseInvoiceText, type ParsedInvoiceText } from "@/lib/invoiceTextParser";
import { buildStateSummaries, isLineTaxable, previewInvoiceImpact } from "@/lib/nexus";
import type { Category } from "@/types";

type IntakeMode = "pdf" | "paste" | "manual";

type DraftLineItem = {
  id: string;
  description: string;
  category: Category;
  amount: string;
};

type PdfUpload = {
  documentId: string;
  fileName: string;
  storagePath: string;
  publicUrl?: string;
  contentType?: string;
  size?: number;
  extractionStatus: "manual_review_required" | "extracted_needs_review" | "ocr_needs_review" | "extraction_failed";
  detectedFields?: ParsedInvoiceText;
  unknownFields?: Record<string, unknown>;
  fieldConfidence?: Record<string, unknown>;
  validationWarnings?: string[];
};

const categoryOptions: { value: Category; label: string }[] = [
  { value: "saas", label: "SaaS" },
  { value: "hardware", label: "Hardware" },
  { value: "services", label: "Professional Services" },
  { value: "other", label: "Other" },
];

export default function UploadPage() {
  const router = useRouter();
  const [mode, setMode] = useState<IntakeMode>("manual");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-1048-DRAFT");
  const [invoiceDate, setInvoiceDate] = useState("2026-05-08");
  const [dueDate, setDueDate] = useState("2026-06-15");
  const [customerName, setCustomerName] = useState("Dallas Fulfillment Group");
  const [shipToState, setShipToState] = useState("TX");
  const [billToState, setBillToState] = useState("TX");
  const [notes, setNotes] = useState("Manual intake draft for accounting review.");
  const [pastedText, setPastedText] = useState("");
  const [actionMessage, setActionMessage] = useState("Live preview updates as fields change.");
  const [toastMessage, setToastMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadedPdf, setUploadedPdf] = useState<PdfUpload | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([
    { id: "line-1", description: "SaaS expansion seats", category: "saas", amount: "32000" },
    { id: "line-2", description: "Warehouse scanner hardware", category: "hardware", amount: "20000" },
    { id: "line-3", description: "Implementation advisory", category: "services", amount: "10000" },
  ]);

  const selectedRule = demoRules.find((rule) => rule.stateCode === shipToState);
  const stateSummary = buildStateSummaries(demoRules, demoInvoices).find((state) => state.stateCode === shipToState);
  const parsedPastedInvoice = useMemo(() => (pastedText.trim() ? parseInvoiceText(pastedText) : null), [pastedText]);
  const detectedMismatchWarning =
    uploadedPdf?.detectedFields?.invoiceNumber &&
    invoiceNumber &&
    uploadedPdf.detectedFields.invoiceNumber.toLowerCase() !== invoiceNumber.toLowerCase()
      ? "PDF invoice number does not match form invoice number. Review required."
      : "";

  const totals = useMemo(() => {
    const invoiceTotal = lineItems.reduce((sum, item) => sum + parseAmount(item.amount), 0);
    const taxableTotal = selectedRule
      ? lineItems.reduce(
          (sum, item) => sum + (isLineTaxable(selectedRule, item.category) ? parseAmount(item.amount) : 0),
          0
        )
      : 0;

    return { invoiceTotal, taxableTotal };
  }, [lineItems, selectedRule]);

  const impact = selectedRule
    ? previewInvoiceImpact(stateSummary?.taxableTotal ?? 0, totals.taxableTotal, selectedRule.thresholdAmount)
    : null;
  const missingShipTo = !shipToState;
  const mayPushOver = Boolean(impact?.mayPushOver);
  const projectedWarnings = useMemo(() => {
    const warnings = new Set<string>();
    if (missingShipTo) warnings.add("Missing ship-to state; threshold calculation is skipped until reviewed.");
    if (detectedMismatchWarning) warnings.add(detectedMismatchWarning);
    if (lineItems.some((item) => item.category === "other")) warnings.add("Missing or unknown category requires review.");
    if (shipToState && billToState && shipToState !== billToState) warnings.add("Bill-to state differs from ship-to state.");
    if (totals.invoiceTotal < 0 || lineItems.some((item) => parseAmount(item.amount) < 0)) warnings.add("Negative amount detected.");
    if (totals.invoiceTotal === 0 || lineItems.some((item) => parseAmount(item.amount) === 0)) warnings.add("Zero amount detected.");
    if (Math.abs(totals.invoiceTotal) >= 50000) warnings.add("Large invoice recommended for accounting review.");
    if ((impact?.after.percent ?? 0) >= 75) warnings.add("Projected threshold usage reaches a review band.");
    if ((impact?.after.percent ?? 0) >= 90) warnings.add("Projected threshold usage reaches the 90% warning band.");
    if (impact?.mayPushOver) warnings.add("Invoice may cross the configured threshold.");
    return Array.from(warnings);
  }, [billToState, detectedMismatchWarning, impact, lineItems, missingShipTo, shipToState, totals.invoiceTotal]);

  function updateLineItem(id: string, patch: Partial<DraftLineItem>) {
    setLineItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addLineItem() {
    setLineItems((items) => [
      ...items,
      { id: `line-${Date.now()}`, description: "", category: "saas", amount: "0" },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((items) => (items.length === 1 ? items : items.filter((item) => item.id !== id)));
  }

  async function uploadPdf() {
    if (!pdfFile) {
      setActionMessage("Choose a PDF file before uploading.");
      return;
    }

    setIsUploadingPdf(true);
    setActionMessage("Uploading PDF to Supabase Storage...");

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("invoiceNumber", invoiceNumber);

      const response = await fetch("/api/uploads/pdf", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        message?: string;
        documentId?: string;
        fileName?: string;
        storagePath?: string;
        publicUrl?: string;
        extractionStatus?: PdfUpload["extractionStatus"];
        detectedFields?: ParsedInvoiceText;
        unknownFields?: Record<string, unknown>;
        fieldConfidence?: Record<string, unknown>;
        validationWarnings?: string[];
        pdfUpload?: PdfUpload;
      };

      const uploaded = result.pdfUpload ??
        (result.documentId && result.fileName && result.storagePath && result.extractionStatus
          ? {
              documentId: result.documentId,
              fileName: result.fileName,
              storagePath: result.storagePath,
              publicUrl: result.publicUrl,
              contentType: "application/pdf",
              size: pdfFile.size,
              extractionStatus: result.extractionStatus,
              detectedFields: result.detectedFields,
              unknownFields: result.unknownFields,
              fieldConfidence: result.fieldConfidence,
              validationWarnings: result.validationWarnings,
            }
          : null);

      if (!response.ok || !uploaded) {
        setActionMessage(result.message ?? "PDF could not be uploaded.");
        return;
      }

      setUploadedPdf(uploaded);
      setActionMessage(result.message ?? "PDF uploaded and linked for manual review.");
      setToastMessage(
        uploaded.detectedFields
          ? "PDF uploaded. Fields detected for manual review."
          : "PDF uploaded and linked for manual review."
      );
    } catch {
      setActionMessage("PDF could not be uploaded. Check the local server and Supabase Storage setup.");
    } finally {
      setIsUploadingPdf(false);
    }
  }

  async function saveInvoice(status: "draft" | "open", reviewStatus: "draft" | "needs_review") {
    setIsSaving(true);
    setActionMessage("Saving invoice to Supabase...");

    try {
      const existingInvoice = Boolean(savedInvoiceId);
      const extractedPayload = buildExtractedPayload();
      const response = await fetch(existingInvoice ? `/api/invoices/${savedInvoiceId}/status` : "/api/invoices", {
        method: existingInvoice ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          existingInvoice
            ? {
                status,
                reviewStatus,
                pdfUpload: uploadedPdf ?? undefined,
                auditSource:
                  status === "open" && reviewStatus === "needs_review"
                    ? "upload_send_to_review_from_draft"
                    : "upload_save_existing_draft",
              }
            : {
                invoiceNumber,
                invoiceDate,
                dueDate: dueDate || null,
                customerName,
                shipToState: shipToState || null,
                billToState: billToState || null,
                notes,
                rawText: pastedText,
                extractedFields: extractedPayload.extractedFields,
                unknownFields: extractedPayload.unknownFields,
                extractionConfidence: extractedPayload.extractionConfidence,
                reviewNotes: extractedPayload.reviewNotes,
                pdfUpload: uploadedPdf ?? undefined,
                status,
                reviewStatus: status === "open" ? "needs_review" : reviewStatus,
                lineItems: lineItems.map((item) => ({
                  description: item.description,
                  category: item.category,
                  amount: parseAmount(item.amount),
                })),
              }
        ),
      });
      const result = (await response.json()) as { message?: string; invoice?: { id?: string; invoiceNumber?: string } };

      if (!response.ok) {
        setActionMessage(result.message ?? "Invoice could not be saved.");
        return;
      }

      setActionMessage(result.message ?? "Invoice saved to Supabase.");
      setToastMessage(
        existingInvoice
          ? reviewStatus === "needs_review"
            ? "Draft moved to review queue."
            : `Invoice ${invoiceNumber} updated without creating a duplicate.`
          : `Invoice ${result.invoice?.invoiceNumber ?? invoiceNumber} saved to Supabase.`
      );
      setSavedInvoiceId(result.invoice?.id ?? savedInvoiceId);
      if (result.invoice?.id || result.invoice?.invoiceNumber) {
        router.refresh();
      }
    } catch {
      setActionMessage("Invoice could not be saved. Check the local server and Supabase connection.");
    } finally {
      setIsSaving(false);
    }
  }

  async function applyDetectedFields(source: "paste_text" | "pdf_text", detected: ParsedInvoiceText) {
    const normalized = normalizeDetectedInvoice(detected);
    const typedInvoiceNumber = invoiceNumber.trim();
    const shouldUseDetectedInvoiceNumber =
      Boolean(normalized.invoiceNumber) && (!typedInvoiceNumber || typedInvoiceNumber === "INV-1048-DRAFT");
    const invoiceMismatch =
      normalized.invoiceNumber &&
      typedInvoiceNumber &&
      typedInvoiceNumber !== "INV-1048-DRAFT" &&
      normalized.invoiceNumber.toLowerCase() !== typedInvoiceNumber.toLowerCase();

    if (shouldUseDetectedInvoiceNumber && normalized.invoiceNumber) setInvoiceNumber(normalized.invoiceNumber);
    if (normalized.invoiceDate) setInvoiceDate(normalized.invoiceDate);
    if (normalized.dueDate) setDueDate(normalized.dueDate);
    if (normalized.customerName) setCustomerName(normalized.customerName);
    if (normalized.shipToState) setShipToState(normalized.shipToState);
    if (normalized.billToState) setBillToState(normalized.billToState);
    if (normalized.lineItems.length) {
      setLineItems(
        normalized.lineItems.map((item, index) => ({
          id: `detected-${Date.now()}-${index}`,
          description: item.description,
          category: item.category,
          amount: String(item.amount),
        }))
      );
    }
    setNotes(() => {
      const base = "Detected fields applied for manual accounting review. Decision support only.";
      if (!invoiceMismatch) return base;
      return `${base} PDF/OCR invoice number ${normalized.invoiceNumber} did not replace manually entered invoice number ${typedInvoiceNumber}.`;
    });
    setActionMessage(
      invoiceMismatch
        ? `Detected fields applied except invoice number. Detected ${normalized.invoiceNumber}, current form has ${typedInvoiceNumber}. Review required.`
        : "Detected fields applied. Please review before this invoice affects nexus totals."
    );
    setToastMessage("Detected fields applied for review.");
    setMode("manual");

    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: source === "pdf_text" ? "invoice_document" : "invoice",
        action: "detected_fields_applied",
        metadata: {
          source,
          invoice_number: normalized.invoiceNumber ?? typedInvoiceNumber ?? null,
          field_count: normalized.fieldCount,
          warning_count: normalized.warnings.length + (invoiceMismatch ? 1 : 0),
          invoice_number_mismatch: Boolean(invoiceMismatch),
        },
      }),
    }).catch(() => undefined);
  }

  function buildExtractedPayload() {
    const detected = parsedPastedInvoice ?? uploadedPdf?.detectedFields ?? null;
    const warnings = [...projectedWarnings, ...(detected?.warnings ?? [])];
    return {
      extractedFields: detected ?? undefined,
      unknownFields: detected?.unknownFields ?? uploadedPdf?.unknownFields ?? undefined,
      extractionConfidence: detected ? calculateExtractionConfidence(detected) : null,
      reviewNotes: warnings.length ? warnings.join(" ") : undefined,
    };
  }

  return (
    <>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      <PageHeader
        title="Upload Invoice"
        description="Manual invoice intake for privacy-first review. Email scanning and QuickBooks integrations remain future roadmap items."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <section className="premium-card overflow-hidden p-0">
            <div className="grid border-b border-slate-200 md:grid-cols-4">
              <StepItem active number="1" title="Intake Method" detail="Choose how to add" />
              <StepItem number="2" title="Invoice Details" detail="Review detected data" />
              <StepItem number="3" title="Line Items" detail="Review categories" />
              <StepItem number="4" title="Review & Submit" detail="Preview impact" />
            </div>
            <div className="p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <IntakeOption
                active={mode === "pdf"}
                icon={<Upload className="h-5 w-5" />}
                title="Upload PDF"
                description="Attach invoice files for manual field review."
                onClick={() => setMode("pdf")}
              />
              <IntakeOption
                active={mode === "paste"}
                icon={<FileText className="h-5 w-5" />}
                title="Paste Invoice Text"
                description="Copy invoice text from a local folder or PDF."
                onClick={() => setMode("paste")}
              />
              <IntakeOption
                active={mode === "manual"}
                icon={<Plus className="h-5 w-5" />}
                title="Manual Entry"
                description="Enter fields directly for the MVP workflow."
                onClick={() => setMode("manual")}
              />
            </div>

            {mode === "pdf" ? (
              <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-gradient-to-br from-white to-blue-50/50 p-6">
                <label className="block text-sm font-semibold text-slate-900">
                  PDF invoice
                  <input
                    className="mt-3 block w-full text-sm text-slate-600"
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      setPdfFile(event.target.files?.[0] ?? null);
                      setUploadedPdf(null);
                    }}
                  />
                </label>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-600">
                    {uploadedPdf ? (
                      <span className="font-medium text-emerald-700">Uploaded: {uploadedPdf.fileName}</span>
                    ) : (
                      <span>{pdfFile ? `Selected: ${pdfFile.name}` : "No PDF uploaded yet"}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isUploadingPdf || !pdfFile}
                    onClick={uploadPdf}
                    className="primary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploadingPdf ? "Uploading..." : "Upload PDF"}
                  </button>
                </div>
                {uploadedPdf?.publicUrl ? (
                  <a
                    href={uploadedPdf.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
                  >
                    Open uploaded PDF
                  </a>
                ) : null}
                <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-800">
                  PDF uploaded and linked. NexusWatch checks embedded PDF text first, then uses OCR for scanned PDFs when possible. Manual review remains required.
                </p>
                {uploadedPdf?.detectedFields ? (
                  <ExtractedFieldsPreview
                    detected={uploadedPdf.detectedFields}
                    sourceLabel={uploadedPdf.extractionStatus === "ocr_needs_review" ? "PDF or OCR" : "PDF text"}
                    extraWarnings={detectedMismatchWarning ? [detectedMismatchWarning] : []}
                    onUse={() => applyDetectedFields("pdf_text", uploadedPdf.detectedFields!)}
                  />
                ) : null}
              </div>
            ) : null}

            {mode === "paste" ? (
              <>
                <label className="mt-5 block text-sm font-semibold text-slate-900">
                  Pasted invoice text
                  <textarea
                    value={pastedText}
                    onChange={(event) => setPastedText(event.target.value)}
                    className="mt-2 min-h-36 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
                    placeholder="Paste invoice text here, then confirm the manual fields below before saving."
                  />
                </label>
                {parsedPastedInvoice ? (
                  <ExtractedFieldsPreview
                    detected={parsedPastedInvoice}
                    sourceLabel="Pasted invoice text"
                    onUse={() => applyDetectedFields("paste_text", parsedPastedInvoice)}
                  />
                ) : null}
              </>
            ) : null}
            </div>
          </section>

          <section className="premium-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-950">Manual Entry</h2>
              {missingShipTo ? <StatusBadge status="needs_review" /> : <StatusBadge status={impact?.after.status ?? "safe"} />}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField label="Invoice number" value={invoiceNumber} onChange={setInvoiceNumber} />
              <TextField label="Customer name" value={customerName} onChange={setCustomerName} />
              <TextField label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} type="date" />
              <TextField label="Due date" value={dueDate} onChange={setDueDate} type="date" />
              <StateSelect label="Ship to state, primary" value={shipToState} onChange={setShipToState} allowBlank />
              <StateSelect label="Bill to state, secondary" value={billToState} onChange={setBillToState} />
              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
                />
              </label>
            </div>
          </section>

          <section className="premium-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Line Items</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Taxable total is calculated from the selected ship-to state demo rule.
                </p>
              </div>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center justify-center gap-2 secondary-button px-3 py-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add row
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="hidden grid-cols-[1fr_210px_160px_52px] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 md:grid">
                <div>Description</div>
                <div>Category</div>
                <div className="text-right">Amount</div>
                <div />
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {lineItems.map((item) => (
                  <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_210px_160px_52px] md:items-center">
                    <input
                      value={item.description}
                      onChange={(event) => updateLineItem(item.id, { description: event.target.value })}
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-100 focus:ring-4"
                      placeholder="Line description"
                    />
                    <select
                      value={item.category}
                      onChange={(event) => updateLineItem(item.id, { category: event.target.value as Category })}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-100 focus:ring-4"
                    >
                      {categoryOptions.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.amount}
                      onChange={(event) => updateLineItem(item.id, { amount: event.target.value })}
                      className="rounded-md border border-slate-200 px-3 py-2 text-right text-sm outline-none ring-blue-100 focus:ring-4"
                      inputMode="decimal"
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-red-600"
                      aria-label="Remove line item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <TotalBox label="Invoice total" value={formatCurrency(totals.invoiceTotal)} />
              <TotalBox label="Taxable total" value={missingShipTo ? "Skipped" : formatCurrency(totals.taxableTotal)} />
            </div>
          </section>

          <section className="premium-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">{actionMessage}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => saveInvoice("draft", "draft")}
                  className="secondary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => setActionMessage("Impact preview refreshed from local demo rules.")}
                  className="primary-button px-3 py-2 text-sm"
                >
                  Preview Impact
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => saveInvoice("open", "needs_review")}
                  className="primary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  Send to Review Queue
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="premium-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-950">Impact Preview</h2>
              {missingShipTo ? <StatusBadge status="needs_review" /> : <StatusBadge status={impact?.after.status ?? "safe"} />}
            </div>

            {missingShipTo ? (
              <div className="mt-5 rounded-md bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                <div className="flex gap-2 font-semibold">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Needs Review
                </div>
                <p className="mt-2">
                  Missing ship-to is allowed as draft, flagged for review, skipped from threshold calculation, and should not be exported until fixed.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4 text-sm">
                <ImpactRow label="Selected state" value={selectedRule?.stateName ?? "Not selected"} />
                <ImpactRow label="Current taxable total" value={formatCurrency(stateSummary?.taxableTotal ?? 0)} />
                <ImpactRow label="Threshold" value={formatCurrency(selectedRule?.thresholdAmount ?? 0)} />
                <ImpactRow label="Invoice taxable amount" value={formatCurrency(totals.taxableTotal)} />
                <ImpactRow label="Percent before" value={formatPercent(impact?.before.percent ?? 0)} />
                <ImpactRow label="Percent after" value={formatPercent(impact?.after.percent ?? 0)} />
                <ImpactRow label="Status after invoice" value={impact?.after.label ?? "Safe"} />
                <p className="rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  Projected exposure preview. Review required before this invoice affects nexus totals.
                </p>

                <div>
                  <div className="mb-2 flex justify-between text-xs font-medium text-slate-500">
                    <span>After invoice</span>
                    <span>{formatPercent(impact?.after.percent ?? 0)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${Math.min(impact?.after.percent ?? 0, 100)}%` }}
                    />
                  </div>
                </div>

                {mayPushOver ? (
                  <div className="rounded-md bg-red-50 p-3 text-sm leading-6 text-red-800">
                    This invoice may move the selected state past the configured threshold. Recommend accounting review before sending.
                  </div>
                ) : null}
                {projectedWarnings.length ? (
                  <WarningList warnings={projectedWarnings} />
                ) : null}
              </div>
            )}
          </section>

          <section className="premium-card p-5">
            <h2 className="text-sm font-semibold text-slate-950">MVP Guardrails</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Decision support only. Final tax treatment should be reviewed with accounting. NexusWatch does not make legal, filing, or registration claims.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function IntakeOption({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border p-4 text-left transition ${
        active ? "border-blue-500 bg-blue-50 text-slate-950 shadow-sm ring-1 ring-blue-200" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500"}`}>{icon}</span>
        <div className="font-semibold">{title}</div>
      </div>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </button>
  );
}

function StepItem({ number, title, detail, active = false }: { number: string; title: string; detail: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 border-b-2 px-5 py-4 ${active ? "border-blue-600 bg-blue-50/50" : "border-transparent"}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active ? "bg-blue-700 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
        {number}
      </span>
      <div>
        <div className="text-sm font-bold text-slate-950">{title}</div>
        <div className="text-xs text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
      />
    </label>
  );
}

function StateSelect({
  label,
  value,
  onChange,
  allowBlank = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowBlank?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
      >
        {allowBlank ? <option value="">Missing / save as draft</option> : null}
        {demoRules.map((rule) => (
          <option key={rule.stateCode} value={rule.stateCode}>
            {rule.stateCode} - {rule.stateName}
          </option>
        ))}
      </select>
    </label>
  );
}

function TotalBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function ImpactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function ExtractedFieldsPreview({
  detected,
  sourceLabel,
  extraWarnings = [],
  onUse,
}: {
  detected: ParsedInvoiceText;
  sourceLabel: string;
  extraWarnings?: string[];
  onUse: () => void;
}) {
  const warnings = Array.from(new Set([...detected.warnings, ...extraWarnings]));
  const detectedFields = countDetectedFields(detected);
  const completeness = Math.round((detectedFields / 8) * 100);
  const usableLineItems = detected.lineItems.filter((item) => item.category !== "unknown").length;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm ring-1 ring-blue-50">
      <div className="border-b border-blue-100 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-4 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/20">
                <Sparkles className="h-3.5 w-3.5" />
                Fields detected
              </span>
              <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-medium text-amber-100 ring-1 ring-amber-200/30">
                Manual review required
              </span>
              {warnings.length ? (
                <span className="rounded-full bg-orange-300/15 px-2.5 py-1 text-xs font-medium text-orange-100 ring-1 ring-orange-200/30">
                  {warnings.length} warning{warnings.length === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/15 px-2.5 py-1 text-xs font-medium text-emerald-100 ring-1 ring-emerald-200/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready for review
                </span>
              )}
            </div>
            <h3 className="mt-3 text-base font-semibold">Extracted Fields Preview</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-100">
              Fields detected from {sourceLabel}. Please review before this invoice affects nexus totals.
            </p>
          </div>
          <button
            type="button"
            onClick={onUse}
            className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-blue-50"
          >
            Use detected fields
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 md:grid-cols-4">
        <DetectionMetric label="Detection quality" value={`${completeness}%`} detail="Review before saving" />
        <DetectionMetric label="Fields found" value={detectedFields} detail="Core invoice fields" />
        <DetectionMetric label="Line items" value={detected.lineItems.length} detail={`${usableLineItems} categorized`} />
        <DetectionMetric label="Warnings" value={warnings.length} detail={warnings.length ? "Needs attention" : "No warnings"} />
      </div>

      <div className="p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <DetectedField label="Invoice number" value={detected.invoiceNumber} confidence={detected.fieldConfidence.invoiceNumber} />
        <DetectedField label="Invoice date" value={detected.invoiceDate} confidence={detected.fieldConfidence.invoiceDate} />
        <DetectedField label="Due date" value={detected.dueDate} confidence={detected.fieldConfidence.dueDate} />
        <DetectedField label="Customer" value={detected.customerName} confidence={detected.fieldConfidence.customerName} />
        <DetectedField label="Bill to" value={detected.billToAddress} confidence={detected.fieldConfidence.billToState} />
        <DetectedField label="Ship to" value={detected.shipToAddress} confidence={detected.fieldConfidence.shipToState} />
        <DetectedField label="Ship-to state" value={detected.shipToState} confidence={detected.fieldConfidence.shipToState} />
        <DetectedField label="Total amount" value={detected.totalAmount == null ? undefined : formatCurrency(detected.totalAmount)} confidence={detected.fieldConfidence.totalAmount} />
        <DetectedField label="Currency" value={detected.currency} confidence="medium" />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500 md:grid-cols-[1fr_130px_130px]">
          <div>Line item</div>
          <div className="hidden md:block">Category</div>
          <div className="hidden text-right md:block">Amount</div>
        </div>
        {detected.lineItems.length ? (
          detected.lineItems.map((item, index) => (
            <div key={`${item.description}-${index}`} className="grid gap-3 border-t border-slate-100 px-3 py-3 text-sm md:grid-cols-[1fr_130px_130px]">
              <div>
                <div className="font-medium text-slate-900">{item.description}</div>
                <div className="mt-1 text-xs text-slate-500">{item.taxabilityReason}</div>
              </div>
              <div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                    item.category === "unknown"
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  }`}
                >
                  {item.category === "unknown" ? "Unknown" : item.category}
                </span>
              </div>
              <div className="font-medium text-slate-900 md:text-right">{formatCurrency(item.amount)}</div>
            </div>
          ))
        ) : (
          <div className="border-t border-slate-100 px-3 py-4 text-sm text-slate-500">No line items detected yet.</div>
        )}
      </div>

      {detected.missingFields.length ? (
        <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-600 ring-1 ring-slate-200">
          <span className="font-medium text-slate-900">Missing fields: </span>
          {detected.missingFields.join(", ")}
        </div>
      ) : null}
      {warnings.length ? <WarningList warnings={warnings} /> : null}
      </div>
    </div>
  );
}

function DetectionMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function DetectedField({
  label,
  value,
  confidence,
}: {
  label: string;
  value?: string;
  confidence?: unknown;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
        <ConfidencePill value={confidence} />
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-slate-950">{value || "Not detected"}</div>
    </div>
  );
}

function ConfidencePill({ value }: { value?: unknown }) {
  const label = typeof value === "string" ? value : "low";
  const styles =
    label === "high"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : label === "medium"
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";

  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${styles}`}>{label}</span>;
}

function WarningList({ warnings }: { warnings: string[] }) {
  return (
    <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-800">
      <div className="font-semibold">Review warnings</div>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

function parseAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type DetectedRecord = ParsedInvoiceText & Record<string, unknown>;
type DetectedLineRecord = Record<string, unknown>;

function normalizeDetectedInvoice(detected: ParsedInvoiceText) {
  const record = detected as DetectedRecord;
  const rawLines = getArray(record, "lineItems", "line_items");
  const lineItems = rawLines
    .map((line) => normalizeDetectedLineItem(line as DetectedLineRecord))
    .filter((line) => line.description || line.amount !== 0);
  const warnings = getArray(record, "warnings").filter((warning): warning is string => typeof warning === "string");

  const normalized = {
    invoiceNumber: getString(record, "invoiceNumber", "invoice_number"),
    invoiceDate: normalizeDetectedDate(getString(record, "invoiceDate", "invoice_date")),
    dueDate: normalizeDetectedDate(getString(record, "dueDate", "due_date")),
    customerName: getString(record, "customerName", "customer_name", "customer"),
    billToState: normalizeStateCode(getString(record, "billToState", "bill_to_state")),
    shipToState: normalizeStateCode(getString(record, "shipToState", "ship_to_state")),
    lineItems,
    warnings,
  };

  return {
    ...normalized,
    fieldCount: [
      normalized.invoiceNumber,
      normalized.invoiceDate,
      normalized.dueDate,
      normalized.customerName,
      normalized.billToState,
      normalized.shipToState,
      lineItems.length ? lineItems : null,
      getNumber(record, "totalAmount", "total_amount"),
    ].filter(Boolean).length,
  };
}

function normalizeDetectedLineItem(line: DetectedLineRecord) {
  const rawCategory = getString(line, "category")?.toLowerCase();
  const category =
    rawCategory === "saas" || rawCategory === "hardware" || rawCategory === "services" || rawCategory === "other"
      ? rawCategory
      : "other";

  return {
    description: getString(line, "description", "line_description", "name") ?? "",
    category: category as Category,
    amount: getNumber(line, "amount", "line_amount", "lineAmount") ?? 0,
  };
}

function getString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function getNumber(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[$,]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function getArray(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeDetectedDate(value?: string) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
}

function normalizeStateCode(value?: string) {
  if (!value) return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

function calculateExtractionConfidence(detected: ParsedInvoiceText) {
  const values = Object.values(detected.fieldConfidence);
  if (!values.length) return null;
  const score = values.reduce((sum, value) => sum + (value === "high" ? 1 : value === "medium" ? 0.7 : 0.25), 0);
  return Math.round((score / values.length) * 100) / 100;
}

function countDetectedFields(detected: ParsedInvoiceText) {
  return [
    detected.invoiceNumber,
    detected.invoiceDate,
    detected.dueDate,
    detected.customerName,
    detected.billToState,
    detected.shipToState,
    detected.totalAmount,
    detected.lineItems.length ? detected.lineItems : null,
  ].filter(Boolean).length;
}

