import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateSupabaseNexusRule } from "@/lib/supabaseWrites";

const UpdateRuleSchema = z.object({
  thresholdAmount: z.coerce.number().min(0).optional(),
  saasTaxable: z.boolean().optional(),
  hardwareTaxable: z.boolean().optional(),
  servicesTaxable: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
  sourceUrl: z.string().url().nullable().or(z.literal("")).optional(),
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const stateCode = state.toUpperCase();
  if (!/^[A-Z]{2}$/.test(stateCode)) {
    return NextResponse.json({ message: "Invalid state code." }, { status: 400 });
  }

  const parsed = UpdateRuleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const result = await updateSupabaseNexusRule({
    stateCode,
    thresholdAmount: parsed.data.thresholdAmount,
    saasTaxable: parsed.data.saasTaxable,
    hardwareTaxable: parsed.data.hardwareTaxable,
    servicesTaxable: parsed.data.servicesTaxable,
    notes: parsed.data.notes ?? undefined,
    sourceUrl: parsed.data.sourceUrl === "" ? null : parsed.data.sourceUrl ?? undefined,
    lastReviewed: parsed.data.lastReviewed,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({
    mode: "supabase_write",
    message: result.message,
    rule: result.rule,
  });
}
