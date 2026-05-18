import { NextResponse } from "next/server";
import { buildStateSummaries } from "@/lib/nexus";
import { getScopedNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export async function GET() {
  const { invoices, rules, source } = await getScopedNexusWatchData();
  return NextResponse.json({ states: buildStateSummaries(rules, invoices), source });
}
