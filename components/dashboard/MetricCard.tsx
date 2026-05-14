export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="premium-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="h-2 w-2 rounded-full bg-blue-500/70" />
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-950">{value}</div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div>
    </div>
  );
}
