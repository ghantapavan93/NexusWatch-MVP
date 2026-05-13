import { NextResponse } from "next/server";
import { buildStateSummaries } from "@/lib/nexus";
import { getNexusWatchData } from "@/lib/supabaseData";

export async function GET() {
  const { invoices, rules, source } = await getNexusWatchData();
  return NextResponse.json({ states: buildStateSummaries(rules, invoices), source });
}
