import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseInvoice } from "@/lib/supabaseWrites";
import { getNexusWatchData } from "@/lib/supabaseData";
import { CreateInvoiceSchema } from "@/lib/validators";

const CreateInvoiceRequestSchema = CreateInvoiceSchema.extend({
  status: z.enum(["draft", "open", "reviewed", "exported"]).optional(),
  reviewStatus: z.enum(["draft", "needs_review", "accounting_review", "approved", "exported"]).optional(),
  requestedStatus: z.enum(["draft", "needs_review", "accounting_review", "approved", "exported"]).optional(),
});

export async function GET() {
  const { invoices, source } = await getNexusWatchData();
  return NextResponse.json({ invoices, source });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateInvoiceRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createSupabaseInvoice(parsed.data);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json(
    {
      mode: "supabase_write",
      message: result.message,
      invoice: result.invoice,
    },
    { status: result.status }
  );
}
