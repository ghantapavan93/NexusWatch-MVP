import { Bell, CheckCircle2, Database, Search } from "lucide-react";
import { demoCompany } from "@/lib/demoData";
import { getSupabaseStatus } from "@/lib/supabase";

export function TopBar() {
  const supabaseStatus = getSupabaseStatus();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/82 backdrop-blur-xl">
      <div className="flex h-[4.5rem] items-center justify-between gap-4 px-5 py-3 lg:px-8">
        <div className="hidden min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 shadow-sm sm:flex lg:w-[32rem]">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Search invoices, customers, or states</span>
          <span className="ml-auto rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">⌘ K</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span
            className={`hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-inset md:inline-flex ${
              supabaseStatus.enabled
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-slate-100 text-slate-600 ring-slate-200"
            }`}
          >
            {supabaseStatus.enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
            {supabaseStatus.enabled ? "Supabase connected" : "Local demo data"}
          </span>
          <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm hover:text-slate-900" type="button">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
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
