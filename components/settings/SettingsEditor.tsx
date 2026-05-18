"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { Toast } from "@/components/shared/Toast";
import type { AppSettings } from "@/lib/appSettings";

type Props = {
  initialSettings: AppSettings;
};

type Field = keyof AppSettings;

export function SettingsEditor({ initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<AppSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const dirty = (Object.keys(initialSettings) as Field[]).filter((key) => settings[key] !== savedSettings[key] && key !== "updatedAt");

  function update<K extends Field>(field: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function discard() {
    setSettings(savedSettings);
    setToastMessage("Pending settings reverted.");
  }

  async function save() {
    if (!dirty.length) {
      setToastMessage("No settings changes to save.");
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of dirty) payload[field] = settings[field];
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string; settings?: AppSettings };
      if (!response.ok) {
        setToastMessage(result.message ?? "Settings could not be saved.");
        return;
      }
      setToastMessage(result.message ?? "Settings saved to Supabase.");
      if (result.settings) {
        setSavedSettings(result.settings);
        setSettings(result.settings);
      }
      router.refresh();
    } catch {
      setToastMessage("Settings could not be saved. Check the local server and Supabase connection.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {dirty.length === 0 ? (
              <span>No pending settings changes.</span>
            ) : (
              <span className="font-bold text-orange-700">
                {dirty.length} pending change{dirty.length === 1 ? "" : "s"}: {dirty.join(", ")}
              </span>
            )}
            {savedSettings.updatedAt ? (
              <span className="ml-3 text-xs text-slate-400">Last saved {new Date(savedSettings.updatedAt).toLocaleString()}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={discard}
              disabled={isSaving || dirty.length === 0}
              className="secondary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              Discard
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={isSaving || dirty.length === 0}
              className="primary-button px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Settings
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <EditorPanel
          id="threshold-bands"
          title="Threshold Bands"
          description="When invoice activity crosses these percentages of a state's configured threshold, the dashboard surfaces a watch or warning."
        >
          <NumberField
            label="Watch band (%)"
            value={settings.watchBandPercent}
            onChange={(value) => update("watchBandPercent", value)}
            min={0}
            max={100}
            step={1}
            hint="Default 75. Must be less than the warning band."
          />
          <NumberField
            label="Warning band (%)"
            value={settings.warningBandPercent}
            onChange={(value) => update("warningBandPercent", value)}
            min={0}
            max={100}
            step={1}
            hint="Default 90. Triggers the dashboard 90% warning."
          />
          <NumberField
            label="Large invoice threshold ($)"
            value={settings.largeInvoiceThreshold}
            onChange={(value) => update("largeInvoiceThreshold", value)}
            min={0}
            step={1000}
            hint={`Invoices with total >= $${settings.largeInvoiceThreshold.toLocaleString()} get the large_invoice flag.`}
          />
        </EditorPanel>

        <EditorPanel
          id="review-workflow"
          title="Review Workflow"
          description="How invoices are flagged and gated through review."
        >
          <ToggleField
            label="Require ship-to for threshold math"
            value={settings.requireShipToForThreshold}
            onChange={(value) => update("requireShipToForThreshold", value)}
            hint="When on, invoices without ship-to are skipped from state totals and flagged."
          />
          <ToggleField
            label="Allow negative invoices (flagged for review)"
            value={settings.allowNegativeInvoices}
            onChange={(value) => update("allowNegativeInvoices", value)}
            hint="When on, negative totals are saved with a negative_amount flag."
          />
          <ToggleField
            label="Allow zero invoices (flagged for review)"
            value={settings.allowZeroInvoices}
            onChange={(value) => update("allowZeroInvoices", value)}
            hint="When on, zero totals are saved with a zero_amount flag."
          />
        </EditorPanel>

        <EditorPanel
          id="exports"
          title="Reviewed Export Gates"
          description="What an invoice needs to be eligible for the reviewed export."
        >
          <ToggleField
            label="Require ship-to state"
            value={settings.reviewedExportRequiresShipTo}
            onChange={(value) => update("reviewedExportRequiresShipTo", value)}
            hint="Blocks invoices with no ship-to from reviewed export."
          />
          <ToggleField
            label="Require resolved category"
            value={settings.reviewedExportRequiresCategory}
            onChange={(value) => update("reviewedExportRequiresCategory", value)}
            hint="Blocks invoices with 'Other / review' lines from reviewed export."
          />
        </EditorPanel>

        <EditorPanel
          id="measurement"
          title="Measurement Period"
          description="Window used to compute exposure across states."
        >
          <SelectField
            label="Measurement period"
            value={settings.measurementPeriod}
            onChange={(value) => update("measurementPeriod", value)}
            options={[
              ["calendar_year", "Calendar year (Jan-Dec)"],
              ["fiscal_year", "Fiscal year (start month below)"],
            ]}
          />
          <NumberField
            label="Fiscal year start month"
            value={settings.fiscalYearStartMonth}
            onChange={(value) => update("fiscalYearStartMonth", value)}
            min={1}
            max={12}
            step={1}
            hint="1=January, 7=July. Only applies when measurement period is fiscal year."
          />
        </EditorPanel>
      </div>
    </>
  );
}

function EditorPanel({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="premium-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-200">
          Editable
        </span>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
      />
      {hint ? <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p> : null}
    </label>
  );
}

function ToggleField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-700">{label}</div>
          {hint ? <div className="mt-1 text-xs font-medium text-slate-500">{hint}</div> : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full p-0.5 transition ${value ? "bg-emerald-500" : "bg-slate-300"}`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${value ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </label>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-blue-100 focus:ring-4"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
