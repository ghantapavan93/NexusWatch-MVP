import { NextResponse } from "next/server";
import { buildStateSummaries } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";

export async function GET() {
  const { invoices, rules, source } = await getNexusWatchData();
  const states = buildStateSummaries(rules, invoices);
  const reviewInvoices = invoices.filter((invoice) => invoice.reviewStatus === "needs_review");

  return NextResponse.json({
    source,
    states,
    metrics: {
      statesMonitored: states.length,
      safeStates: states.filter((state) => state.status === "safe").length,
      watchStates: states.filter((state) => state.status === "watch").length,
      warningStates: states.filter((state) => state.status === "warning").length,
      crossedStates: states.filter((state) => state.status === "crossed").length,
      invoicesNeedingReview: reviewInvoices.length,
    },
  });
}
