import { NextRequest, NextResponse } from "next/server";
import { getNexusWatchData } from "@/lib/supabaseData";
import { NexusRuleSchema } from "@/lib/validators";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const stateCode = state.toUpperCase();
  const { rules } = await getNexusWatchData();
  const rule = rules.find((item) => item.stateCode === stateCode);
  if (!rule) return NextResponse.json({ message: "Rule not found" }, { status: 404 });

  const parsed = NexusRuleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json({
    mode: "supabase_read_ready",
    message: "Rule update shape validated. Database writes are deferred until the next Supabase write phase.",
    rule: { ...rule, ...parsed.data },
  });
}
