import {
  Bell,
  CalendarDays,
  ChevronRight,
  Database,
  Download,
  FileText,
  Grid2X2,
  Lock,
  Pencil,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  Workflow,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CALCULATION_RULES } from "@/lib/constants";
import { getSupabaseStatus } from "@/lib/supabase";

export default function SettingsPage() {
  const supabase = getSupabaseStatus();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure rules, measurement period, integrations, and application preferences."
      />

      <nav className="mb-5 flex gap-4 overflow-x-auto border-b border-slate-200">
        {[
          ["Overview", Grid2X2],
          ["Measurement", CalendarDays],
          ["Threshold Rules", Zap],
          ["Review & Workflow", Workflow],
          ["Exports", Download],
          ["Data & Integrations", Database],
          ["General", Settings2],
        ].map(([label, Icon], index) => (
          <button
            key={label as string}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-2 pb-3 text-sm font-black ${
              index === 0 ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {label as string}
          </button>
        ))}
      </nav>

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SettingMetric icon={ShieldCheck} label="Configuration Status" value="Active" detail="All rule sets are active and up to date." tone="emerald" />
        <SettingMetric icon={CalendarDays} label="Last Updated" value="May 13, 2026" detail="10:24 AM by System Administrator" tone="blue" />
        <SettingMetric icon={CalendarDays} label="Measurement Period" value="Calendar Year" detail="Jan 1 - Dec 31, 2026" tone="blue" />
        <SettingMetric icon={Database} label="Data Mode" value={supabase.enabled ? "Production" : "Demo"} detail={supabase.enabled ? "Live data and processing" : supabase.message} tone="indigo" />
        <ConnectionCard enabled={supabase.enabled} message={supabase.message} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="grid gap-5 lg:grid-cols-3">
            <SettingsPanel
              icon={ShieldCheck}
              title="Threshold Rules"
              description="Set risk thresholds and risk level classifications."
              rows={[
                ["Low Risk", "0% - 60%", "Within Policy"],
                ["Medium Risk", "60% - 89%", "Review Required"],
                ["High Risk", "90% - 100%", "Escalate"],
                ["Scoring Model", "Weighted Composite", ""],
              ]}
            />
            <SettingsPanel
              icon={Workflow}
              title="Review Workflow Rules"
              description="Configure how invoices move through the accounting review process."
              rows={[
                ["Require State Review", "On", "toggle"],
                ["Auto Assign Reviewers", "On", "toggle"],
                ["Escalate on High Risk", "On", "toggle"],
                ["Review SLA", "5 business days", ""],
                ["Escalation SLA", "2 business days", ""],
              ]}
            />
            <SettingsPanel
              icon={FileText}
              title="Export Rules"
              description="Configure what can be exported and under what conditions."
              rows={[
                ["Export Reviewed Invoices Only", "On", "toggle"],
                ["Include PII in Exports", "Masked", "pill"],
                ["Allowed Export Types", "State Transactions", ""],
                ["Max Rows per Export", "100,000", ""],
                ["Export Retention", "30 days", ""],
              ]}
            />
            <SettingsPanel
              icon={SlidersHorizontal}
              title="Product Defaults"
              description="Default behaviors applied across the platform."
              rows={[
                ["Default Taxable Status", "Taxable", ""],
                ["Default Ship To Basis", "Ship To", ""],
                ["Default Bill To Basis", "Bill To", ""],
                ["Auto Save", "On", "toggle"],
                ["Audit Logging", "On", "toggle"],
              ]}
            />
            <SettingsPanel
              icon={Database}
              title="Data & Integrations"
              description="Manage data sources, integrations, and connection preferences."
              rows={[
                ["Supabase (Primary)", "Connected", "good"],
                ["QuickBooks Integration", "Disabled", "roadmap"],
                ["Email Intake Assistant", "Disabled", "roadmap"],
                ["Manage Integrations", "Open", ""],
              ]}
            />
            <SettingsPanel
              icon={Settings2}
              title="General Settings"
              description="Application preferences, notifications, and system behavior."
              rows={[
                ["OCR Intake Review", "Enabled", "good"],
                ["System Notifications", "Email", ""],
                ["Timezone", "America/Chicago", ""],
                ["Date Format", "MMM d, yyyy", ""],
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
    <div className="premium-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-600">Connection Status</div>
        <RefreshCcw className="h-4 w-4 text-slate-400" />
      </div>
      <div className={`mt-4 rounded-xl px-4 py-3 ${enabled ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
        <div className="flex items-center justify-between gap-2 text-sm font-black">
          <span>{enabled ? "Supabase Connected" : "Demo Mode"}</span>
          <span className={`h-2 w-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-amber-500"}`} />
        </div>
        <p className="mt-1 text-xs leading-5">{enabled ? "All systems operational" : message}</p>
      </div>
    </div>
  );
}

function SettingsPanel({
  icon: Icon,
  title,
  description,
  rows,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  rows: string[][];
}) {
  return (
    <section className="premium-card p-5">
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
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-5 space-y-3">
        {rows.map(([label, value, style]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-slate-700">{label}</span>
            <SettingValue value={value} style={style} />
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingValue({ value, style }: { value: string; style?: string }) {
  if (style === "toggle") return <span className="h-5 w-9 rounded-full bg-emerald-500 p-0.5"><span className="block h-4 w-4 translate-x-4 rounded-full bg-white shadow-sm" /></span>;
  if (style === "good") return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">{value}</span>;
  if (style === "roadmap") return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{value}</span>;
  if (style === "pill") return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">{value}</span>;
  if (value === "Escalate") return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">{value}</span>;
  if (value === "Review Required") return <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-200">{value}</span>;
  if (value === "Within Policy") return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">{value}</span>;
  return <span className="text-right font-bold text-slate-700">{value}</span>;
}

function LockedRulesTable() {
  const rows = [
    ["Nexus Determination", "Defines nexus presence by state based on economic and physical factors.", "Active", "Locked", "Economic Threshold: $100,000 · Transaction Threshold: 200", "May 2, 2026"],
    ["Taxability", "Determines taxability of transactions based on product and customer attributes.", "Active", "Configurable", "Product Tax Codes: 152 · Exemptions: 24", "May 2, 2026"],
    ["Exemptions", "Rules for applying and validating exemption certificates.", "Active", "Configurable", "Certificate Validity: 36 months · Grace Period: 30 days", "May 1, 2026"],
    ["Shipping & Sourcing", "Determines source of sale, shipping rules, and address validation.", "Active", "Configurable", "Default Ship To Basis: On · Address Validation: Strict", "Apr 28, 2026"],
    ["Rounding & Calculations", "Defines rounding rules and tax calculation precision.", "Active", "Locked", `Rounding: ${CALCULATION_RULES.ROUND_TO_CENTS ? "Cents" : "Raw"} · Measurement: ${CALCULATION_RULES.MEASUREMENT_PERIOD}`, "Apr 28, 2026"],
  ];

  return (
    <section className="data-grid">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="font-black text-slate-950">Locked Product Rules</h2>
            <p className="text-xs text-slate-500">Foundational rules locked to ensure data integrity and consistent decision support.</p>
          </div>
        </div>
        <button className="secondary-button px-3 py-2 text-sm" type="button">View All Rule Details</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Rule Category</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Configurability</th>
              <th className="px-5 py-3">Key Settings</th>
              <th className="px-5 py-3">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map(([category, description, status, config, settings, updated]) => (
              <tr key={category} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-black text-slate-950">{category}</td>
                <td className="px-5 py-3 text-slate-600">{description}</td>
                <td className="px-5 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">{status}</span></td>
                <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${config === "Locked" ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-blue-50 text-blue-700 ring-blue-200"}`}>{config}</span></td>
                <td className="px-5 py-3 text-slate-600">{settings}</td>
                <td className="px-5 py-3 text-slate-600">{updated}</td>
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
    ["Workspace", "Demo Workspace"],
    ["Data Mode", supabaseEnabled ? "Production" : "Demo"],
    ["Measurement Period", "Calendar Year"],
    ["Active Year", "2026"],
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
    ["Application Version", "1.0.0"],
    ["Last Updated", "May 13, 2026 - 10:24 AM"],
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
      <div className="mt-4 grid gap-3">
        <button className="primary-button justify-center px-3 py-3" type="button"><Pencil className="h-4 w-4" /> Edit Settings</button>
        <button className="secondary-button justify-center px-3 py-3" type="button"><Download className="h-4 w-4" /> Export Current Settings</button>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-black text-red-700 hover:bg-red-100" type="button">
          <RefreshCcw className="h-4 w-4" />
          Reset Demo Defaults
        </button>
        <button className="secondary-button justify-center px-3 py-3" type="button"><UploadCloud className="h-4 w-4" /> View Rule Details</button>
      </div>
    </section>
  );
}
