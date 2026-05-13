import { Bell, Database, Search } from "lucide-react";
import { demoCompany } from "@/lib/demoData";
import { getSupabaseStatus } from "@/lib/supabase";

export function TopBar() {
  const supabaseStatus = getSupabaseStatus();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-5 lg:px-8">
        <div className="hidden min-w-0 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 sm:flex lg:w-96">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Search invoices, customers, or states</span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset md:inline-flex ${
              supabaseStatus.enabled
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-slate-100 text-slate-600 ring-slate-200"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            {supabaseStatus.enabled ? "Supabase connected" : "Local demo data"}
          </span>
          <button className="rounded-md border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900" type="button">
            <Bell className="h-4 w-4" />
          </button>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900">{demoCompany.name}</div>
            <div className="text-xs text-slate-500">Calendar year demo period</div>
          </div>
        </div>
      </div>
    </header>
  );
}
