import { NextResponse } from "next/server";
import { getScopedNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export async function GET() {
  const { invoices, source } = await getScopedNexusWatchData();
  return NextResponse.json({
    invoices: invoices.filter((invoice) => invoice.reviewStatus === "needs_review"),
    source,
  });
}
