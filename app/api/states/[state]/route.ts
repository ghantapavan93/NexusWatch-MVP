import { NextRequest, NextResponse } from "next/server";
import { buildStateSummaries } from "@/lib/nexus";
import { getScopedNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ state: string }> }) {
  const { state: stateParam } = await params;
  const stateCode = stateParam.toUpperCase();
  const { invoices, rules, source } = await getScopedNexusWatchData();
  const stateSummary = buildStateSummaries(rules, invoices).find((item) => item.stateCode === stateCode);
  if (!stateSummary) return NextResponse.json({ message: "State not found" }, { status: 404 });
  return NextResponse.json({
    state: stateSummary,
    invoices: invoices.filter((invoice) => invoice.shipToState === stateCode),
    source,
  });
}
