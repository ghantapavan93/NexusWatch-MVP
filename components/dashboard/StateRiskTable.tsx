import { formatCurrency, formatPercent } from "@/lib/format";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buildStateExposureDetails } from "@/lib/thresholdImpact";
import type { Invoice, NexusRule, StateNexusSummary } from "@/types";

export function StateRiskTable({ states, invoices, rules }: { states: StateNexusSummary[]; invoices: Invoice[]; rules: NexusRule[] }) {
  const exposureByState = new Map(rules.map((rule) => [rule.stateCode, buildStateExposureDetails(rule, invoices)]));

  return (
    <div className="data-grid">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">State Nexus Monitor</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">State</th>
              <th className="px-5 py-3">Taxable Total</th>
              <th className="px-5 py-3">Threshold</th>
              <th className="px-5 py-3">Usage</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Review</th>
              <th className="px-5 py-3">Highest Risk</th>
              <th className="px-5 py-3">Next Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {states.map((state) => {
              const exposure = exposureByState.get(state.stateCode);
              const reviewCount = (exposure?.reviewCount ?? 0) + (exposure?.accountingCount ?? 0);
              const barColor =
                state.status === "crossed"
                  ? "bg-red-500"
                  : state.status === "warning"
                    ? "bg-orange-500"
                    : state.status === "watch"
                      ? "bg-amber-500"
                      : "bg-emerald-500";

              return (
                <tr key={state.stateCode}>
                  <td className="px-5 py-4 font-medium text-slate-900">{state.stateName}</td>
                  <td className="px-5 py-4 text-slate-700">{formatCurrency(state.taxableTotal)}</td>
                  <td className="px-5 py-4 text-slate-700">{formatCurrency(state.thresholdAmount)}</td>
                  <td className="px-5 py-4">
                    <div className="min-w-48">
                      <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(state.percentUsed, 100)}%` }} />
                        <div className="absolute left-[75%] top-0 h-full w-px bg-yellow-600/70" />
                        <div className="absolute left-[90%] top-0 h-full w-px bg-orange-700/80" />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                        <span>{formatPercent(state.percentUsed)}</span>
                        <span>75 / 90</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={state.status === "safe" ? "healthy" : state.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-700">{reviewCount} in review</td>
                  <td className="px-5 py-4 text-slate-700">{exposure?.highestRiskInvoice?.invoiceNumber ?? "None"}</td>
                  <td className="px-5 py-4 text-slate-600">{exposure?.nextAction ?? state.nextAction}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
