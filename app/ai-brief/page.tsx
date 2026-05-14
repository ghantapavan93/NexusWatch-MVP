import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { generateAiBrief } from "@/lib/aiBrief";
import { demoInvoices, demoRules } from "@/lib/demoData";
import { formatCurrency } from "@/lib/format";
import { buildStateSummaries } from "@/lib/nexus";

export default function AiBriefPage() {
  const summaries = buildStateSummaries(demoRules, demoInvoices);

  return (
    <>
      <PageHeader title="AI Brief" description="Executive briefing surface for threshold exposure, review blockers, OCR exceptions, and export readiness." />
      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <BriefMetric label="Total Exposure at Risk" value={formatCurrency(summaries.reduce((sum, state) => sum + state.taxableTotal, 0))} detail="Configured state totals" />
        <BriefMetric label="Invoices Impacted" value={demoInvoices.length} detail="Current demo activity" />
        <BriefMetric label="States at Risk" value={summaries.filter((state) => state.status !== "safe").length} detail="Watch, warning, or crossed" />
        <BriefMetric label="Crossed Threshold" value={summaries.filter((state) => state.status === "crossed").length} detail="Configured threshold exceeded" />
        <BriefMetric label="Exports Ready" value={demoInvoices.filter((invoice) => invoice.reviewStatus === "approved").length} detail="Approved invoices" />
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        {summaries.map((state) => (
          <section key={state.stateCode} className="premium-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{state.stateCode}</div>
                <h2 className="mt-1 text-lg font-bold text-slate-950">{state.stateName}</h2>
              </div>
              <StatusBadge status={state.status === "safe" ? "healthy" : state.status} />
            </div>
            <p className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              {generateAiBrief({ state: state.stateName, percent: state.percentUsed, status: state.status })}
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              Factual summary only. Review configured thresholds and validate decisions with accounting.
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function BriefMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="premium-card p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}
