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
    <div className="premium-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-950">Impact Preview</h2>
        <StatusBadge status={impact.after.status} />
      </div>
      <div className="mt-5 space-y-3 text-sm">
        <ImpactLine label={`${stateName} before invoice`} value={formatPercent(impact.before.percent)} />
        <ImpactLine label="Projected after invoice" value={formatPercent(impact.after.percent)} />
        <ImpactLine label="New taxable total" value={formatCurrency(impact.newTotal)} />
      </div>
      <div className="mt-4">
        <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
          <span>Before</span>
          <span>After</span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${
              impact.after.percent >= 90 ? "bg-orange-500" : impact.after.percent >= 75 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(impact.after.percent, 100)}%` }}
          />
          <div className="absolute left-[75%] top-0 h-full w-px bg-amber-700/70" />
          <div className="absolute left-[90%] top-0 h-full w-px bg-orange-800/70" />
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800 ring-1 ring-blue-100">
        Projected exposure preview. Recommend accounting review before this invoice affects NexusWatch reporting.
      </p>
    </div>
  );
}

function ImpactLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-950">{value}</span>
    </div>
  );
}
