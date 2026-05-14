import { CheckCircle2, Clock3, Eye, FileText, Pencil, Save, Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumRulesTable } from "@/components/rules/PremiumRulesTable";
import { getNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const { rules } = await getNexusWatchData();

  return (
    <>
      <PageHeader
        title="Rules"
        description="Configure state threshold and category logic that drives exposure and recommended actions."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button className="secondary-button px-4 py-2" type="button">Discard Changes</button>
            <button className="secondary-button px-4 py-2 text-indigo-700" type="button">
              <Eye className="h-4 w-4" />
              Preview Impact
            </button>
            <button className="primary-button px-4 py-2" type="button">
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        }
      />
      <section className="premium-card mb-6 grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={FileText} label="Configured Rules" value={rules.length} detail={`Across ${rules.length} states`} tone="violet" />
        <SummaryCard icon={CheckCircle2} label="Published Rules" value={rules.length} detail="Last published 2 days ago" tone="emerald" />
        <SummaryCard icon={Pencil} label="Draft Changes" value={0} detail="Unpublished edits" tone="orange" />
        <SummaryCard icon={Clock3} label="Last Change" valueText="May 14, 2026" detail="by System Admin" tone="indigo" />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PremiumRulesTable rules={rules} />
        <RulesGuardrails />
      </div>
    </>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  valueText,
  detail,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value?: number;
  valueText?: string;
  detail: string;
  tone: "violet" | "emerald" | "orange" | "indigo";
}) {
  const tones = {
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    orange: "bg-orange-50 text-orange-600 ring-orange-100",
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  };

  return (
    <div className="flex items-center gap-5 border-slate-200 xl:border-r xl:last:border-r-0">
      <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ring-1 ${tones[tone]}`}>
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-600">{label}</div>
        <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">{valueText ?? value?.toLocaleString()}</div>
        <div className="mt-1 text-xs font-medium text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function RulesGuardrails() {
  const items = [
    ["Not Tax Advice", "Rules do not constitute legal or tax advice. Validate with your tax advisor."],
    ["Representative, Not Exhaustive", "Thresholds reflect demo assumptions and may not cover every scenario."],
    ["Subject to Change", "Rules, guidance, and audit focus change often. Review rules regularly."],
    ["Document Judgment", "Provide clear review notes to support your decision rationale."],
    ["Prefer Conservative Defaults", "When in doubt, escalate for review rather than auto-approve."],
  ];

  return (
    <aside className="premium-card p-5 xl:sticky xl:top-24 xl:self-start">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Scale className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-black text-slate-950">Decision Support Guardrails</h2>
          <p className="text-xs text-slate-500">Safe assumptions for review workflows.</p>
        </div>
      </div>
      <div className="mt-5 space-y-5">
        {items.map(([title, body]) => (
          <div key={title} className="flex gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
            <div>
              <div className="text-sm font-black text-slate-950">{title}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
        <div className="text-sm font-black text-violet-950">Need help?</div>
        <p className="mt-2 text-sm leading-6 text-violet-900/80">Use AI Brief to understand recommendations or contact your tax team for guidance.</p>
        <a className="secondary-button mt-4 px-3 py-2 text-sm text-indigo-700" href="/ai-brief">Open AI Brief</a>
      </div>
    </aside>
  );
}
