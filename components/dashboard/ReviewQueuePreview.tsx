import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Invoice } from "@/types";

export function ReviewQueuePreview({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-950">Invoices Needing Review</h2>
        <Link href="/review" className="text-xs font-bold text-blue-700 hover:text-blue-800">View queue →</Link>
      </div>
      <div className="mt-4 space-y-3">
        {invoices.slice(0, 5).map((invoice) => (
          <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-blue-50/40">
            <div>
              <div className="text-sm font-medium text-slate-900">{invoice.invoiceNumber}</div>
              <div className="text-xs text-slate-500">{invoice.customerName}</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {invoice.flags.slice(0, 2).map((flag) => (
                <StatusBadge key={flag} status={flag} />
              ))}
            </div>
          </Link>
        ))}
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-500">No invoices currently need review.</div>
        ) : null}
      </div>
    </div>
  );
}
