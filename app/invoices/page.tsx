import Link from "next/link";
import { cookies } from "next/headers";
import { Download, Upload } from "lucide-react";
import { DataModeToggle } from "@/components/dashboard/DataModeToggle";
import { PremiumInvoiceTable } from "@/components/invoices/PremiumInvoiceTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { getNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const cookieStore = await cookies();
  const requestedDataMode = cookieStore.get("nexuswatch_data_mode")?.value === "demo" ? "demo" : "live";
  const liveInvoiceNumbers = parseLiveInvoiceNumbers(cookieStore.get("nexuswatch_live_invoice_numbers")?.value);
  const { invoices, rules, source } = await getNexusWatchData({
    mode: requestedDataMode,
    liveInvoiceNumbers: requestedDataMode === "live" ? liveInvoiceNumbers : undefined,
  });

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Monitor invoice activity, review status, and threshold impact across all states."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DataModeToggle mode={requestedDataMode} source={source} />
            <Link className="secondary-button px-4 py-2" href="/exports">
              <Download className="h-4 w-4" />
              Export
            </Link>
            <Link className="primary-button px-4 py-2" href="/upload">
              <Upload className="h-4 w-4" />
              Upload Invoice
            </Link>
          </div>
        }
      />
      <PremiumInvoiceTable invoices={[...invoices].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))} rules={rules} />
    </>
  );
}

function parseLiveInvoiceNumbers(value?: string) {
  if (!value) return [];
  return decodeURIComponent(value)
    .split(",")
    .map((invoiceNumber) => invoiceNumber.trim())
    .filter(Boolean);
}
