"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, stateLabel } from "@/lib/format";
import type { Invoice } from "@/types";

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [riskStatusFilter, setRiskStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);

  const states = useMemo(
    () =>
      Array.from(
        new Set(invoices.map((invoice) => invoice.shipToState).filter((state): state is string => Boolean(state)))
      ).sort(),
    [invoices]
  );
  const reviewStatuses = useMemo(() => Array.from(new Set(invoices.map((invoice) => invoice.reviewStatus))).sort(), [invoices]);
  const riskStatuses = useMemo(() => Array.from(new Set(invoices.map((invoice) => invoice.riskStatus))).sort(), [invoices]);
  const categories = useMemo(
    () => Array.from(new Set(invoices.flatMap((invoice) => invoice.lineItems.map((item) => item.category)))).sort(),
    [invoices]
  );

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        !query ||
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.customerName.toLowerCase().includes(query);
      const matchesState = stateFilter === "all" || invoice.shipToState === stateFilter;
      const matchesReviewStatus = reviewStatusFilter === "all" || invoice.reviewStatus === reviewStatusFilter;
      const matchesRiskStatus = riskStatusFilter === "all" || invoice.riskStatus === riskStatusFilter;
      const matchesCategory =
        categoryFilter === "all" || invoice.lineItems.some((item) => item.category === categoryFilter);
      const matchesNeedsReview = !needsReviewOnly || invoice.reviewStatus === "needs_review" || invoice.flags.length > 0;

      return matchesSearch && matchesState && matchesReviewStatus && matchesRiskStatus && matchesCategory && matchesNeedsReview;
    });
  }, [categoryFilter, invoices, needsReviewOnly, reviewStatusFilter, riskStatusFilter, search, stateFilter]);

  const summary = useMemo(
    () => ({
      totalInvoices: invoices.length,
      needsReview: invoices.filter((invoice) => invoice.reviewStatus === "needs_review").length,
      mayCrossThreshold: invoices.filter((invoice) => invoice.flags.includes("may_cross_threshold")).length,
      missingShipTo: invoices.filter((invoice) => invoice.flags.includes("missing_ship_to")).length,
      missingCategory: invoices.filter((invoice) => invoice.flags.includes("missing_category")).length,
      exportReady: invoices.filter(
        (invoice) =>
          (invoice.reviewStatus === "approved" || invoice.reviewStatus === "exported") &&
          Boolean(invoice.shipToState) &&
          !invoice.flags.includes("missing_category")
      ).length,
    }),
    [invoices]
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Total Invoices" value={summary.totalInvoices} detail="Demo invoice records" />
        <SummaryCard label="Needs Review" value={summary.needsReview} detail="Queued for accounting review" />
        <SummaryCard label="May Push Threshold" value={summary.mayCrossThreshold} detail="Potential threshold impact" />
        <SummaryCard label="Missing Ship To" value={summary.missingShipTo} detail="Skipped from threshold totals" />
        <SummaryCard label="Missing Category" value={summary.missingCategory} detail="Category review required" />
        <SummaryCard label="Export Ready" value={summary.exportReady} detail="Approved with required fields" />
      </section>

      <section className="premium-card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_repeat(4,180px)_160px]">
          <label className="text-xs font-medium uppercase text-slate-500">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-900 outline-none ring-blue-100 placeholder:text-slate-400 focus:ring-4"
              placeholder="Invoice number or customer"
            />
          </label>
          <FilterSelect label="State" value={stateFilter} onChange={setStateFilter} options={states.map((state) => ({ label: state, value: state }))} />
          <FilterSelect label="Review Status" value={reviewStatusFilter} onChange={setReviewStatusFilter} options={reviewStatuses.map((status) => ({ label: readable(status), value: status }))} />
          <FilterSelect label="Risk Status" value={riskStatusFilter} onChange={setRiskStatusFilter} options={riskStatuses.map((status) => ({ label: readable(status), value: status }))} />
          <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={categories.map((category) => ({ label: readable(category), value: category }))} />
          <label className="flex items-end gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={needsReviewOnly}
              onChange={(event) => setNeedsReviewOnly(event.target.checked)}
              className="mb-1 h-4 w-4 rounded border-slate-300"
            />
            Needs Review
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Decision support only. Final tax treatment should be reviewed with accounting.
        </p>
      </section>

      <section className="data-grid">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Invoice Activity</h2>
            <p className="mt-1 text-xs text-slate-500">{filteredInvoices.length} invoices shown from local demo data.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
            Live data
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Invoice Number</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Invoice Date</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Ship To</th>
                <th className="px-5 py-3">Bill To</th>
                <th className="px-5 py-3 text-right">Total Amount</th>
                <th className="px-5 py-3 text-right">Taxable Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Risk</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredInvoices.map((invoice) => {
                const isHero = invoice.invoiceNumber === "INV-1048";

                return (
                  <tr
                    key={invoice.id}
                    className={`transition hover:bg-slate-50 ${isHero ? "bg-orange-50/70 ring-1 ring-inset ring-orange-200" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="font-semibold text-slate-950">{invoice.invoiceNumber}</span>
                        {isHero ? (
                          <span className="w-fit rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800 ring-1 ring-inset ring-orange-200">
                            May Push Threshold
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{invoice.customerName}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(invoice.invoiceDate)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(invoice.dueDate)}</td>
                    <td className="px-5 py-4 text-slate-600">{stateLabel(invoice.shipToState)}</td>
                    <td className="px-5 py-4 text-slate-600">{stateLabel(invoice.billToState)}</td>
                    <td className="px-5 py-4 text-right font-medium text-slate-800">{formatCurrency(invoice.totalAmount)}</td>
                    <td className="px-5 py-4 text-right font-medium text-slate-800">{formatCurrency(invoice.taxableAmount)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={invoice.reviewStatus} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={invoice.riskStatus} />
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        className={`inline-flex rounded-md px-3 py-2 text-sm font-medium shadow-sm ${
                          isHero
                            ? "primary-button px-3 py-2"
                            : "secondary-button px-3 py-2"
                        }`}
                        href={`/invoices/${invoice.id}`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No invoices match the current filters.</div>
        ) : null}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="premium-card p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="text-xs font-medium uppercase text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-900 outline-none ring-blue-100 focus:ring-4"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function readable(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
