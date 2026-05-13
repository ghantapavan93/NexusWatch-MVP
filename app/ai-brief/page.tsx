import { AiBriefPanel } from "@/components/dashboard/AiBriefPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { generateAiBrief } from "@/lib/aiBrief";
import { demoInvoices, demoRules } from "@/lib/demoData";
import { buildStateSummaries } from "@/lib/nexus";

export default function AiBriefPage() {
  const summaries = buildStateSummaries(demoRules, demoInvoices);

  return (
    <>
      <PageHeader title="AI Brief" description="Cautious template summaries that explain review risk without making legal or tax determinations." />
      <div className="grid gap-5 lg:grid-cols-2">
        {summaries.map((state) => (
          <AiBriefPanel
            key={state.stateCode}
            brief={generateAiBrief({ state: state.stateName, percent: state.percentUsed, status: state.status })}
          />
        ))}
      </div>
    </>
  );
}
