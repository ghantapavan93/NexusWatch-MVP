import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { generateAiBrief } from "@/lib/aiBrief";
import { formatCurrency } from "@/lib/format";
import { buildStateSummaries } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";
import { isNormalExportEligible, isReviewQueueInvoice } from "@/lib/thresholdImpact";

export const dynamic = "force-dynamic";

export default async function AiBriefPage() {
  const { invoices, rules } = await getNexusWatchData();
  const summaries = buildStateSummaries(rules, invoices).sort((a, b) => b.percentUsed - a.percentUsed);
  const totalTaxable = summaries.reduce((sum, state) => sum + state.taxableTotal, 0);
  const reviewQueueCount = invoices.filter(isReviewQueueInvoice).length;
  const exportReadyCount = invoices.filter(isNormalExportEligible).length;

  return (
    <>
      <PageHeader
        title="AI Brief"
        description="Briefing surface for configured threshold exposure, review blockers, OCR exceptions, and export readiness. Reads live data from Supabase."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="secondary-button px-4 py-2">
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/review?tab=needs_review" className="primary-button px-4 py-2">
              Open Review Queue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />
      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <BriefMetric label="Total Taxable Exposure" value={formatCurrency(totalTaxable)} detail="Sum of configured state taxable totals" />
        <BriefMetric label="Invoices Tracked" value={invoices.length} detail="Live invoices in workspace" />
        <BriefMetric
          label="States at Risk"
          value={summaries.filter((state) => state.status !== "safe").length}
          detail="Watch, warning, or crossed"
        />
        <BriefMetric label="Review Queue" value={reviewQueueCount} detail="Unresolved review items" />
        <BriefMetric label="Approved for Export" value={exportReadyCount} detail="Ready for reviewed export" />
      </section>
      {summaries.length === 0 ? (
        <section className="premium-card p-6 text-sm text-slate-600">
          No configured state rules yet. Add rules on the Rules page to start generating briefs.
        </section>
      ) : (
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
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/states/${state.stateCode}`} className="secondary-button px-3 py-2 text-sm">
                  Open {state.stateCode}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/invoices?q=${state.stateCode}`}
                  className="secondary-button px-3 py-2 text-sm"
                >
                  See {state.stateCode} invoices
                </Link>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                Factual summary only. Review configured thresholds and validate decisions with accounting.
              </div>
            </section>
          ))}
        </div>
      )}
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
