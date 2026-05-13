export function AiBriefPanel({ brief }: { brief: string }) {
  return (
    <aside className="surface rounded-lg p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-950">AI Brief</h2>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">Template MVP</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{brief}</p>
      <div className="mt-5 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">
        Factual summary only. NexusWatch supports review of configured thresholds and recommends accounting review for final determination.
      </div>
    </aside>
  );
}
