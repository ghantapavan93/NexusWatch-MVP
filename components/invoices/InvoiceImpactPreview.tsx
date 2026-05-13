import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatPercent } from "@/lib/format";
import { previewInvoiceImpact } from "@/lib/nexus";

export function InvoiceImpactPreview({
  stateName,
  currentTotal,
  taxableAmount,
  threshold,
}: {
  stateName: string;
  currentTotal: number;
  taxableAmount: number;
  threshold: number;
}) {
  const impact = previewInvoiceImpact(currentTotal, taxableAmount, threshold);

  return (
    <div className="surface rounded-lg p-5">
      <h2 className="text-sm font-semibold text-slate-950">Impact Preview</h2>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">{stateName} before this invoice</span><span className="font-medium">{formatPercent(impact.before.percent)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">After this invoice</span><span className="font-medium">{formatPercent(impact.after.percent)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">New taxable total</span><span className="font-medium">{formatCurrency(impact.newTotal)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={impact.after.status} /></div>
      </div>
      <p className="mt-4 rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-800">
        Recommended: accounting review before sending. This preview is not legal advice or a tax filing determination.
      </p>
    </div>
  );
}
