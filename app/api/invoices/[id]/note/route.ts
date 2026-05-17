import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendSupabaseInvoiceReviewNote } from "@/lib/supabaseWrites";

const NoteSchema = z.object({
  note: z.string().min(1, "Review note is required").max(2000, "Review note is too long"),
  auditSource: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = NoteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const result = await appendSupabaseInvoiceReviewNote(id, parsed.data.note, {
    auditSource: parsed.data.auditSource,
  });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({
    mode: "supabase_write",
    message: result.message,
    invoice: result.invoice,
  });
}
