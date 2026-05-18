import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileCheck2,
  FileText,
  FileWarning,
  Flag,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { ReviewQueuePreview } from "@/components/dashboard/ReviewQueuePreview";
import { DataModeToggle } from "@/components/dashboard/DataModeToggle";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { generateAiBrief } from "@/lib/aiBrief";
import { formatCurrency, formatPercent } from "@/lib/format";
import { buildStateSummaries } from "@/lib/nexus";
import { getScopedNexusWatchData } from "@/lib/supabaseData";
import {
  buildInvoiceThresholdImpact,
  buildStateExposureDetails,
  getInvoiceActivityDate,
  hasSourceDocument,
  isDraftInvoice,
  isManualReviewInvoice,
  isNormalExportEligible,
  isOcrReviewInvoice,
  isReviewQueueInvoice,
  isReviewedInvoice,
} from "@/lib/thresholdImpact";
import type { StateNexusSummary, ThresholdStatus } from "@/types";

export const dynamic = "force-dynamic";

type StateExposure = ReturnType<typeof buildStateExposureDetails>;

const stateArt: Record<string, string> = {
  CA: "M28 6 40 13 37 24 45 35 37 48 40 58 31 63 23 49 15 43 18 31 10 20 17 10Z",
  IL: "M31 5 42 12 39 28 44 40 36 61 25 55 29 35 23 18Z",
  NY: "M8 30 26 24 43 18 58 24 51 31 37 29 26 38 10 39Z",
  TX: "M11 19 29 18 36 9 45 21 58 23 52 36 42 39 56 28 46 18 48 17 36 8 30Z",
  WA: "M9 21 28 15 40 19 56 17 59 30 47 36 32 31 17 35Z",
};

const statusTone: Record<ThresholdStatus, { bar: string; text: string; panel: string; dot: string }> = {
  safe: {
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    panel: "from-emerald-50/80 to-white",
    dot: "bg-emerald-500",
  },
  watch: {
    bar: "bg-amber-500",
    text: "text-amber-700",
    panel: "from-amber-50/80 to-white",
    dot: "bg-amber-500",
  },
  warning: {
    bar: "bg-orange-500",
    text: "text-orange-700",
    panel: "from-orange-50/80 to-white",
    dot: "bg-orange-500",
  },
  crossed: {
    bar: "bg-red-500",
    text: "text-red-700",
    panel: "from-red-50/80 to-white",
    dot: "bg-red-500",
  },
};

