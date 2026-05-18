import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { demoCompany } from "@/lib/demoData";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const AuditSchema = z.object({
  entityType: z.string().min(1),
  action: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ entries: [], source: "local_demo_data" });
  }
  const supabase = createSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ entries: [], source: "local_demo_data" });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.floor(limitParam), 1), 50) : 20;
  const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id;

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,entity_type,entity_id,action,actor,message,metadata,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ entries: [], source: "supabase", message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    source: "supabase",
    entries: (data ?? []).map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      actor: row.actor,
      message: row.message,
      metadata: row.metadata,
      createdAt: row.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ message: "Supabase is not configured. Audit log was not saved." }, { status: 503 });
  }

  const body = await request.json();
  const parsed = AuditSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase client is unavailable. Audit log was not saved." }, { status: 503 });
  }

  const { error } = await supabase.from("audit_logs").insert({
    company_id: process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? demoCompany.id,
    entity_type: parsed.data.entityType,
    action: parsed.data.action,
    actor: "Sara Demo User",
    message: `${parsed.data.action} recorded from intake review.`,
    metadata: parsed.data.metadata ?? {},
  });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ message: "Audit log saved." });
}
