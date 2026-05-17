"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, RotateCcw, Save, X } from "lucide-react";
import { PremiumRulesTable } from "@/components/rules/PremiumRulesTable";
import { Toast } from "@/components/shared/Toast";
import { formatCurrency } from "@/lib/format";
import type { NexusRule } from "@/types";

export type RuleDraft = {
  thresholdAmount: number;
  saasTaxable: boolean;
  hardwareTaxable: boolean;
  servicesTaxable: boolean;
  notes: string;
  sourceUrl: string;
};

function toDraft(rule: NexusRule): RuleDraft {
  return {
    thresholdAmount: rule.thresholdAmount,
    saasTaxable: rule.saasTaxable,
    hardwareTaxable: rule.hardwareTaxable,
    servicesTaxable: rule.servicesTaxable,
    notes: rule.notes ?? "",
    sourceUrl: rule.sourceUrl ?? "",
  };
}

function draftEqualsRule(rule: NexusRule, draft: RuleDraft) {
  return (
    rule.thresholdAmount === draft.thresholdAmount &&
    rule.saasTaxable === draft.saasTaxable &&
    rule.hardwareTaxable === draft.hardwareTaxable &&
    rule.servicesTaxable === draft.servicesTaxable &&
    (rule.notes ?? "") === draft.notes &&
    (rule.sourceUrl ?? "") === draft.sourceUrl
  );
}

export function RulesWorkbench({ rules }: { rules: NexusRule[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, RuleDraft>>({});
  const [savingState, setSavingState] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const dirtyStateCodes = useMemo(
    () =>
      Object.entries(drafts)
        .filter(([code, draft]) => {
          const rule = rules.find((item) => item.stateCode === code);
          return rule ? !draftEqualsRule(rule, draft) : false;
        })
        .map(([code]) => code),
    [drafts, rules]
  );

  function startEdit(rule: NexusRule) {
    setDrafts((prev) => ({ ...prev, [rule.stateCode]: toDraft(rule) }));
  }

  function cancelEdit(stateCode: string) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[stateCode];
      return next;
    });
  }

  function updateDraft(stateCode: string, patch: Partial<RuleDraft>) {
    setDrafts((prev) => {
      const current = prev[stateCode];
      if (!current) return prev;
      return { ...prev, [stateCode]: { ...current, ...patch } };
    });
  }

  async function saveOne(stateCode: string) {
    const draft = drafts[stateCode];
    const rule = rules.find((item) => item.stateCode === stateCode);
    if (!draft || !rule) return false;
    setSavingState(stateCode);
    try {
      const response = await fetch(`/api/rules/${stateCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thresholdAmount: draft.thresholdAmount,
          saasTaxable: draft.saasTaxable,
          hardwareTaxable: draft.hardwareTaxable,
          servicesTaxable: draft.servicesTaxable,
          notes: draft.notes || null,
          sourceUrl: draft.sourceUrl || "",
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setToastMessage(result.message ?? `Rule for ${stateCode} could not be saved.`);
        return false;
      }
      setToastMessage(`Rule for ${stateCode} saved.`);
      cancelEdit(stateCode);
      router.refresh();
      return true;
    } catch {
      setToastMessage("Rule could not be saved. Check the local server and Supabase connection.");
      return false;
    } finally {
      setSavingState(null);
    }
  }

  async function saveAll() {
    if (!dirtyStateCodes.length) {
      setToastMessage("No rule changes to save.");
      return;
    }
    setBulkSaving(true);
    let ok = 0;
    for (const code of dirtyStateCodes) {
      const succeeded = await saveOne(code);
      if (succeeded) ok += 1;
    }
    setBulkSaving(false);
    setToastMessage(`${ok} of ${dirtyStateCodes.length} rule${dirtyStateCodes.length === 1 ? "" : "s"} saved.`);
  }

  function discardAll() {
    if (!dirtyStateCodes.length) {
      setToastMessage("No pending changes to discard.");
      return;
    }
    setDrafts({});
    setToastMessage("Pending rule changes discarded.");
  }

  return (
    <>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="text-sm text-slate-600">
          {dirtyStateCodes.length === 0 ? (
            "No pending changes."
          ) : (
            <span className="font-semibold text-orange-700">
              {dirtyStateCodes.length} pending change{dirtyStateCodes.length === 1 ? "" : "s"}: {dirtyStateCodes.join(", ")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={discardAll}
            disabled={bulkSaving || !dirtyStateCodes.length}
            className="secondary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            Discard Changes
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen((open) => !open)}
            disabled={!dirtyStateCodes.length}
            className="secondary-button px-3 py-2 text-sm text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Eye className="h-4 w-4" />
            Preview Impact
          </button>
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={bulkSaving || !dirtyStateCodes.length}
            className="primary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {previewOpen && dirtyStateCodes.length ? (
        <div className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-950">Pending change preview</h3>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              aria-label="Close preview"
              className="text-slate-500 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Changes have not been saved yet. Click Save Changes to write them to Supabase. Configured threshold edits will be reflected in the next exposure refresh on Dashboard, States, and Exports.
          </p>
          <table className="mt-4 w-full divide-y divide-indigo-100 text-sm">
            <thead className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">State</th>
                <th className="py-2">Threshold</th>
                <th className="py-2">SaaS</th>
                <th className="py-2">Hardware</th>
                <th className="py-2">Services</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100/60">
              {dirtyStateCodes.map((code) => {
                const rule = rules.find((item) => item.stateCode === code);
                const draft = drafts[code];
                if (!rule || !draft) return null;
                return (
                  <tr key={code}>
                    <td className="py-2 font-bold text-slate-900">{code}</td>
                    <td className="py-2 text-slate-700">
                      {formatCurrency(rule.thresholdAmount)} <span className="mx-1 text-slate-400">→</span>
                      <span className="font-bold text-indigo-700">{formatCurrency(draft.thresholdAmount)}</span>
                    </td>
                    <td className="py-2 text-slate-700">
                      {rule.saasTaxable ? "Taxable" : "Excluded"} <span className="mx-1 text-slate-400">→</span>
                      <span className="font-bold text-indigo-700">{draft.saasTaxable ? "Taxable" : "Excluded"}</span>
                    </td>
                    <td className="py-2 text-slate-700">
                      {rule.hardwareTaxable ? "Taxable" : "Excluded"} <span className="mx-1 text-slate-400">→</span>
                      <span className="font-bold text-indigo-700">{draft.hardwareTaxable ? "Taxable" : "Excluded"}</span>
                    </td>
                    <td className="py-2 text-slate-700">
                      {rule.servicesTaxable ? "Taxable" : "Excluded"} <span className="mx-1 text-slate-400">→</span>
                      <span className="font-bold text-indigo-700">{draft.servicesTaxable ? "Taxable" : "Excluded"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <PremiumRulesTable
        rules={rules}
        drafts={drafts}
        savingState={savingState}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onUpdateDraft={updateDraft}
        onSaveDraft={(code) => void saveOne(code)}
      />
    </>
  );
}
