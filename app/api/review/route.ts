import { NextResponse } from "next/server";
import { getNexusWatchData } from "@/lib/supabaseData";

export async function GET() {
  const { invoices, source } = await getNexusWatchData();
  return NextResponse.json({
    invoices: invoices.filter((invoice) => invoice.reviewStatus === "needs_review"),
    source,
  });
}