export default async function DashboardPage() {
  const { invoices, rules, source, scope } = await getScopedNexusWatchData();
  const requestedDataMode = scope.mode;
  const states = buildStateSummaries(rules, invoices).sort((a, b) => b.percentUsed - a.percentUsed);
  const stateExposure = rules
    .map((rule) => buildStateExposureDetails(rule, invoices))
    .sort((a, b) => b.percentUsed - a.percentUsed);
  const reviewInvoices = invoices.filter(isReviewQueueInvoice);
  const accountingReviewInvoices = invoices.filter((invoice) => invoice.reviewStatus === "accounting_review");
  const approvedInvoices = invoices.filter(isReviewedInvoice);
  const exportReadyInvoices = invoices.filter(isNormalExportEligible);
  const ocrNeedsReviewInvoices = invoices.filter(isOcrReviewInvoice);
  const manualReviewInvoices = invoices.filter((invoice) => !isDraftInvoice(invoice) && !isReviewedInvoice(invoice) && isManualReviewInvoice(invoice));
  const sourceDocumentInvoices = invoices.filter(hasSourceDocument);
  const healthyStates = states.filter((state) => state.status === "safe");
  const warningStates = states.filter((state) => state.status === "warning");
  const crossedStates = states.filter((state) => state.status === "crossed");
  const watchStates = states.filter((state) => state.status === "watch");
  const highestRiskState = states[0];
  const highestRiskExposure = stateExposure[0];
  const heroInvoice = highestRiskExposure?.highestRiskInvoice;
  const nextCrossingRisk = invoices
    .map((invoice) => ({ invoice, impact: buildInvoiceThresholdImpact(invoice, invoices, rules) }))
    .filter(({ invoice }) => !isReviewedInvoice(invoice))
    .sort((a, b) => Number(b.impact.thresholdCrossingRisk) - Number(a.impact.thresholdCrossingRisk) || b.impact.percentAfterInvoice - a.impact.percentAfterInvoice || b.invoice.taxableAmount - a.invoice.taxableAmount)[0];
  const recentInvoices = [...invoices].sort((a, b) => getInvoiceActivityDate(b).localeCompare(getInvoiceActivityDate(a)));
  const briefState = highestRiskState;
  const briefInvoice = nextCrossingRisk?.invoice ?? heroInvoice;
  const brief = generateAiBrief({
    state: briefState?.stateName ?? "No configured state",
    percent: briefState?.percentUsed ?? 0,
    invoiceNumber: briefInvoice?.invoiceNumber,
    taxableAmount: briefInvoice?.taxableAmount,
    status: briefState?.status ?? "safe",
    mayPushOver: Boolean(nextCrossingRisk?.impact.thresholdCrossingRisk),
  });

  return (
    <>
      <PageHeader
        title="Nexus Exposure Command Center"
        description="Real-time review of invoice activity against configured state thresholds."
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <DataModeToggle mode={requestedDataMode} source={source} />
            <Link className="primary-button px-4 py-2.5 text-sm" href="/review">
              Review Queue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <CommandHero
          stateCount={states.length}
          healthyCount={healthyStates.length}
          reviewCount={reviewInvoices.length}
          accountingReviewCount={accountingReviewInvoices.length}
        />
        <RecommendedActions
          reviewCount={reviewInvoices.length}
          accountingReviewCount={accountingReviewInvoices.length}
          ocrCount={ocrNeedsReviewInvoices.length}
          highestRiskState={highestRiskState}
          highestRiskInvoice={nextCrossingRisk?.invoice.invoiceNumber ?? heroInvoice?.invoiceNumber}
        />
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <RiskMetric href="/states" icon={<Eye className="h-6 w-6" />} label="75% Watch" value={watchStates.length} detail="Configured states in the watch band" tone="amber" pill="Watch" />
        <RiskMetric href="/states" icon={<AlertTriangle className="h-6 w-6" />} label="90% Warning" value={warningStates.length} detail="Configured states in the warning band" tone="orange" pill="Review" />
        <RiskMetric href="/states" icon={<TrendingUp className="h-6 w-6" />} label="Above Configured Threshold" value={crossedStates.length} detail="Configured threshold crossed" tone="red" pill="Alert" />
        <RiskMetric href={nextCrossingRisk ? `/invoices/${nextCrossingRisk.invoice.id}` : "/invoices"} icon={<Sparkles className="h-6 w-6" />} label="Next Crossing Risk" value={nextCrossingRisk?.invoice.invoiceNumber ?? "None"} detail={nextCrossingRisk ? `${nextCrossingRisk.invoice.shipToState ?? "Missing state"} projected exposure ${formatPercent(nextCrossingRisk.impact.percentAfterInvoice)}` : "Threshold preview unavailable"} tone="indigo" />
        <RiskMetric href={highestRiskState ? `/states/${highestRiskState.stateCode}` : "/states"} icon={<Flag className="h-6 w-6" />} label={`${highestRiskState?.stateCode ?? "--"} Remaining Before Threshold`} value={formatCurrency(highestRiskState?.remaining ?? 0)} detail="Based on configured exposure" tone="red" />
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RiskMetric href="/invoices?filter=ocr_needs_review" icon={<FileCheck2 className="h-6 w-6" />} label="OCR Needs Review" value={ocrNeedsReviewInvoices.length} detail="OCR records remain review based" tone="amber" />
        <RiskMetric href="/invoices?source=document" icon={<FileText className="h-6 w-6" />} label="Source Documents Linked" value={sourceDocumentInvoices.length} detail="Invoices with linked PDFs" tone="indigo" />
        <RiskMetric href="/exports" icon={<CheckCircle2 className="h-6 w-6" />} label="Reviewed Export Readiness" value={exportReadyInvoices.length} detail={`${reviewInvoices.length} blocked by review items`} tone="indigo" />
        <RiskMetric href="/invoices" icon={<FileWarning className="h-6 w-6" />} label="Manual Review Safety" value={manualReviewInvoices.length} detail="Manual or extracted fields awaiting review" tone="orange" />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-5">
        {stateExposure.map((state) => (
          <DashboardStateCard key={state.rule.stateCode} state={state} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <DashboardStateMonitor states={states} exposures={stateExposure} />
        <DashboardAiBrief brief={brief} reviewCount={reviewInvoices.length} warningState={warningStates[0] ?? highestRiskState} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReviewQueuePreview invoices={reviewInvoices} />
        <RecentInvoices invoices={recentInvoices} />
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <FooterPulse href="/exports" label="Approved / reviewed invoices" value={approvedInvoices.length} detail="Approved or exported invoices in live data" />
        <FooterPulse href="/invoices?filter=ocr_needs_review" label="OCR/manual review safety" value={ocrNeedsReviewInvoices.length + manualReviewInvoices.length} detail="Source extraction remains review based" />
        <FooterPulse href="/rules" label="Decision support mode" value="On" detail="Final treatment should be reviewed with accounting" />
      </div>
    </>
  );
}

function CommandHero({
  stateCount,
  healthyCount,
  reviewCount,
  accountingReviewCount,
}: {
  stateCount: number;
  healthyCount: number;
  reviewCount: number;
  accountingReviewCount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_left,#4338ca_0%,#11105f_38%,#020617_100%)] p-7 text-white shadow-2xl shadow-blue-950/25">
      <div className="absolute right-8 top-8 h-36 w-36 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/15">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Nexus Exposure Command Center</h2>
            <p className="mt-1 text-sm text-blue-100">
              Real-time review of invoice activity against configured state thresholds.
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <HeroKpi href="/states" icon={<ShieldCheck className="h-8 w-8" />} value={stateCount} label="States Monitored" detail="Configured state rules" />
          <HeroKpi href="/states" icon={<CheckCircle2 className="h-8 w-8" />} value={healthyCount} label="Healthy States" detail="Below configured watch band" />
          <HeroKpi href="/review?tab=needs_review" icon={<ClipboardList className="h-8 w-8" />} value={reviewCount} label="Invoices Needing Review" detail="Review queue and extraction items" />
          <HeroKpi href="/review?tab=accounting_review" icon={<Target className="h-8 w-8" />} value={accountingReviewCount} label="Accounting Review" detail="Awaiting accounting completion" />
        </div>
      </div>
    </section>
  );
}

function RecommendedActions({
  reviewCount,
  accountingReviewCount,
  ocrCount,
  highestRiskState,
  highestRiskInvoice,
}: {
  reviewCount: number;
  accountingReviewCount: number;
  ocrCount: number;
  highestRiskState?: StateNexusSummary;
  highestRiskInvoice?: string;
}) {
  const actions = [
    {
      title: `Review ${highestRiskState?.stateName ?? "highest risk"} invoices in the review queue`,
      detail: `${reviewCount} invoices need attention`,
      href: "/review?tab=needs_review",
    },
    {
      title: "Complete Accounting Review items",
      detail: `${accountingReviewCount} invoices in accounting review`,
      href: "/review?tab=accounting_review",
    },
    {
      title: "Export approved invoices only",
      detail: "Keep export clean and audit ready",
      href: "/exports",
    },
    {
      title: "Review OCR detected fields before approval",
      detail: ocrCount ? `${ocrCount} OCR items need review` : highestRiskInvoice ? `Confirm invoice ${highestRiskInvoice}` : "Confirm accuracy of extracted data",
      href: ocrCount ? "/review?tab=ocr_needs_review" : "/invoices?filter=approved",
    },
  ];

  return (
    <section className="premium-card relative overflow-hidden p-6">
      <div className="absolute right-6 top-8 hidden h-28 w-28 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-300 md:flex">
        <ClipboardCheck className="h-16 w-16" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
          <Sparkles className="h-4 w-4" />
          Recommended Next Actions
        </div>
        <div className="mt-5 space-y-4 pr-0 md:pr-32">
          {actions.map((action, index) => (
            <Link key={action.title} href={action.href} className="group flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-xs font-bold text-white shadow-sm">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-950 group-hover:text-indigo-700">{action.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{action.detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardStateCard({ state }: { state: StateExposure }) {
  const status = state.status;
  const tone = statusTone[status];
  const overThreshold = Math.max(state.taxableTotal - state.rule.thresholdAmount, 0);

  return (
    <Link
      href={`/states/${state.rule.stateCode}`}
      className={`premium-card group overflow-hidden bg-gradient-to-br ${tone.panel} p-5 transition hover:-translate-y-0.5 hover:shadow-xl ${
        status === "crossed" ? "ring-1 ring-red-200" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <StateSilhouette stateCode={state.rule.stateCode} className="h-11 w-11 text-slate-500 transition group-hover:scale-105" />
          <div>
            <h2 className="text-lg font-bold text-slate-950">{state.rule.stateName}</h2>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{state.rule.stateCode}</div>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${status === "crossed" ? "bg-red-50 text-red-700 ring-red-200" : status === "warning" ? "bg-orange-50 text-orange-700 ring-orange-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
          {status === "safe" ? "Healthy" : formatPercent(state.percentUsed)}
        </span>
      </div>
      <ThresholdBar percent={state.percentUsed} status={status} className="mt-5" />
      <div className="mt-4 space-y-2 text-sm">
        <MetricLine label="Current exposure" value={formatCurrency(state.taxableTotal)} />
        <MetricLine label="Configured threshold" value={formatCurrency(state.rule.thresholdAmount)} />
        <MetricLine
          label={overThreshold > 0 ? "Over threshold" : "Remaining before threshold"}
          value={formatCurrency(overThreshold > 0 ? overThreshold : state.remaining)}
          danger={overThreshold > 0 || status === "warning"}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 border-t border-slate-200 pt-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">In review</div>
          <div className="font-bold text-slate-950">{state.inReviewCount}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Approved</div>
          <div className="font-bold text-slate-950">{state.approvedCount}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${status === "crossed" ? "bg-red-50 text-red-700" : status === "warning" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>
            {status === "crossed" || status === "warning" ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </span>
          <div>
            <div className="text-xs font-bold text-slate-950">{state.highestRiskInvoice?.invoiceNumber ?? "No invoice risk"}</div>
            <div className="text-xs text-slate-500">{state.nextAction}</div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function DashboardStateMonitor({ states, exposures }: { states: StateNexusSummary[]; exposures: StateExposure[] }) {
  const exposureByCode = new Map(exposures.map((state) => [state.rule.stateCode, state]));

  return (
    <section className="data-grid">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-950">State Nexus Monitor</h2>
          <p className="mt-1 text-xs text-slate-500">Configured threshold exposure with review and trend signals.</p>
        </div>
        <Link href="/states" className="secondary-button px-3 py-2 text-sm">
          View all states
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">State</th>
              <th className="px-5 py-3 text-right">Exposure Used</th>
              <th className="px-5 py-3 text-right">Current Exposure</th>
              <th className="px-5 py-3 text-right">Configured Threshold</th>
              <th className="px-5 py-3 text-right">Remaining</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">In Review</th>
              <th className="px-5 py-3 text-right">Approved</th>
              <th className="px-5 py-3 text-right">OCR</th>
              <th className="px-5 py-3">Next Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {states.map((state) => {
              const exposure = exposureByCode.get(state.stateCode);
              return (
                <tr key={state.stateCode}>
                  <td className="px-5 py-4 font-bold text-slate-950">{state.stateName}</td>
                  <td className={`px-5 py-4 text-right font-bold ${statusTone[state.status].text}`}>{formatPercent(state.percentUsed)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">{formatCurrency(state.taxableTotal)}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatCurrency(state.thresholdAmount)}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatCurrency(state.remaining)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={state.status === "safe" ? "healthy" : state.status} />
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">{exposure?.inReviewCount ?? 0}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">{exposure?.approvedCount ?? 0}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">{exposure?.ocrNeedsReviewCount ?? 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`h-4 w-4 ${state.status === "safe" ? "text-slate-500" : statusTone[state.status].text}`} />
                      <span className="text-xs text-slate-500">{exposure?.nextAction ?? state.nextAction}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DashboardAiBrief({
  brief,
  reviewCount,
  warningState,
}: {
  brief: string;
  reviewCount: number;
  warningState?: StateNexusSummary;
}) {
  return (
    <aside className="premium-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-slate-950">AI Brief</h2>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
          Powered by NexusWatch AI
        </span>
      </div>
      <div className="mt-5 space-y-4">
        <BriefLine icon={<Sparkles className="h-4 w-4" />} text={brief} />
        <BriefLine icon={<FileWarning className="h-4 w-4" />} text={`${reviewCount} invoices require review before they can be included in a clean export.`} />
        <BriefLine icon={<Target className="h-4 w-4" />} text={`${warningState?.stateName ?? "One state"} is the highest configured exposure band at ${formatPercent(warningState?.percentUsed ?? 0)}.`} />
        <BriefLine icon={<FileCheck2 className="h-4 w-4" />} text="Review high-risk invoices to keep exports accurate and audit-ready." />
      </div>
      <Link href="/ai-brief" className="primary-button mt-6 w-full justify-center px-4 py-2.5 text-sm">
        View AI Insights
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Decision support only. Review configured thresholds and invoice treatment with accounting.
      </p>
    </aside>
  );
}

function RiskMetric({
  href,
  icon,
  label,
  value,
  detail,
  tone,
  pill,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone: "amber" | "orange" | "red" | "indigo";
  pill?: string;
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  }[tone];

  return (
    <Link href={href} className="premium-card block p-5 transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${tones}`}>{icon}</span>
        {pill ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tones}`}>{pill}</span>
        ) : null}
      </div>
      <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-950">{value}</div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div>
    </Link>
  );
}

function HeroKpi({ href, icon, value, label, detail }: { href: string; icon: ReactNode; value: number | string; label: string; detail: string }) {
  return (
    <Link href={href} className="block border-white/10 transition hover:text-cyan-100 md:border-l md:pl-8">
      <div className="flex items-center gap-4">
        <span className="text-cyan-300">{icon}</span>
        <div className="text-4xl font-bold">{value}</div>
      </div>
      <div className="mt-3 text-sm font-bold text-white">{label}</div>
      <div className="mt-1 text-xs text-blue-200">{detail}</div>
    </Link>
  );
}

function StateSilhouette({ stateCode, className }: { stateCode: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d={stateArt[stateCode] ?? "M12 20 31 10 52 20 47 45 31 55 14 45Z"} fill="currentColor" opacity="0.9" />
      <path d={stateArt[stateCode] ?? "M12 20 31 10 52 20 47 45 31 55 14 45Z"} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.18" />
    </svg>
  );
}

function ThresholdBar({ percent, status, className = "" }: { percent: number; status: ThresholdStatus; className?: string }) {
  return (
    <div className={className}>
      <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${statusTone[status].bar}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        <div className="absolute left-[75%] top-0 h-full w-px bg-slate-700/60" />
        <div className="absolute left-[90%] top-0 h-full w-px bg-slate-950/70" />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <span>0%</span>
        <span>75%</span>
        <span>90%</span>
      </div>
    </div>
  );
}

function BriefLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
        {icon}
      </span>
      <p className="text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}

function FooterPulse({ href, label, value, detail }: { href: string; label: string; value: string | number; detail: string }) {
  return (
    <Link href={href} className="premium-card block p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{detail}</div>
        </div>
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
      </div>
    </Link>
  );
}

function MetricLine({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${danger ? "text-red-600" : "text-slate-950"}`}>{value}</span>
    </div>
  );
}

