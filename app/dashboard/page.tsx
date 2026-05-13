import Link from "next/link";
import { AiBriefPanel } from "@/components/dashboard/AiBriefPanel";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { ReviewQueuePreview } from "@/components/dashboard/ReviewQueuePreview";
import { StateRiskTable } from "@/components/dashboard/StateRiskTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { generateAiBrief } from "@/lib/aiBrief";
import { formatCurrency } from "@/lib/format";
import { buildStateSummaries } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";
import { buildStateExposureDetails } from "@/lib/thresholdImpact";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { invoices, rules } = await getNexusWatchData();
  const states = buildStateSummaries(rules, invoices);
  const stateExposure = rules.map((rule) => buildStateExposureDetails(rule, invoices));
  const reviewInvoices = invoices.filter((invoice) => invoice.reviewStatus === "needs_review" || invoice.reviewStatus === "accounting_review" || invoice.flags.length > 0);
  const tx = states.find((state) => state.stateCode === "TX");
  const txInvoice = invoices.find((invoice) => invoice.invoiceNumber === "INV-1048");
  const brief = generateAiBrief({
    state: "Texas",
    percent: tx?.percentUsed ?? 0,
    invoiceNumber: txInvoice?.invoiceNumber,
    taxableAmount: txInvoice?.taxableAmount,
    status: tx?.status ?? "safe",
    mayPushOver: true,
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Executive view of configured nexus thresholds, invoice risk, and accounting review work."
        action={
          <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800" href="/invoices">
            Review Invoices
          </Link>
        }
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="States Monitored" value={states.length} detail="Demo rules configured" />
        <MetricCard label="Safe States" value={states.filter((state) => state.status === "safe").length} detail="Below 75% of threshold" />
        <MetricCard label="75% Watch" value={states.filter((state) => state.status === "watch").length} detail="Monitoring recommended" />
        <MetricCard label="90% Warning" value={states.filter((state) => state.status === "warning").length} detail="Accounting review soon" />
        <MetricCard label="Crossed Threshold" value={states.filter((state) => state.status === "crossed").length} detail="Configured threshold exceeded" />
        <MetricCard label="Invoices Needing Review" value={reviewInvoices.length} detail="Missing data, category, or risk flags" />
        <MetricCard label="Next Crossing Risk" value="Texas" detail={`Review invoice ${txInvoice?.invoiceNumber}`} />
        <MetricCard label="TX Remaining" value={formatCurrency(tx?.remaining ?? 0)} detail="Before pending review invoice" />
      </section>
      <section className="mt-6 grid gap-4 xl:grid-cols-5">
        {stateExposure.map((state) => (
          <StateExposureCard key={state.rule.stateCode} state={state} />
        ))}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <StateRiskTable states={states} invoices={invoices} rules={rules} />
        <AiBriefPanel brief={brief} />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReviewQueuePreview invoices={reviewInvoices} />
        <RecentInvoices invoices={[...invoices].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))} />
      </section>
    </>
  );
}

function StateExposureCard({ state }: { state: ReturnType<typeof buildStateExposureDetails> }) {
  const barColor =
    state.status === "crossed"
      ? "bg-red-500"
      : state.status === "warning"
        ? "bg-orange-500"
        : state.status === "watch"
          ? "bg-yellow-500"
          : "bg-emerald-500";

  return (
    <div className="surface rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase text-slate-500">{state.rule.stateCode}</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{state.rule.stateName}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
          {state.percentUsed.toFixed(1)}%
        </span>
      </div>
      <div className="mt-5">
        <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(state.percentUsed, 100)}%` }} />
          <div className="absolute left-[75%] top-0 h-full w-px bg-slate-500/50" />
          <div className="absolute left-[90%] top-0 h-full w-px bg-slate-900/60" />
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500">
          <span>0%</span>
          <span>75%</span>
          <span>90%</span>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <Row label="Current exposure" value={formatCurrency(state.taxableTotal)} />
        <Row label="Threshold" value={formatCurrency(state.rule.thresholdAmount)} />
        <Row label="Remaining" value={formatCurrency(state.remaining)} />
        <Row label="In review" value={String(state.reviewCount + state.accountingCount)} />
        <Row label="Approved" value={String(state.approvedCount)} />
      </div>
      <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <div className="font-semibold text-slate-900">{state.highestRiskInvoice?.invoiceNumber ?? "No invoice risk"}</div>
        <div>{state.nextAction}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}
