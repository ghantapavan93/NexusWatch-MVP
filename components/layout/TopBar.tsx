import { demoCompany } from "@/lib/demoData";
import { getSupabaseStatus } from "@/lib/supabase";
import { TopBarSearch } from "./TopBarSearch";
import { TopBarNotifications } from "./TopBarNotifications";

export function TopBar() {
  const supabaseStatus = getSupabaseStatus();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/82 backdrop-blur-xl">
      <div className="flex h-[4.5rem] items-center justify-between gap-4 px-5 py-3 lg:px-8">
        <TopBarSearch />
        <div className="ml-auto flex items-center gap-3">
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className={`hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-inset transition hover:opacity-80 md:inline-flex ${
              supabaseStatus.enabled
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-slate-100 text-slate-600 ring-slate-200"
            }`}
            title="Open health check"
          >
            <span className={`h-2 w-2 rounded-full ${supabaseStatus.enabled ? "bg-emerald-500" : "bg-slate-400"}`} />
            {supabaseStatus.enabled ? "Supabase connected" : "Local demo data"}
          </a>
          <TopBarNotifications />
          <div className="hidden h-9 w-px bg-slate-200 md:block" />
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-slate-900">{demoCompany.name}</div>
            <div className="text-xs text-slate-500">Calendar year demo period</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white shadow-lg shadow-blue-700/20">
            XO
          </div>
        </div>
      </div>
    </header>
  );
}
