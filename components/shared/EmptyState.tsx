export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="premium-card p-8 text-center">
      <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-blue-50 ring-1 ring-blue-100" />
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
