import { NextResponse } from "next/server";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  const supabase = createSupabaseClient();
  let databaseReachable = false;
  let databaseMessage = "Supabase environment variables are not configured.";

  if (supabase) {
    const { error } = await supabase.from("companies").select("id", { count: "exact", head: true });
    databaseReachable = !error;
    databaseMessage = error ? error.message : "Supabase database is reachable.";
  }

  return NextResponse.json({
    ok: supabaseConfigured && databaseReachable,
    app: "NexusWatch",
    environment: process.env.VERCEL ? "vercel" : "local",
    checks: {
      supabaseConfigured,
      databaseReachable,
      databaseMessage,
      pdfBucket: "invoice-pdfs",
      pdfUploadRuntime: "nodejs",
      manualReviewRequired: true,
    },
  });
}
