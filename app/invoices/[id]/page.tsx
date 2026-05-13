import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { InvoiceActions } from "@/components/invoices/InvoiceActions";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { generateAiBrief } from "@/lib/aiBrief";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { buildStateSummaries, getExcludedAmount, previewInvoiceImpact } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";
import { buildInvoiceThresholdImpact, hasDetectedMismatch, hasLowConfidence } from "@/lib/thresholdImpact";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { invoices, rules } = await getNexusWatchData();
  const invoice = invoices.find((item) => item.id === id || item.invoiceNumber.toLowerCase() === id.toLowerCase());
  if (!invoice) notFound();

  const rule = rules.find((item) => item.stateCode === invoice.shipToState) ?? rules[0];
  const stateSummary = buildStateSummaries(rules, invoices).find((item) => item.stateCode === rule.stateCode);
  const currentTaxableTotal = stateSummary?.taxableTotal ?? 0;
  const impact = previewInvoiceImpact(currentTaxableTotal, invoice.taxableAmount, rule.thresholdAmount);
  const thresholdImpact = buildInvoiceThresholdImpact(invoice, invoices, rules);
  const lineCountedAmount = invoice.lineItems.reduce((sum, item) => sum + (item.taxableAmount ?? 0), 0);
  const brief = generateAiBrief({
    state: rule.stateName,
    percent: stateSummary?.percentUsed ?? 0,
    invoiceNumber: invoice.invoiceNumber,
    taxableAmount: invoice.taxableAmount,
    status: invoice.riskStatus,
    mayPushOver: invoice.flags.includes("may_cross_threshold"),
  });

  return (
    <>
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        description="Executive review of extracted invoice fields, line taxability, configured threshold impact, and accounting review flags."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <Link
              href="/review"
              className="inline-flex items-center rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
            >
              Review Queue
            </Link>
          </div>
        }
      />

      <section className="surface overflow-hidden rounded-lg">
        <div className="border-b border-slate-200 bg-white px-5 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={invoice.reviewStatus} />
                <StatusBadge status={invoice.riskStatus} />
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                  Decision support only
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">{invoice.customerName}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Hero demo invoice for Texas nexus visibility and accounting review workflow.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
              <Metric label="Total Amount" value={formatCurrency(invoice.totalAmount)} />
              <Metric label="Taxable Amount" value={formatCurrency(invoice.taxableAmount)} />
              <Metric label="Excluded Amount" value={formatCurrency(getExcludedAmount(invoice))} />
            </div>
          </div>
        </div>

        <dl className="grid gap-px bg-slate-200 text-sm md:grid-cols-2 xl:grid-cols-6">
          <HeaderField label="Invoice Number" value={invoice.invoiceNumber} />
          <HeaderField label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
          <HeaderField label="Due Date" value={formatDate(invoice.dueDate)} />
          <HeaderField label="Ship-To State" value={invoice.shipToState ?? "Missing"} />
          <HeaderField label="Bill-To State" value={invoice.billToState ?? "Missing"} />
          <HeaderField label="Line Taxable Total" value={formatCurrency(lineCountedAmount)} />
        </dl>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <section className="surface rounded-lg p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Line Items</h2>
                <p className="mt-1 text-sm text-slate-500">Mixed taxable and excluded amounts are shown per line.</p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-200">
                  Counted: {formatCurrency(invoice.taxableAmount)}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                  Excluded: {formatCurrency(getExcludedAmount(invoice))}
                </span>
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Taxable Amount</th>
                    <th className="px-4 py-3">Treatment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {invoice.lineItems.map((item) => {
                    const taxableAmount = item.taxableAmount ?? 0;
                    const isTaxable = taxableAmount !== 0;

                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-4 font-medium text-slate-900">{item.description}</td>
                        <td className="px-4 py-4 capitalize text-slate-600">{item.category}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(item.amount)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(taxableAmount)}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                              isTaxable
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-slate-100 text-slate-700 ring-slate-200"
                            }`}
                          >
                            {isTaxable ? "Taxable" : "Excluded"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-950">Review Flags</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status="may_cross_threshold" />
              <StatusBadge status="large_invoice" />
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                Accounting Review Needed
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              This invoice includes SaaS and hardware line items counted by the configured Texas demo rule, plus services excluded from the threshold calculation.
            </p>
          </section>

          <section className="surface rounded-lg p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Threshold Impact</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Projected exposure preview. Review required before this invoice affects final NexusWatch reporting.
                </p>
              </div>
              <StatusBadge status={thresholdImpact.riskStatus} />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
              <div>
                <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      thresholdImpact.percentAfterInvoice >= 90
                        ? "bg-orange-500"
                        : thresholdImpact.percentAfterInvoice >= 75
                          ? "bg-yellow-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(thresholdImpact.percentAfterInvoice, 100)}%` }}
                  />
                  <div className="absolute left-[75%] top-0 h-full w-px bg-yellow-700/70" />
                  <div className="absolute left-[90%] top-0 h-full w-px bg-orange-800/70" />
                </div>
                <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500">
                  <span>{formatPercent(thresholdImpact.percentBeforeInvoice)} before</span>
                  <span>75%</span>
                  <span>90%</span>
                  <span>{formatPercent(thresholdImpact.percentAfterInvoice)} after</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Metric label="Ship To State" value={thresholdImpact.shipToState ?? "Missing"} />
                  <Metric label="Bill To State" value={thresholdImpact.billToState ?? "Missing"} />
                  <Metric label="Taxable Amount" value={formatCurrency(thresholdImpact.taxableAmount)} />
                  <Metric label="Excluded Amount" value={formatCurrency(thresholdImpact.excludedAmount)} />
                  <Metric label="Exposure Before" value={formatCurrency(thresholdImpact.currentExposureBeforeInvoice)} />
                  <Metric label="Projected After" value={formatCurrency(thresholdImpact.projectedExposureAfterInvoice)} />
                  <Metric label="Threshold" value={formatCurrency(thresholdImpact.thresholdAmount)} />
                  <Metric label="Remaining" value={formatCurrency(thresholdImpact.remainingAmount)} />
                  <Metric label="Impact Delta" value={formatCurrency(thresholdImpact.invoiceImpactDelta)} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase text-slate-500">Recommended next action</div>
                <div className="mt-2 text-sm font-semibold text-slate-950">{thresholdImpact.recommendedNextAction}</div>
                <div className="mt-4 space-y-2">
                  <StatusLine label="75 percent warning" active={thresholdImpact.watch75} />
                  <StatusLine label="90 percent warning" active={thresholdImpact.warning90} />
                  <StatusLine label="Threshold crossing risk" active={thresholdImpact.thresholdCrossingRisk} />
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-medium uppercase text-slate-500">State rule used</div>
                <div className="mt-2 text-sm font-semibold text-slate-950">{thresholdImpact.stateRuleUsed}</div>
                <div className="mt-3 text-sm text-slate-600">
                  Taxable: {thresholdImpact.taxableCategories.join(", ") || "None detected"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Excluded: {thresholdImpact.excludedCategories.join(", ") || "None detected"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-medium uppercase text-slate-500">Risk reasons</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {thresholdImpact.riskReasons.length ? (
                    thresholdImpact.riskReasons.map((reason) => (
                      <span key={reason} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                        {reason}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No review reasons generated.</span>
                  )}
                </div>
              </div>
            </div>
            {invoice.shipToState && invoice.billToState && invoice.shipToState !== invoice.billToState ? (
              <p className="mt-4 rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                Bill to and ship to differ. Ship to is used as the primary state for this NexusWatch preview.
              </p>
            ) : null}
            {invoice.reviewStatus !== "approved" && invoice.reviewStatus !== "exported" ? (
              <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                This invoice is still under review. It should not be treated as final for accounting exports until approved.
              </p>
            ) : null}
          </section>

          <InvoiceActions invoiceId={invoice.id} shipToState={invoice.shipToState} />
        </div>

        <aside className="space-y-6">
          <section className="surface rounded-lg p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-950">Texas Impact</h2>
              <StatusBadge status={impact.after.status} />
            </div>
            <div className="mt-5 space-y-4 text-sm">
              <ImpactRow label="Texas current taxable total" value={formatCurrency(currentTaxableTotal)} />
              <ImpactRow label="Texas threshold" value={formatCurrency(rule.thresholdAmount)} />
              <ImpactRow label="Percent before invoice" value={formatPercent(impact.before.percent)} />
              <ImpactRow label="Invoice taxable amount" value={formatCurrency(invoice.taxableAmount)} />
              <ImpactRow label="Percent after invoice" value={formatPercent(impact.after.percent)} />
              <ImpactRow label="Remaining amount" value={formatCurrency(impact.remaining)} />
              <div>
                <div className="mb-2 flex justify-between text-xs font-medium text-slate-500">
                  <span>Before</span>
                  <span>{formatPercent(impact.before.percent)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(impact.before.percent, 100)}%` }} />
                </div>
                <div className="mb-2 mt-4 flex justify-between text-xs font-medium text-slate-500">
                  <span>After INV-1048</span>
                  <span>{formatPercent(impact.after.percent)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(impact.after.percent, 100)}%` }} />
                </div>
              </div>
            </div>
          </section>

          {invoice.pdfFileName || invoice.pdfPublicUrl ? (
            <section className="surface rounded-lg p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-blue-50 p-2 text-blue-700 ring-1 ring-blue-100">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">Source Document</h2>
                    <p className="mt-1 text-xs text-slate-500">PDF uploaded and linked.</p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                  Manual review required
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <ImpactRow label="PDF file name" value={invoice.pdfFileName ?? "Linked PDF"} />
                <ImpactRow label="Extraction status" value={formatExtractionStatus(invoice.extractionStatus)} />
                {invoice.sourceDocument?.detectedInvoiceNumber ? (
                  <ImpactRow label="Detected invoice number" value={invoice.sourceDocument.detectedInvoiceNumber} />
                ) : null}
                {invoice.sourceDocument?.detectedShipToState ? (
                  <ImpactRow label="Detected ship-to state" value={invoice.sourceDocument.detectedShipToState} />
                ) : null}
                {invoice.sourceDocument?.detectedTotalAmount != null ? (
                  <ImpactRow label="Detected total" value={formatCurrency(invoice.sourceDocument.detectedTotalAmount)} />
                ) : null}
                {invoice.sourceDocument?.extractionMethod ? (
                  <ImpactRow label="Detection method" value={formatExtractionMethod(invoice.sourceDocument.extractionMethod)} />
                ) : null}
                {invoice.sourceDocument?.ocrConfidence != null ? (
                  <ImpactRow label="OCR confidence" value={`${invoice.sourceDocument.ocrConfidence.toFixed(1)}%`} />
                ) : null}
              </div>

              {buildSourceDocumentWarnings(invoice).length ? (
                <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  <div className="font-semibold">Review warnings</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {buildSourceDocumentWarnings(invoice).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="mt-4 rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                Fields detected from PDF or OCR. Please review before this invoice affects nexus totals.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {invoice.extractionStatus ? <StatusBadge status={invoice.extractionStatus} /> : null}
                {hasLowConfidence(invoice) ? <StatusBadge status="low_confidence" /> : null}
                {hasDetectedMismatch(invoice) ? <StatusBadge status="missing_field" /> : null}
              </div>
              {hasDetectedMismatch(invoice) ? (
                <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  PDF/OCR invoice number does not match the form invoice number. Review required.
                </p>
              ) : null}

              {invoice.pdfPublicUrl ? (
                <a
                  href={invoice.pdfPublicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open PDF
                </a>
              ) : null}
            </section>
          ) : null}
          {!invoice.pdfFileName && !invoice.pdfPublicUrl ? (
            <section className="surface rounded-lg p-5">
              <h2 className="text-sm font-semibold text-slate-950">Source Document</h2>
              <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">No source document attached.</p>
            </section>
          ) : null}

          <section className="surface rounded-lg p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-950">AI Brief</h2>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                Template MVP
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{brief}</p>
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              Factual summary only. Recommend accounting review for final determination. NexusWatch is decision support only and does not make legal or tax filing claims.
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function StatusLine({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${active ? "text-orange-700" : "text-emerald-700"}`}>{active ? "Yes" : "No"}</span>
    </div>
  );
}

function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function ImpactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function formatExtractionStatus(status?: string | null) {
  if (status === "ocr_needs_review") return "OCR fields detected; review required";
  if (status === "extracted_needs_review") return "Fields detected; review required";
  if (status === "extraction_failed") return "Extraction failed; manual review required";
  if (status === "manual_review_required") return "Manual review required";
  return status ? status.replaceAll("_", " ") : "Manual review required";
}

function formatExtractionMethod(method?: string | null) {
  if (method === "ocr") return "OCR fallback";
  if (method === "pdf_text") return "Embedded PDF text";
  if (method === "manual_review") return "Manual review";
  return method ? method.replaceAll("_", " ") : "Manual review";
}

function buildSourceDocumentWarnings(invoice: {
  invoiceNumber: string;
  sourceDocument?: {
    detectedInvoiceNumber?: string | null;
    validationWarnings?: string[] | null;
  } | null;
}) {
  const warnings = new Set(invoice.sourceDocument?.validationWarnings ?? []);
  const detectedInvoiceNumber = invoice.sourceDocument?.detectedInvoiceNumber;
  if (detectedInvoiceNumber && detectedInvoiceNumber.toLowerCase() !== invoice.invoiceNumber.toLowerCase()) {
    warnings.add("PDF invoice number does not match form invoice number. Review required.");
  }
  return Array.from(warnings);
}
