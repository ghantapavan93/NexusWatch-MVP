import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAppSettings, updateAppSettings } from "@/lib/appSettings";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  watchBandPercent: z.coerce.number().min(0).max(100).optional(),
  warningBandPercent: z.coerce.number().min(0).max(100).optional(),
  largeInvoiceThreshold: z.coerce.number().min(0).optional(),
  requireShipToForThreshold: z.boolean().optional(),
  allowNegativeInvoices: z.boolean().optional(),
  allowZeroInvoices: z.boolean().optional(),
  measurementPeriod: z.enum(["calendar_year", "fiscal_year"]).optional(),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12).optional(),
  reviewedExportRequiresShipTo: z.boolean().optional(),
  reviewedExportRequiresCategory: z.boolean().optional(),
});

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.watchBandPercent != null && parsed.data.warningBandPercent != null) {
    if (parsed.data.watchBandPercent >= parsed.data.warningBandPercent) {
      return NextResponse.json(
        { message: "Watch band must be less than warning band." },
        { status: 400 }
      );
    }
  }

  const result = await updateAppSettings(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({
    mode: "supabase_write",
    message: result.message,
    settings: result.settings,
  });
}
