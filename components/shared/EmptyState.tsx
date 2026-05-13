export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface rounded-lg p-8 text-center">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
