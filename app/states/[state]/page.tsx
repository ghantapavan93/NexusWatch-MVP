import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatPercent } from "@/lib/format";
import { buildStateSummaries } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function StateDetailPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateParam } = await params;
  const code = stateParam.toUpperCase();
  const { invoices, rules } = await getNexusWatchData();
  const state = buildStateSummaries(rules, invoices).find((item) => item.stateCode === code);
  const rule = rules.find((item) => item.stateCode === code);
  if (!state || !rule) notFound();

  const stateInvoices = invoices.filter((invoice) => invoice.shipToState === code);

  return (
    <>
      <PageHeader title={state.stateName} description="Detailed view of threshold usage, taxability rule configuration, and related invoices." />
      <section className="grid gap-4 md:grid-cols-4">
        <StateDetailMetric label="Threshold" value={formatCurrency(state.thresholdAmount)} />
        <StateDetailMetric label="Taxable Total" value={formatCurrency(state.taxableTotal)} />
        <StateDetailMetric label="Percent Used" value={formatPercent(state.percentUsed)} />
        <div className="premium-card p-5"><div className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</div><div className="mt-3"><StatusBadge status={state.status} /></div></div>
      </section>
      <section className="data-grid mt-6 p-5">
        <h2 className="text-sm font-bold text-slate-950">Related Invoices</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {stateInvoices.map((invoice) => (
            <div key={invoice.id} className="grid gap-3 py-3 text-sm md:grid-cols-4">
              <span className="font-medium">{invoice.invoiceNumber}</span>
              <span>{invoice.customerName}</span>
              <span>{formatCurrency(invoice.taxableAmount)}</span>
              <StatusBadge status={invoice.reviewStatus} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function StateDetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="premium-card p-5">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
    </div>
  );
}
