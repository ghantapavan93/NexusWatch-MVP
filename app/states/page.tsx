import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Gauge,
  Radio,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatPercent } from "@/lib/format";
import { buildStateSummaries } from "@/lib/nexus";
import { getScopedNexusWatchData } from "@/lib/supabaseData";
import { buildStateExposureDetails } from "@/lib/thresholdImpact";
import type { StateNexusSummary, ThresholdStatus } from "@/types";

export const dynamic = "force-dynamic";

type StateExposure = ReturnType<typeof buildStateExposureDetails>;

const stateArt: Record<string, string> = {
  CA: "M28 6 40 13 37 24 45 35 37 48 40 58 31 63 23 49 15 43 18 31 10 20 17 10Z",
  IL: "M31 5 42 12 39 28 44 40 36 61 25 55 29 35 23 18Z",
  NY: "M8 30 26 24 43 18 58 24 51 31 37 29 26 38 10 39Z",
  TX: "M11 19 29 18 36 9 45 21 58 23 52 36 42 39 38 56 28 46 18 48 17 36 8 30Z",
  WA: "M9 21 28 15 40 19 56 17 59 30 47 36 32 31 17 35Z",
};

const statusTone: Record<ThresholdStatus, { bar: string; icon: string; panel: string; text: string; dot: string }> = {
  safe: {
    bar: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    panel: "from-emerald-50/80 to-white",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  watch: {
    bar: "bg-amber-500",
    icon: "bg-amber-50 text-amber-700 ring-amber-100",
    panel: "from-amber-50/80 to-white",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  warning: {
    bar: "bg-orange-500",
    icon: "bg-orange-50 text-orange-700 ring-orange-100",
    panel: "from-orange-50/80 to-white",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  crossed: {
    bar: "bg-red-500",
    icon: "bg-red-50 text-red-700 ring-red-100",
    panel: "from-red-50/80 to-white",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

export default async function StatesPage() {
  const { invoices, rules } = await getScopedNexusWatchData();
  const states = buildStateSummaries(rules, invoices);
  const exposureByState = new Map(rules.map((rule) => [rule.stateCode, buildStateExposureDetails(rule, invoices)]));
  const sortedStates = [...states].sort((a, b) => b.percentUsed - a.percentUsed);
  const topRiskState = sortedStates[0];
  const weightedAverage =
    states.length > 0 ? states.reduce((sum, state) => sum + state.percentUsed, 0) / states.length : 0;
  const statusCounts = {
    safe: states.filter((state) => state.status === "safe").length,
    watch: states.filter((state) => state.status === "watch").length,
    warning: states.filter((state) => state.status === "warning").length,
    crossed: states.filter((state) => state.status === "crossed").length,
  };

  return (
    <>
      <PageHeader
        title="States"
        description="Monitor taxable exposure, threshold usage, and risk across configured state rules."
        action={
          <Link href="/review" className="primary-button px-4 py-2.5 text-sm">
            Review Queue
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StateSummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="States Monitored" value={states.length} detail="Configured and active" tone="blue" />
        <StateSummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Healthy States" value={statusCounts.safe} detail={`${Math.round((statusCounts.safe / Math.max(states.length, 1)) * 100)}% of states`} tone="green" />
        <StateSummaryCard icon={<Activity className="h-5 w-5" />} label="Watch Band" value={statusCounts.watch} detail="75% - 90% threshold" tone="amber" />
        <StateSummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="Warning Band" value={statusCounts.warning} detail="90% - 100% threshold" tone="orange" />
        <StateSummaryCard icon={<Zap className="h-5 w-5" />} label="Crossed Threshold" value={statusCounts.crossed} detail="Over configured threshold" tone="red" />
        <StateSummaryCard icon={<TrendingUp className="h-5 w-5" />} label="Highest Exposure" value={formatPercent(topRiskState?.percentUsed ?? 0)} detail={`${topRiskState?.stateCode ?? "--"} - ${topRiskState?.stateName ?? "No data"}`} tone="indigo" />
      </section>

      <section className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {sortedStates.map((state) => (
            <StateExposureCard
              key={state.stateCode}
              state={state}
              exposure={exposureByState.get(state.stateCode)}
            />
          ))}
        </div>
        <aside className="premium-card flex flex-col justify-between overflow-hidden p-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <Zap className="h-4 w-4" />
                </span>
                AI State Insights
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                Insights
              </span>
            </div>
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-slate-950 to-blue-950 p-5 text-white shadow-xl shadow-blue-950/20">
              <p className="text-sm font-semibold text-blue-100">{topRiskState?.stateName ?? "No state"} needs attention</p>
              <p className="mt-2 text-2xl font-bold">
                {formatPercent(topRiskState?.percentUsed ?? 0)}
              </p>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Review high-value invoices and supporting documents before using this state in final reporting.
              </p>
            </div>
          </div>
          <Link href="/ai-brief" className="secondary-button mt-5 justify-center px-3 py-2 text-sm">
            View full AI Brief
            <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <StateExposureTable states={sortedStates} exposureByState={exposureByState} />

        <aside className="space-y-5">
          <TopRecommendations states={sortedStates} exposureByState={exposureByState} />
          <ThresholdUtilization
            weightedAverage={weightedAverage}
            statusCounts={statusCounts}
            stateCount={states.length}
          />
        </aside>
      </section>

      <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium text-slate-700">Live data</span>
          <span>Updated from Supabase-backed invoice activity</span>
        </div>
        <Link href="/exports" className="secondary-button justify-center px-3 py-2 text-sm">
          <Download className="h-4 w-4" />
          Export States
        </Link>
      </section>
    </>
  );
}

function StateExposureCard({ state, exposure }: { state: StateNexusSummary; exposure?: StateExposure }) {
  const tone = statusTone[state.status];
  return (
    <Link
      href={`/states/${state.stateCode}`}
      className={`premium-card group overflow-hidden bg-gradient-to-br ${tone.panel} p-5 transition hover:-translate-y-0.5 hover:shadow-xl`}
    >
      <div className="flex items-start justify-between gap-3">
        <StateSilhouette stateCode={state.stateCode} className="h-12 w-12 text-slate-500 transition group-hover:scale-105" />
        <StatusBadge status={state.status === "safe" ? "healthy" : state.status} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{state.stateCode}</div>
          <h2 className="text-lg font-bold text-slate-950">{state.stateName}</h2>
        </div>
        <div className={`text-lg font-bold ${tone.text}`}>{formatPercent(state.percentUsed)}</div>
      </div>
      <ThresholdBar percent={state.percentUsed} status={state.status} className="mt-4" />
      <div className="mt-4 space-y-2 border-b border-slate-200/70 pb-4 text-sm">
        <MetricLine label="Taxable total" value={formatCurrency(state.taxableTotal)} />
        <MetricLine label="Threshold" value={formatCurrency(state.thresholdAmount)} />
        <MetricLine label={state.status === "crossed" ? "Over threshold" : "Remaining"} value={formatCurrency(state.status === "crossed" ? state.taxableTotal - state.thresholdAmount : state.remaining)} danger={state.status === "crossed"} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recommended</div>
          <div className={`mt-1 text-sm font-bold ${tone.text}`}>{exposure?.nextAction ?? state.nextAction}</div>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm ring-1 ring-slate-200 transition group-hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function StateExposureTable({
  states,
  exposureByState,
}: {
  states: StateNexusSummary[];
  exposureByState: Map<string, StateExposure>;
}) {
  return (
    <section className="data-grid">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-950">State Nexus Monitor</h2>
          <p className="mt-1 text-xs text-slate-500">75% and 90% markers show configured exposure bands.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/rules" className="secondary-button px-3 py-2 text-xs">
            <Gauge className="h-4 w-4" />
            Configure States
          </Link>
          <Link href="/exports?type=threshold_summary" className="secondary-button px-3 py-2 text-xs">
            <Download className="h-4 w-4" />
            Export threshold summary
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">State</th>
              <th className="px-5 py-3 text-right">Taxable Total</th>
              <th className="px-5 py-3 text-right">Threshold</th>
              <th className="px-5 py-3">Usage</th>
              <th className="px-5 py-3">75%</th>
              <th className="px-5 py-3">90%</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">In Review</th>
              <th className="px-5 py-3">Highest Risk Invoice</th>
              <th className="px-5 py-3">Recommended Action</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {states.map((state) => {
              const exposure = exposureByState.get(state.stateCode);
              const reviewCount = (exposure?.reviewCount ?? 0) + (exposure?.accountingCount ?? 0);
              return (
                <tr key={state.stateCode} className={state.status === "crossed" ? "bg-red-50/35" : undefined}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <StateSilhouette stateCode={state.stateCode} className="h-9 w-9 text-slate-500" />
                      <div>
                        <div className="font-bold text-slate-950">{state.stateName} ({state.stateCode})</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusTone[state.status].dot}`} />
                          Live exposure
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">{formatCurrency(state.taxableTotal)}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatCurrency(state.thresholdAmount)}</td>
                  <td className="px-5 py-4">
                    <div className="min-w-52">
                      <div className="mb-2 font-bold text-slate-950">{formatPercent(state.percentUsed)}</div>
                      <ThresholdBar percent={state.percentUsed} status={state.status} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-500">Watch band</td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-500">Warning band</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={state.status === "safe" ? "healthy" : state.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-950">{reviewCount}</div>
                    <div className="text-xs text-slate-500">in review</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">{exposure?.highestRiskInvoice?.invoiceNumber ?? "None"}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(exposure?.highestRiskInvoice?.taxableAmount ?? 0)}</div>
                  </td>
                  <td className={`px-5 py-4 font-semibold ${statusTone[state.status].text}`}>
                    {exposure?.nextAction ?? state.nextAction}
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/states/${state.stateCode}`} className="secondary-button h-9 w-9 justify-center p-0">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
        <LegendDot color="bg-emerald-500" label="<= 75% Healthy" />
        <LegendDot color="bg-amber-500" label="> 75% Watch" />
        <LegendDot color="bg-orange-500" label="> 90% Warning" />
        <LegendDot color="bg-red-500" label="> 100% Crossed" />
      </div>
    </section>
  );
}

function TopRecommendations({
  states,
  exposureByState,
}: {
  states: StateNexusSummary[];
  exposureByState: Map<string, StateExposure>;
}) {
  const recommendations = states.slice(0, 3);
  return (
    <section className="premium-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <Radio className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold text-slate-950">Top Recommendations</h2>
      </div>
      <div className="mt-4 space-y-3">
        {recommendations.map((state) => (
          <Link
            key={state.stateCode}
            href={`/states/${state.stateCode}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/35"
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 ${statusTone[state.status].icon}`}>
                {state.status === "crossed" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </span>
              <div>
                <div className="font-semibold text-slate-950">{exposureByState.get(state.stateCode)?.nextAction ?? state.nextAction}</div>
                <div className="text-xs text-slate-500">{formatPercent(state.percentUsed)} of threshold</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function ThresholdUtilization({
  weightedAverage,
  statusCounts,
  stateCount,
}: {
  weightedAverage: number;
  statusCounts: Record<ThresholdStatus, number>;
  stateCount: number;
}) {
  const clamped = Math.min(Math.max(weightedAverage, 0), 100);
  return (
    <section className="premium-card p-5">
      <h2 className="text-sm font-bold text-slate-950">Threshold Utilization</h2>
      <div className="mt-5 flex items-center justify-center">
        <div
          className="relative flex h-40 w-40 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#ef4444 0 ${statusCounts.crossed * 20}%, #f97316 0 ${(statusCounts.crossed + statusCounts.warning) * 20}%, #f59e0b 0 ${(statusCounts.crossed + statusCounts.warning + statusCounts.watch) * 20}%, #22c55e 0 100%)`,
          }}
        >
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner">
            <div className="text-3xl font-bold text-slate-950">{formatPercent(clamped)}</div>
            <div className="mt-1 text-center text-xs text-slate-500">Weighted avg.</div>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-2 text-sm">
        <UtilizationLine color="bg-red-500" label="> 100% Crossed" value={`${statusCounts.crossed} state${statusCounts.crossed === 1 ? "" : "s"}`} stateCount={stateCount} count={statusCounts.crossed} />
        <UtilizationLine color="bg-orange-500" label="> 90% Warning" value={`${statusCounts.warning} state${statusCounts.warning === 1 ? "" : "s"}`} stateCount={stateCount} count={statusCounts.warning} />
        <UtilizationLine color="bg-amber-500" label="> 75% Watch" value={`${statusCounts.watch} state${statusCounts.watch === 1 ? "" : "s"}`} stateCount={stateCount} count={statusCounts.watch} />
        <UtilizationLine color="bg-emerald-500" label="<= 75% Healthy" value={`${statusCounts.safe} state${statusCounts.safe === 1 ? "" : "s"}`} stateCount={stateCount} count={statusCounts.safe} />
      </div>
    </section>
  );
}

function StateSummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  detail: string;
  tone: "blue" | "green" | "amber" | "orange" | "red" | "indigo";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  }[tone];

  return (
    <div className="premium-card p-4">
      <div className="flex items-center gap-4">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ring-1 ${tones}`}>{icon}</span>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-950">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{detail}</div>
        </div>
      </div>
    </div>
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
        <div className="absolute left-[75%] top-0 h-full w-px bg-amber-700/70" />
        <div className="absolute left-[90%] top-0 h-full w-px bg-orange-800/70" />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <span>0%</span>
        <span>75%</span>
        <span>90%</span>
      </div>
    </div>
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function UtilizationLine({
  color,
  label,
  value,
  stateCount,
  count,
}: {
  color: string;
  label: string;
  value: string;
  stateCount: number;
  count: number;
}) {
  const percent = stateCount ? Math.round((count / stateCount) * 100) : 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-600">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-semibold text-slate-950">{value} ({percent}%)</span>
    </div>
  );
}
