import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Database,
  Download,
  ExternalLink,
  FileText,
  Grid2X2,
  Lock,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsEditor } from "@/components/settings/SettingsEditor";
import { getAppSettings } from "@/lib/appSettings";
import { CALCULATION_RULES } from "@/lib/constants";
import { demoCompany } from "@/lib/demoData";
import { getSupabaseStatus } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = getSupabaseStatus();
  const settings = await getAppSettings();
  const sections = [
    { id: "overview", label: "Overview", icon: Grid2X2 },
    { id: "threshold-bands", label: "Threshold Bands", icon: Zap },
    { id: "review-workflow", label: "Review Workflow", icon: Workflow },
    { id: "exports", label: "Reviewed Export Gates", icon: Download },
    { id: "measurement", label: "Measurement", icon: CalendarDays },
    { id: "locked-rules", label: "Locked Rules", icon: Lock },
    { id: "integrations", label: "Data & Integrations", icon: Database },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Live runtime settings backed by Supabase. Edits update flag logic, dashboard counts, and export gates immediately."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="secondary-button px-4 py-2"
            >
              <ExternalLink className="h-4 w-4" />
              Health check
            </a>
            <Link href="/rules" className="primary-button px-4 py-2">
              Edit Rules
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <nav className="mb-5 flex gap-4 overflow-x-auto border-b border-slate-200" aria-label="Settings sections">
        {sections.map(({ id, label, icon: Icon }, index) => (
          <a
            key={id}
            href={`#${id}`}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-2 pb-3 text-sm font-black ${
              index === 0
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        ))}
      </nav>

      <section id="overview" className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SettingMetric
          icon={ShieldCheck}
          label="Configuration Status"
          value="Active"
          detail="Rules and workflows are active."
          tone="emerald"
        />
        <SettingMetric
          icon={CalendarDays}
          label="Workspace"
          value={demoCompany.name}
          detail="Configured demo company"
          tone="blue"
        />
        <SettingMetric
          icon={CalendarDays}
          label="Measurement Period"
          value={settings.measurementPeriod === "fiscal_year" ? "Fiscal year" : "Calendar year"}
          detail={settings.measurementPeriod === "fiscal_year" ? `Starts month ${settings.fiscalYearStartMonth}` : "Jan 1 - Dec 31"}
          tone="blue"
        />
        <SettingMetric
          icon={Database}
          label="Data Mode"
          value={supabase.enabled ? "Supabase" : "Local Demo"}
          detail={supabase.enabled ? "Live data and processing" : supabase.message}
          tone="indigo"
        />
        <ConnectionCard enabled={supabase.enabled} message={supabase.message} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <SettingsEditor initialSettings={settings} />
          <LockedRulesTable />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <EnvironmentPanel supabaseEnabled={supabase.enabled} />
          <SystemInfoPanel />
          <QuickActionsPanel />
        </aside>
      </div>
    </>
  );
}

function SettingMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "blue" | "indigo";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className="premium-card flex items-center gap-4 p-5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs font-bold text-slate-600">{label}</div>
        <div className="mt-1 text-base font-black text-slate-950">{value}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function ConnectionCard({ enabled, message }: { enabled: boolean; message: string }) {
  return (
    <a
      href="/api/health"
      target="_blank"
      rel="noreferrer"
      className="premium-card block p-5 transition hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-600">Connection Status</div>
        <ExternalLink className="h-4 w-4 text-slate-400" />
      </div>
      <div className={`mt-4 rounded-xl px-4 py-3 ${enabled ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
        <div className="flex items-center justify-between gap-2 text-sm font-black">
          <span>{enabled ? "Supabase Connected" : "Demo Mode"}</span>
          <span className={`h-2 w-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-amber-500"}`} />
        </div>
        <p className="mt-1 text-xs leading-5">{enabled ? "All systems operational" : message}</p>
      </div>
    </a>
  );
}

function LockedRulesTable() {
  const rows = [
    ["Nexus Determination", "Defines nexus presence by state based on configured thresholds.", "Active", "Configurable", "Edit per-state threshold and category logic on the Rules page.", "/rules"],
    ["Taxability", "Per-line taxability driven by category and configured rule.", "Active", "Configurable", "Configurable on the Rules page.", "/rules"],
    ["Shipping & Sourcing", "Ship-to state is primary; ship/bill mismatch raises review flag.", "Active", "Locked", "Built-in. Mismatches surface in the Review Queue.", "/review?tab=missing_fields"],
    [
      "Rounding & Calculations",
      "Defines rounding applied to every invoice.",
      "Active",
      "Locked",
      `Rounding: ${CALCULATION_RULES.ROUND_TO_CENTS ? "Cents" : "Raw"}`,
      null,
    ],
  ];

  return (
    <section id="locked-rules" className="data-grid">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="font-black text-slate-950">Product Rules</h2>
            <p className="text-xs text-slate-500">Foundational rules. Editable items link to the Rules page.</p>
          </div>
        </div>
        <Link href="/rules" className="secondary-button px-3 py-2 text-sm">
          Open Rules
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Rule Category</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Configurability</th>
              <th className="px-5 py-3">Where to change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map(([category, description, status, config, action, href]) => (
              <tr key={category as string} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-black text-slate-950">{category}</td>
                <td className="px-5 py-3 text-slate-600">{description}</td>
                <td className="px-5 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">{status}</span></td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${config === "Locked" ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-blue-50 text-blue-700 ring-blue-200"}`}>
                    {config}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {href ? (
                    <Link href={href as string} className="font-bold text-blue-700 hover:text-blue-900">
                      {action} &rarr;
                    </Link>
                  ) : (
                    action
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EnvironmentPanel({ supabaseEnabled }: { supabaseEnabled: boolean }) {
  const rows = [
    ["Workspace", demoCompany.name],
    ["Data Mode", supabaseEnabled ? "Supabase" : "Local Demo"],
    ["Demo Data", "Enabled"],
  ];

  return (
    <section className="premium-card p-5">
      <h2 className="flex items-center gap-2 font-black text-slate-950"><Settings2 className="h-5 w-5 text-indigo-600" /> Environment</h2>
      <div className="mt-4 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-black text-slate-800">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SystemInfoPanel() {
  const rows = [
    ["Application", "NexusWatch"],
    ["Timezone", "America/Chicago"],
    ["Currency", "USD"],
    ["Date Format", "MMM d, yyyy"],
  ];

  return (
    <section id="integrations" className="premium-card p-5">
      <h2 className="flex items-center gap-2 font-black text-slate-950"><Bell className="h-5 w-5 text-indigo-600" /> System Information</h2>
      <div className="mt-4 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="text-right font-black text-slate-800">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickActionsPanel() {
  return (
    <section className="premium-card p-5">
      <h2 className="font-black text-slate-950"><SlidersHorizontal className="mr-2 inline h-5 w-5 text-indigo-600" />Quick Actions</h2>
      <p className="mt-1 text-xs text-slate-500">All actions navigate to a real working page.</p>
      <div className="mt-4 grid gap-3">
        <Link href="/rules" className="primary-button justify-center px-3 py-3">
          Edit Rules
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/exports?type=rules_reference" className="secondary-button justify-center px-3 py-3">
          <Download className="h-4 w-4" />
          Export Rules Reference
        </Link>
        <Link href="/exports?type=threshold_summary" className="secondary-button justify-center px-3 py-3">
          <FileText className="h-4 w-4" />
          Export Threshold Summary
        </Link>
        <a
          href="/api/health"
          target="_blank"
          rel="noreferrer"
          className="secondary-button justify-center px-3 py-3"
        >
          <ExternalLink className="h-4 w-4" />
          Run Health Check
        </a>
      </div>
    </section>
  );
}
