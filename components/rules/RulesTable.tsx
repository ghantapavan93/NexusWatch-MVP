"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { NexusRule } from "@/types";

export function RulesTable({ rules }: { rules: NexusRule[] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rules.filter((rule) => {
      const matchesSearch =
        !query ||
        rule.stateName.toLowerCase().includes(query) ||
        rule.stateCode.toLowerCase().includes(query) ||
        rule.notes?.toLowerCase().includes(query);
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "saas" && rule.saasTaxable) ||
        (categoryFilter === "hardware" && rule.hardwareTaxable) ||
        (categoryFilter === "services" && rule.servicesTaxable) ||
        (categoryFilter === "excluded_saas" && !rule.saasTaxable);

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, rules, search]);

  return (
    <div className="data-grid">
      <div className="border-b border-slate-200 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <label className="text-xs font-medium uppercase text-slate-500">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-900 outline-none ring-blue-100 placeholder:text-slate-400 focus:ring-4"
              placeholder="State, code, or notes"
            />
          </label>
          <label className="text-xs font-medium uppercase text-slate-500">
            Filter
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-900 outline-none ring-blue-100 focus:ring-4"
            >
              <option value="all">All rules</option>
              <option value="saas">SaaS taxable</option>
              <option value="excluded_saas">SaaS excluded</option>
              <option value="hardware">Hardware taxable</option>
              <option value="services">Services taxable</option>
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">State</th>
              <th className="px-5 py-3">Threshold</th>
              <th className="px-5 py-3">SaaS</th>
              <th className="px-5 py-3">Hardware</th>
              <th className="px-5 py-3">Services</th>
              <th className="px-5 py-3">Source URL</th>
              <th className="px-5 py-3">Last Reviewed</th>
              <th className="px-5 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRules.map((rule) => (
              <tr key={rule.id} className="transition hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-950">{rule.stateName}</div>
                  <div className="mt-1 text-xs text-slate-500">{rule.stateCode}</div>
                </td>
                <td className="px-5 py-4">
                  <input
                    className="w-32 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm font-medium text-slate-900"
                    value={formatCurrency(rule.thresholdAmount)}
                    readOnly
                  />
                </td>
                <td className="px-5 py-4"><TaxabilityToggle checked={rule.saasTaxable} /></td>
                <td className="px-5 py-4"><TaxabilityToggle checked={rule.hardwareTaxable} /></td>
                <td className="px-5 py-4"><TaxabilityToggle checked={rule.servicesTaxable} /></td>
                <td className="px-5 py-4">
                  <input
                    className="w-44 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    value={rule.sourceUrl ?? ""}
                    readOnly
                  />
                </td>
                <td className="px-5 py-4">
                  <input
                    className="w-32 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    value={formatDate(rule.lastReviewed)}
                    readOnly
                  />
                </td>
                <td className="min-w-80 px-5 py-4">
                  <textarea
                    className="min-h-16 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-600"
                    value={rule.notes ?? ""}
                    readOnly
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredRules.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">No rules match the current search and filter.</div>
      ) : null}
    </div>
  );
}

function TaxabilityToggle({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex min-w-24 justify-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        checked ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {checked ? "Taxable" : "Excluded"}
    </span>
  );
}
