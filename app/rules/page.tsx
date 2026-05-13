import { PageHeader } from "@/components/layout/PageHeader";
import { RulesDisclaimer } from "@/components/rules/RulesDisclaimer";
import { RulesTable } from "@/components/rules/RulesTable";
import { getNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const { rules } = await getNexusWatchData();
  const taxableCounts = {
    saas: rules.filter((rule) => rule.saasTaxable).length,
    hardware: rules.filter((rule) => rule.hardwareTaxable).length,
    services: rules.filter((rule) => rule.servicesTaxable).length,
  };

  return (
    <>
      <PageHeader title="Rules" description="Editable demo rules for configured state thresholds and category taxability assumptions." />
      <RulesDisclaimer />
      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Configured States" value={rules.length} detail="Persisted demo rules" />
        <SummaryCard label="SaaS Taxable" value={taxableCounts.saas} detail="States counting SaaS lines" />
        <SummaryCard label="Hardware Taxable" value={taxableCounts.hardware} detail="States counting hardware lines" />
        <SummaryCard label="Services Taxable" value={taxableCounts.services} detail="States counting services lines" />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RulesTable rules={rules} />
        <aside className="surface rounded-lg p-5 xl:sticky xl:top-24 xl:self-start">
          <h2 className="text-sm font-semibold text-slate-950">How Rules Are Used</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>Ship-to state selects the configured rule for invoice impact previews.</p>
            <p>Line item category determines whether SaaS, hardware, or professional services are counted toward the demo threshold.</p>
            <p>Missing ship-to invoices are allowed as draft, flagged for review, and skipped from threshold totals.</p>
            <p className="rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              These rules support review workflows only. They do not determine official tax obligations, filing requirements, or registration requirements.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="surface rounded-lg p-4">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}
