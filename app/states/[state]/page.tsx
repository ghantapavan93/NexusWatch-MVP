import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatPercent, stateLabel } from "@/lib/format";
import { buildStateSummaries } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";
import { buildStateExposureDetails, getInvoiceActivityDate } from "@/lib/thresholdImpact";

export const dynamic = "force-dynamic";

export default async function StateDetailPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateParam } = await params;
  const code = stateParam.toUpperCase();
  const { invoices, rules } = await getNexusWatchData();
  const state = buildStateSummaries(rules, invoices).find((item) => item.stateCode === code);
  const rule = rules.find((item) => item.stateCode === code);
  if (!state || !rule) notFound();

  const exposure = buildStateExposureDetails(rule, invoices);
  const stateInvoices = invoices
    .filter((invoice) => invoice.shipToState === code)
    .sort((a, b) => getInvoiceActivityDate(b).localeCompare(getInvoiceActivityDate(a)));

  return (
    <>
      <PageHeader
        title={state.stateName}
        description={`Detailed view of threshold usage, taxability rule configuration, and ${stateInvoices.length} related invoice${stateInvoices.length === 1 ? "" : "s"}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/states" className="secondary-button px-4 py-2 text-sm">
              <ArrowLeft className="h-4 w-4" />
              All States
            </Link>
            <Link href={`/rules#${code.toLowerCase()}`} className="secondary-button px-4 py-2 text-sm">
              View rule
            </Link>
            <Link
              href={`/exports?state=${code}`}
              className="primary-button px-4 py-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Export {code} transactions
            </Link>
          </div>
        }
      />
      <section className="grid gap-4 md:grid-cols-4">
        <StateDetailMetric label="Threshold" value={formatCurrency(state.thresholdAmount)} />
        <StateDetailMetric label="Taxable Total" value={formatCurrency(state.taxableTotal)} />
        <StateDetailMetric label="Percent Used" value={formatPercent(state.percentUsed)} />
        <div className="premium-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</div>
          <div className="mt-3">
            <StatusBadge status={state.status === "safe" ? "healthy" : state.status} />
          </div>
          <div className="mt-3 text-xs text-slate-500">{exposure.nextAction}</div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StateDetailMetric label="In Review" value={String(exposure.inReviewCount)} />
        <StateDetailMetric label="Accounting Review" value={String(exposure.accountingCount)} />
        <StateDetailMetric label="Approved" value={String(exposure.approvedCount)} />
        <StateDetailMetric label="OCR Review" value={String(exposure.ocrNeedsReviewCount)} />
        <StateDetailMetric label="Remaining" value={formatCurrency(state.remaining)} />
      </section>

      <section className="data-grid mt-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Related Invoices</h2>
            <p className="mt-1 text-xs text-slate-500">
              All invoices with ship-to {code}. Sorted by most recent activity.
            </p>
          </div>
          <Link href={`/invoices?q=${code}`} className="secondary-button px-3 py-2 text-sm">
            Open in Invoices
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {stateInvoices.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">
            No invoices yet for {state.stateName}. Upload an invoice with ship-to {code} to begin monitoring.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[820px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Taxable</th>
                  <th className="px-5 py-3">Review</th>
                  <th className="px-5 py-3">Activity</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {stateInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold">
                      <Link href={`/invoices/${invoice.id}`} className="text-blue-700 hover:text-blue-900">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{invoice.customerName || "Missing customer"}</td>
                    <td className="px-5 py-4 text-right text-slate-800">{formatCurrency(invoice.totalAmount)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-950">{formatCurrency(invoice.taxableAmount)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={invoice.reviewStatus} />
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div>{formatDate(getInvoiceActivityDate(invoice))}</div>
                      <div>{stateLabel(invoice.shipToState)}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/invoices/${invoice.id}`} className="secondary-button px-3 py-1.5 text-xs">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function StateDetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="premium-card p-5">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
    </div>
  );
}
