import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Invoice } from "@/types";

export function ReviewQueuePreview({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="surface rounded-lg p-5">
      <h2 className="text-sm font-semibold text-slate-950">Invoices Needing Review</h2>
      <div className="mt-4 space-y-3">
        {invoices.slice(0, 5).map((invoice) => (
          <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-4 rounded-md border border-slate-100 p-3 transition hover:bg-slate-50">
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
          <div className="rounded-md border border-slate-100 p-4 text-sm text-slate-500">No invoices currently need review.</div>
        ) : null}
      </div>
    </div>
  );
}
