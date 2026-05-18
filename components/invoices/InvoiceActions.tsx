"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Send } from "lucide-react";
import { Toast } from "@/components/shared/Toast";

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  shipToState,
}: {
  invoiceId: string;
  invoiceNumber: string;
  shipToState?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("Status and export actions save to Supabase.");
  const [toastMessage, setToastMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function updateStatus(status: "reviewed" | "open", reviewStatus: "approved" | "accounting_review") {
    setIsSaving(true);
    setMessage("Saving status...");

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewStatus,
          auditSource: "invoice_detail",
          auditAction: reviewStatus === "accounting_review" ? "sent_to_accounting_review" : "status_updated",
        }),
      });
      const result = (await response.json()) as { message?: string };
      setMessage(result.message ?? (response.ok ? "Status saved to Supabase." : "Status could not be saved."));
      if (response.ok) {
        setToastMessage(
          reviewStatus === "approved"
            ? "Invoice approved for reviewed export."
            : "Invoice moved to accounting review."
        );
        router.refresh();
      }
    } catch {
      setMessage("Status could not be saved. Check the local server and Supabase connection.");
    } finally {
      setIsSaving(false);
    }
  }

  async function exportInvoice() {
    setIsSaving(true);
    setMessage("Recording single-invoice export...");

    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: "single_invoice",
          invoiceNumber,
          stateCode: shipToState || undefined,
        }),
      });
      const result = (await response.json()) as { message?: string; exportHistorySaved?: boolean; fileName?: string };
      setMessage(
        result.exportHistorySaved
          ? `Single-invoice export saved to Supabase (${result.fileName ?? "CSV"}).`
          : result.message ?? "Export generated, but history was not saved."
      );
      if (result.exportHistorySaved) setToastMessage("Single-invoice export saved to history.");
    } catch {
      setMessage("Export history could not be saved. Check the local server and Supabase connection.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      <section className="premium-card p-5">
        <h2 className="text-sm font-semibold text-slate-950">Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            className="secondary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isSaving}
            onClick={() => updateStatus("reviewed", "approved")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Reviewed
          </button>
          <button
            className="primary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isSaving}
            onClick={() => updateStatus("open", "accounting_review")}
          >
            <Send className="h-4 w-4" />
            Send to Accounting Review
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void exportInvoice()}
            className="primary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export Invoice
          </button>
        </div>
        <div className="mt-3">
          <Link href={`/exports?invoice=${encodeURIComponent(invoiceNumber)}`} className="text-xs font-semibold text-blue-700 hover:text-blue-900">
            Open in Exports for CSV download &rarr;
          </Link>
        </div>
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">{message}</p>
      </section>
    </>
  );
}

