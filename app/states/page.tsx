import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StateRiskTable } from "@/components/dashboard/StateRiskTable";
import { buildStateSummaries } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function StatesPage() {
  const { invoices, rules } = await getNexusWatchData();
  const states = buildStateSummaries(rules, invoices);

  return (
    <>
      <PageHeader title="States" description="State-level configured threshold usage, remaining capacity, latest invoice activity, and recommended next action." />
      <StateRiskTable states={states} invoices={invoices} rules={rules} />
      <div className="mt-4 flex flex-wrap gap-2">
        {states.map((state) => (
          <Link key={state.stateCode} href={`/states/${state.stateCode}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {state.stateName}
          </Link>
        ))}
      </div>
    </>
  );
}
