import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { getNexusWatchData } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const { invoices } = await getNexusWatchData();

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Review imported, pasted, and manually entered invoice activity by customer, state, status, and risk."
      />
      <InvoiceTable invoices={[...invoices].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))} />
    </>
  );
}
