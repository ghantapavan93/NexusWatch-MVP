import Link from "next/link";
import { CheckCircle2, FileText, Pencil, Scale, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RulesWorkbench } from "@/components/rules/RulesWorkbench";
import { formatDate } from "@/lib/format";
import { getNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const { rules } = await getNexusWatchData();
  const lastReviewed = rules
    .map((rule) => rule.lastReviewed)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const editableCategories = rules.reduce(
    (sum, rule) => sum + (rule.saasTaxable ? 0 : 1) + (rule.hardwareTaxable ? 0 : 1) + (rule.servicesTaxable ? 0 : 1),
    0
  );

  return (
    <>
      <PageHeader
        title="Rules"
        description="Configure state threshold and category logic that drives exposure and recommended actions. Edits save to Supabase and refresh exposure across the app."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/states" className="secondary-button px-4 py-2">
              View State Exposure
            </Link>
            <Link href="/exports?type=rules_reference" className="primary-button px-4 py-2">
              Export Rules Reference
            </Link>
          </div>
        }
      />
      <section className="premium-card mb-6 grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={FileText}
          label="Configured Rules"
          value={String(rules.length)}
          detail={`Across ${rules.length} state${rules.length === 1 ? "" : "s"}`}
          tone="violet"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Last Rule Review"
          value={lastReviewed ? formatDate(lastReviewed) : "No reviews yet"}
          detail="Updated whenever a rule is saved"
          tone="emerald"
        />
        <SummaryCard
          icon={Pencil}
          label="Excluded Category Treatments"
          value={String(editableCategories)}
          detail="Categories marked Excluded across rules"
          tone="orange"
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Audit Logging"
          value="On"
          detail="Every rule save writes an audit log entry"
          tone="indigo"
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RulesWorkbench rules={rules} />
        <RulesGuardrails />
      </div>
    </>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
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
        <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</div>
        <div className="mt-1 text-xs font-medium text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function RulesGuardrails() {
  const items = [
    ["Not Tax Advice", "Rules do not constitute legal or tax advice. Validate with your tax advisor."],
    ["Representative, Not Exhaustive", "Thresholds reflect configured assumptions and may not cover every scenario."],
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
    </aside>
  );
}
