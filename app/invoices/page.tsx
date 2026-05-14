import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { PremiumInvoiceTable } from "@/components/invoices/PremiumInvoiceTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { getNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const { invoices } = await getNexusWatchData();

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Monitor invoice activity, review status, and threshold impact across all states."
        action={
          <div className="flex flex-wrap items-center gap-2">
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
      <PremiumInvoiceTable invoices={[...invoices].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))} />
    </>
  );
}
