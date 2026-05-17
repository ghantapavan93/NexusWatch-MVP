"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Edit3, Loader2, Save, Search, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { NexusRule } from "@/types";
import type { RuleDraft } from "./RulesWorkbench";

type Props = {
  rules: NexusRule[];
  drafts?: Record<string, RuleDraft>;
  savingState?: string | null;
  onStartEdit?: (rule: NexusRule) => void;
  onCancelEdit?: (stateCode: string) => void;
  onUpdateDraft?: (stateCode: string, patch: Partial<RuleDraft>) => void;
  onSaveDraft?: (stateCode: string) => void;
};

export function PremiumRulesTable({
  rules,
  drafts = {},
  savingState = null,
  onStartEdit,
  onCancelEdit,
  onUpdateDraft,
  onSaveDraft,
}: Props) {
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

        <div className="grid gap-2 pb-3 md:grid-cols-[260px_150px]">
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
        {activeTab === "state" ? (
          <table id={undefined} className="min-w-[1080px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">State</th>
                <th className="px-5 py-4">Threshold</th>
                <th className="px-5 py-4">SaaS Treatment</th>
                <th className="px-5 py-4">Hardware Treatment</th>
                <th className="px-5 py-4">Professional Services Treatment</th>
                <th className="px-5 py-4">Review Notes</th>
                <th className="px-5 py-4">Last Reviewed</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRules.map((rule, index) => {
                const draft = drafts[rule.stateCode];
                const isEditing = Boolean(draft);
                const isSaving = savingState === rule.stateCode;

                if (isEditing && draft && onUpdateDraft && onCancelEdit && onSaveDraft) {
                  return (
                    <tr key={rule.id} id={rule.stateCode.toLowerCase()} className="bg-indigo-50/40 align-top">
                      <td className="px-5 py-5">
                        <div className="font-black text-slate-950">{rule.stateName}</div>
                        <RiskPill label={getRuleRisk(rule)} index={index} />
                        <div className="mt-2 text-xs text-slate-500">Editing</div>
                      </td>
                      <td className="px-5 py-5">
                        <label className="block text-xs font-semibold uppercase text-slate-500">Threshold ($)</label>
                        <input
                          type="number"
                          min={0}
                          value={Number.isFinite(draft.thresholdAmount) ? draft.thresholdAmount : 0}
                          onChange={(event) =>
                            onUpdateDraft(rule.stateCode, { thresholdAmount: Number(event.target.value) || 0 })
                          }
                          className="mt-1 h-9 w-32 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                        />
                      </td>
                      <td className="px-5 py-5">
                        <TaxabilitySelect
                          value={draft.saasTaxable}
                          onChange={(value) => onUpdateDraft(rule.stateCode, { saasTaxable: value })}
                        />
                      </td>
                      <td className="px-5 py-5">
                        <TaxabilitySelect
                          value={draft.hardwareTaxable}
                          onChange={(value) => onUpdateDraft(rule.stateCode, { hardwareTaxable: value })}
                        />
                      </td>
                      <td className="px-5 py-5">
                        <TaxabilitySelect
                          value={draft.servicesTaxable}
                          onChange={(value) => onUpdateDraft(rule.stateCode, { servicesTaxable: value })}
                        />
                      </td>
                      <td className="max-w-[260px] px-5 py-5">
                        <textarea
                          value={draft.notes}
                          onChange={(event) => onUpdateDraft(rule.stateCode, { notes: event.target.value })}
                          rows={3}
                          className="min-h-[64px] w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                          placeholder="Review notes for accounting context"
                        />
                        <input
                          value={draft.sourceUrl}
                          onChange={(event) => onUpdateDraft(rule.stateCode, { sourceUrl: event.target.value })}
                          className="mt-2 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                          placeholder="Source URL (optional)"
                        />
                      </td>
                      <td className="px-5 py-5">
                        <div className="font-semibold text-slate-800">{formatDate(rule.lastReviewed)}</div>
                        <div className="mt-1 text-xs text-slate-500">Will update on save</div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex flex-col items-stretch gap-2">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => onSaveDraft(rule.stateCode)}
                            className="primary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelEdit(rule.stateCode)}
                            className="secondary-button px-3 py-2 text-sm"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={rule.id} id={rule.stateCode.toLowerCase()} className="transition hover:bg-indigo-50/25">
                    <td className="px-5 py-5 align-top">
                      <div className="font-black text-slate-950">{rule.stateName}</div>
                      <div className="mt-2">
                        <RiskPill label={getRuleRisk(rule)} index={index} />
                      </div>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="font-black text-slate-950">{formatCurrency(rule.thresholdAmount)}</div>
                      <div className="mt-1 text-xs text-slate-500">Configured nexus threshold</div>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <Treatment taxable={rule.saasTaxable} />
                    </td>
                    <td className="px-5 py-5 align-top">
                      <Treatment taxable={rule.hardwareTaxable} />
                    </td>
                    <td className="px-5 py-5 align-top">
                      <Treatment taxable={rule.servicesTaxable} />
                    </td>
                    <td className="max-w-[260px] px-5 py-5 align-top text-sm leading-6 text-slate-600">
                      {rule.notes ?? "Review assumptions before approval."}
                      {rule.sourceUrl ? (
                        <div className="mt-1 text-xs">
                          <a
                            href={rule.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-blue-700 hover:text-blue-900"
                          >
                            Source reference &rarr;
                          </a>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="font-semibold text-slate-800">{formatDate(rule.lastReviewed)}</div>
                      <div className="mt-1 text-xs text-slate-500">by Sara Demo User</div>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onStartEdit?.(rule)}
                          disabled={!onStartEdit}
                          className="secondary-button px-3 py-2 text-sm text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit Rule
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <CategoryLogicView rules={filteredRules} />
        )}
      </div>

      {filteredRules.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-slate-500">No rules match the current filters.</div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <span>
          Showing {filteredRules.length} of {rules.length} state{rules.length === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-slate-500">
          Rule edits write to Supabase and refresh Dashboard, States, and Exports.
        </span>
      </div>
    </section>
  );
}

function CategoryLogicView({ rules }: { rules: NexusRule[] }) {
  return (
    <table className="min-w-[800px] divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-5 py-4">State</th>
          <th className="px-5 py-4">SaaS</th>
          <th className="px-5 py-4">Hardware</th>
          <th className="px-5 py-4">Services</th>
          <th className="px-5 py-4">Configured Threshold</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rules.map((rule) => (
          <tr key={`category-${rule.id}`}>
            <td className="px-5 py-4 font-black text-slate-950">{rule.stateName} ({rule.stateCode})</td>
            <td className="px-5 py-4">{rule.saasTaxable ? "Taxable" : "Excluded"}</td>
            <td className="px-5 py-4">{rule.hardwareTaxable ? "Taxable" : "Excluded"}</td>
            <td className="px-5 py-4">{rule.servicesTaxable ? "Taxable" : "Excluded"}</td>
            <td className="px-5 py-4 font-semibold text-slate-800">{formatCurrency(rule.thresholdAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Treatment({ taxable }: { taxable: boolean }) {
  if (taxable) {
    return (
      <div>
        <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Taxable
        </span>
        <div className="mt-1 text-xs text-slate-500">Counted toward threshold</div>
      </div>
    );
  }
  return (
    <div>
      <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Excluded
      </span>
      <div className="mt-1 text-xs text-slate-500">Not counted toward threshold</div>
    </div>
  );
}

function TaxabilitySelect({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <select
      value={value ? "taxable" : "excluded"}
      onChange={(event) => onChange(event.target.value === "taxable")}
      className="h-9 w-36 rounded-lg border border-slate-200 bg-white px-2 text-sm"
    >
      <option value="taxable">Taxable</option>
      <option value="excluded">Excluded</option>
    </select>
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
