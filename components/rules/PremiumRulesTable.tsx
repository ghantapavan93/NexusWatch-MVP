"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Edit3, Filter, MoreVertical, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { NexusRule } from "@/types";

export function PremiumRulesTable({ rules }: { rules: NexusRule[] }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("all");
  const [activeTab, setActiveTab] = useState<"state" | "category">("state");

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rules.filter((rule) => {
      const matchesSearch =
        !query ||
        rule.stateName.toLowerCase().includes(query) ||
        rule.stateCode.toLowerCase().includes(query) ||
        rule.notes?.toLowerCase().includes(query);
      const matchesView =
        view === "all" ||
        (view === "high" && getRuleRisk(rule) === "High Risk") ||
        (view === "review" && (!rule.saasTaxable || !rule.servicesTaxable));
      return matchesSearch && matchesView;
    });
  }, [rules, search, view]);

  return (
    <section className="premium-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 pt-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("state")}
            className={`border-b-2 px-1 pb-3 text-sm font-black ${
              activeTab === "state" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600"
            }`}
          >
            State Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("category")}
            className={`border-b-2 px-1 pb-3 text-sm font-black ${
              activeTab === "category" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600"
            }`}
          >
            Category Logic
          </button>
        </div>

        <div className="grid gap-2 pb-3 md:grid-cols-[260px_100px_150px]">
          <label className="relative">
            <span className="sr-only">Search states or rules</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none ring-indigo-100 placeholder:text-slate-400 focus:ring-4"
              placeholder="Search states or rules..."
            />
          </label>
          <button className="secondary-button h-10 justify-center px-3 text-sm" type="button">
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <label className="relative">
            <span className="sr-only">View</span>
            <select
              value={view}
              onChange={(event) => setView(event.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-medium outline-none ring-indigo-100 focus:ring-4"
            >
              <option value="all">View: All States</option>
              <option value="high">High Risk</option>
              <option value="review">Needs Review</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1080px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">State</th>
              <th className="px-5 py-4">Threshold</th>
              <th className="px-5 py-4">SaaS Treatment</th>
              <th className="px-5 py-4">Hardware Treatment</th>
              <th className="px-5 py-4">Professional Services Treatment</th>
              <th className="px-5 py-4">Review Notes</th>
              <th className="px-5 py-4">Last Updated</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRules.map((rule, index) => (
              <tr key={rule.id} className="transition hover:bg-indigo-50/25">
                <td className="px-5 py-5 align-top">
                  <div className="font-black text-slate-950">{rule.stateName}</div>
                  <div className="mt-2">
                    <RiskPill label={getRuleRisk(rule)} index={index} />
                  </div>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="font-black text-slate-950">&gt; {getThresholdBand(rule)}</div>
                  <div className="mt-1 text-xs text-slate-500">of state spend</div>
                  <div className="mt-2 text-xs font-semibold text-slate-600">{formatCurrency(rule.thresholdAmount)}</div>
                </td>
                <td className="px-5 py-5 align-top">
                  <Treatment taxable={rule.saasTaxable} conservative={!rule.saasTaxable && rule.stateCode !== "WA"} />
                </td>
                <td className="px-5 py-5 align-top">
                  <Treatment taxable={rule.hardwareTaxable} conservative />
                </td>
                <td className="px-5 py-5 align-top">
                  <Treatment taxable={rule.servicesTaxable} conservative={!rule.servicesTaxable} />
                </td>
                <td className="max-w-[260px] px-5 py-5 align-top text-sm leading-6 text-slate-600">
                  {rule.notes ?? "Review assumptions before approval."}
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="font-semibold text-slate-800">{formatDate(rule.lastReviewed)}</div>
                  <div className="mt-1 text-xs text-slate-500">by System</div>
                </td>
                <td className="px-5 py-5 align-top">
                  <div className="flex items-center gap-2">
                    <button className="secondary-button px-3 py-2 text-sm text-indigo-700" type="button">
                      <Edit3 className="h-4 w-4" />
                      Edit Rule
                    </button>
                    <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" type="button">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRules.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-slate-500">No rules match the current filters.</div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <span>Showing 1-{filteredRules.length} of {rules.length} states</span>
        <div className="flex items-center gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-400" type="button">‹</button>
          <button className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 font-bold text-indigo-700 ring-1 ring-indigo-200" type="button">1</button>
          <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500" type="button">›</button>
          <button className="secondary-button px-3 py-2 text-sm" type="button">
            25 / page
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Treatment({ taxable, conservative }: { taxable: boolean; conservative?: boolean }) {
  if (taxable) {
    return (
      <div>
        <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
          <span className="h-5 w-9 rounded-full bg-emerald-500 p-0.5">
            <span className="block h-4 w-4 translate-x-4 rounded-full bg-white shadow-sm" />
          </span>
          Auto-approve
        </span>
        <div className="mt-1 text-xs text-slate-500">No review required</div>
      </div>
    );
  }

  return (
    <div>
      <span className={`inline-flex items-center gap-2 text-sm font-bold ${conservative ? "text-orange-700" : "text-slate-700"}`}>
        <span className={`h-5 w-9 rounded-full p-0.5 ${conservative ? "bg-orange-500" : "bg-slate-300"}`}>
          <span className="block h-4 w-4 rounded-full bg-white shadow-sm" />
        </span>
        {conservative ? "Manager review" : "Review required"}
      </span>
      <div className="mt-1 text-xs text-slate-500">{conservative ? "Allow with review" : "Block until review"}</div>
    </div>
  );
}

function RiskPill({ label, index }: { label: string; index: number }) {
  const styles =
    label === "High Risk"
      ? "bg-red-50 text-red-700 ring-red-200"
      : label === "Elevated"
        ? "bg-orange-50 text-orange-700 ring-orange-200"
        : index % 3 === 0
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${styles}`}>{label}</span>;
}

function getRuleRisk(rule: NexusRule) {
  if (rule.stateCode === "TX") return "High Risk";
  if (rule.stateCode === "CA") return "Elevated";
  if (rule.stateCode === "WA") return "Low Risk";
  return "Moderate";
}

function getThresholdBand(rule: NexusRule) {
  if (rule.stateCode === "CA" || rule.stateCode === "NY") return "75%";
  if (rule.stateCode === "IL") return "80%";
  return "90%";
}
