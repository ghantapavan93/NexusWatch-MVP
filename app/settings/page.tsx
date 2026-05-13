import { PageHeader } from "@/components/layout/PageHeader";
import { CALCULATION_RULES } from "@/lib/constants";
import { getSupabaseStatus } from "@/lib/supabase";

export default function SettingsPage() {
  const supabase = getSupabaseStatus();

  return (
    <>
      <PageHeader title="Settings" description="MVP product rules, measurement period, and integration posture for the local demo." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-950">Measurement Period</h2>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Calendar year: January 1 to December 31
          </div>
        </section>
        <section className="surface rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-950">Data Mode</h2>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {supabase.mode}: {supabase.message}
          </div>
        </section>
        <section className="surface rounded-lg p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-950">Locked Product Rules</h2>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            {Object.entries(CALCULATION_RULES).map(([key, value]) => (
              <div key={key} className="flex justify-between rounded-md border border-slate-100 px-3 py-2">
                <dt className="text-slate-500">{key}</dt>
                <dd className="font-medium text-slate-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
