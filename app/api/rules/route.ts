import { NextResponse } from "next/server";
import { getNexusWatchData } from "@/lib/supabaseData";

export async function GET() {
  const { rules, source } = await getNexusWatchData();
  return NextResponse.json({ rules, source });
}
