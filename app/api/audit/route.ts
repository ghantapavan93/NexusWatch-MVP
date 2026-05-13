import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { demoCompany } from "@/lib/demoData";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const AuditSchema = z.object({
  entityType: z.string().min(1),
  action: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

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
