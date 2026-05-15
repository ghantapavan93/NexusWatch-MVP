import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";
import { formatCurrency, formatDate, stateLabel } from "@/lib/format";
import { getInvoiceActivityDate, getOperationalStatus, hasSourceDocument } from "@/lib/thresholdImpact";
import type { Invoice } from "@/types";

export function RecentInvoices({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-950">Recent Invoices</h2>
        <Link href="/invoices" className="text-xs font-bold text-blue-700 hover:text-blue-800">View all →</Link>
      </div>
      <div className="mt-4 divide-y divide-slate-100">
        {invoices.slice(0, 6).map((invoice) => (
          <div key={invoice.id} className="grid grid-cols-2 gap-3 py-3 text-sm md:grid-cols-6">
            <Link className="font-medium text-slate-900 hover:text-blue-700" href={`/invoices/${invoice.id}`}>
              {invoice.invoiceNumber}
            </Link>
            <span className="text-slate-600 md:col-span-2">{invoice.customerName || "Missing customer"}</span>
            <span className="text-slate-600">{stateLabel(invoice.shipToState)} / {formatCurrency(invoice.totalAmount)}</span>
            <span>
              <StatusBadge status={invoice.reviewStatus} />
            </span>
            <span className="space-y-1 text-xs text-slate-500">
              <span className="block">{formatDate(getInvoiceActivityDate(invoice))}</span>
              <span className="block">
                {getOperationalStatus(invoice)}
                {hasSourceDocument(invoice) ? " / source linked" : " / no source document linked"}
              </span>
              {invoice.extractionStatus ? <StatusBadge status={invoice.extractionStatus} /> : null}
            </span>
          </div>
        ))}
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
            No invoices yet. Upload or enter an invoice to begin monitoring.
          </div>
        ) : null}
      </div>
    </div>
  );
}
