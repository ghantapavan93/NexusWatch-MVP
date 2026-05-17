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
import { CALCULATION_RULES } from "@/lib/constants";
import { demoCompany } from "@/lib/demoData";
import { getSupabaseStatus } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const supabase = getSupabaseStatus();
  const sections = [
    { id: "overview", label: "Overview", icon: Grid2X2 },
    { id: "measurement", label: "Measurement", icon: CalendarDays },
    { id: "threshold-rules", label: "Threshold Rules", icon: Zap },
    { id: "review-workflow", label: "Review & Workflow", icon: Workflow },
    { id: "exports", label: "Exports", icon: Download },
    { id: "integrations", label: "Data & Integrations", icon: Database },
    { id: "general", label: "General", icon: Settings2 },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Read-only summary of the active configuration. Editable items link to the page where they live."
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
          value="Calendar Year"
          detail="Jan 1 - Dec 31"
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
        <div className="space-y-5">
          <section className="grid gap-5 lg:grid-cols-2">
            <SettingsPanel
              id="threshold-rules"
              icon={ShieldCheck}
              title="Threshold Rules"
              description="Risk bands used by Dashboard and States. Configured threshold per state is editable on the Rules page."
              rows={[
                ["75% watch band", "Yes", "good"],
                ["90% warning band", "Yes", "good"],
                ["Above configured threshold", "Crossed", "alert"],
                ["Configured rounding", CALCULATION_RULES.ROUND_TO_CENTS ? "Cents" : "Raw", ""],
              ]}
              footer={{ label: "Open Rules", href: "/rules" }}
            />
            <SettingsPanel
              id="review-workflow"
              icon={Workflow}
              title="Review Workflow"
              description="How invoices flow through review and accounting."
              rows={[
                ["Require ship-to for threshold", CALCULATION_RULES.REQUIRE_SHIP_TO_FOR_THRESHOLD ? "Yes" : "No", "good"],
                ["Missing ship-to behavior", "Skip and flag", ""],
                ["Allow negative invoices", CALCULATION_RULES.ALLOW_NEGATIVE_INVOICES ? "With flag" : "Block", "pill"],
                ["Allow zero invoices", CALCULATION_RULES.ALLOW_ZERO_DOLLAR_INVOICES ? "With flag" : "Block", "pill"],
              ]}
              footer={{ label: "Open Review Queue", href: "/review" }}
            />
            <SettingsPanel
              id="exports"
              icon={FileText}
              title="Export Rules"
              description="What can be exported and the required gates."
              rows={[
                ["Reviewed export requires approval", "Yes", "good"],
                ["Reviewed export requires ship-to", CALCULATION_RULES.EXPORT_REQUIRES_SHIP_TO ? "Yes" : "No", "good"],
                ["Reviewed export requires category", CALCULATION_RULES.EXPORT_REQUIRES_CATEGORY ? "Yes" : "No", "good"],
                ["Audit log on export", "Yes", "good"],
              ]}
              footer={{ label: "Open Exports", href: "/exports" }}
            />
            <SettingsPanel
              id="measurement"
              icon={SlidersHorizontal}
              title="Calculation Defaults"
              description="System-wide constants applied to every invoice."
              rows={[
                ["Measurement period", CALCULATION_RULES.MEASUREMENT_PERIOD.replaceAll("_", " "), ""],
                ["Fiscal year start month", String(CALCULATION_RULES.FISCAL_YEAR_START_MONTH), ""],
                ["Include US territories", CALCULATION_RULES.INCLUDE_US_TERRITORIES ? "Yes" : "No", "pill"],
                ["Large invoice threshold", "$50,000", ""],
              ]}
              footer={{ label: "Open Rules", href: "/rules" }}
            />
            <SettingsPanel
              id="integrations"
              icon={Database}
              title="Data & Integrations"
              description="Active and planned data sources."
              rows={[
                ["Supabase (Primary)", supabase.enabled ? "Connected" : "Not configured", supabase.enabled ? "good" : "pill"],
                ["QuickBooks Integration", "Future scope", "roadmap"],
                ["Email Intake Assistant", "Future scope", "roadmap"],
                ["OCR for scanned PDFs", "Best-effort review only", "pill"],
              ]}
              footer={{ label: "Open health check", href: "/api/health", external: true }}
            />
            <SettingsPanel
              id="general"
              icon={Settings2}
              title="General"
              description="App-wide display preferences."
              rows={[
                ["Decision support wording", "Enforced", "good"],
                ["Audit logging", "On", "good"],
                ["Timezone", "America/Chicago", ""],
                ["Date format", "MMM d, yyyy", ""],
                ["Currency", "USD", ""],
              ]}
            />
          </section>

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

function SettingsPanel({
  id,
  icon: Icon,
  title,
  description,
  rows,
  footer,
}: {
  id?: string;
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  rows: string[][];
  footer?: { label: string; href: string; external?: boolean };
}) {
  return (
    <section id={id} className="premium-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">Read only</span>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map(([label, value, style]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-slate-700">{label}</span>
            <SettingValue value={value} style={style} />
          </div>
        ))}
      </div>
      {footer ? (
        footer.external ? (
          <a
            href={footer.href}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
          >
            {footer.label} &rarr;
          </a>
        ) : (
          <Link
            href={footer.href}
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
          >
            {footer.label} &rarr;
          </Link>
        )
      ) : null}
    </section>
  );
}

function SettingValue({ value, style }: { value: string; style?: string }) {
  if (style === "good") return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">{value}</span>;
  if (style === "roadmap") return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{value}</span>;
  if (style === "pill") return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">{value}</span>;
  if (style === "alert") return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">{value}</span>;
  return <span className="text-right font-bold text-slate-700">{value}</span>;
}

function LockedRulesTable() {
  const rows = [
    ["Nexus Determination", "Defines nexus presence by state based on configured thresholds.", "Active", "Configurable", "Edit per-state threshold and category logic on the Rules page.", "/rules"],
    ["Taxability", "Per-line taxability driven by category and configured rule.", "Active", "Configurable", "Configurable on the Rules page.", "/rules"],
    ["Shipping & Sourcing", "Ship-to state is primary; ship/bill mismatch raises review flag.", "Active", "Locked", "Built-in. Mismatches surface in the Review Queue.", "/review?tab=missing_fields"],
    [
      "Rounding & Calculations",
      "Defines rounding and measurement window applied to every invoice.",
      "Active",
      "Locked",
      `Rounding: ${CALCULATION_RULES.ROUND_TO_CENTS ? "Cents" : "Raw"} · Measurement: ${CALCULATION_RULES.MEASUREMENT_PERIOD.replaceAll("_", " ")}`,
      null,
    ],
  ];

  return (
    <section className="data-grid">
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
    ["Measurement Period", "Calendar Year"],
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
    <section className="premium-card p-5">
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
      <h2 className="font-black text-slate-950">Quick Actions</h2>
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
          <Download className="h-4 w-4" />
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
