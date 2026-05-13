import { NextRequest, NextResponse } from "next/server";
import { getNexusWatchData } from "@/lib/supabaseData";
import { CreateInvoiceSchema } from "@/lib/validators";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { invoices, source } = await getNexusWatchData();
  const invoice = invoices.find((item) => item.id === id || item.invoiceNumber.toLowerCase() === id.toLowerCase());
  if (!invoice) return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  return NextResponse.json({ invoice, source });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { invoices } = await getNexusWatchData();
  const invoice = invoices.find((item) => item.id === id || item.invoiceNumber.toLowerCase() === id.toLowerCase());
  if (!invoice) return NextResponse.json({ message: "Invoice not found" }, { status: 404 });

  const parsed = CreateInvoiceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json({
    mode: "supabase_read_ready",
    message: "Invoice update shape validated. Database writes are deferred until the next Supabase write phase.",
    invoice: { ...invoice, ...parsed.data },
  });
}
