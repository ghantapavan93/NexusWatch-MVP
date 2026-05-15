"use client";

import { useRouter } from "next/navigation";
import { Database, FlaskConical } from "lucide-react";
import type { NexusWatchDataMode, NexusWatchData } from "@/lib/supabaseData";

export function DataModeToggle({
  mode,
  source,
}: {
  mode: NexusWatchDataMode;
  source: NexusWatchData["source"];
}) {
  const router = useRouter();
  const isLive = mode === "live" && source === "supabase";
  const detail = isLive
    ? "Showing Sara's uploaded invoices"
    : mode === "live"
      ? "Live requested; using safe fallback data"
      : "Showing Xemelgo sample data";

  function setMode(nextMode: NexusWatchDataMode) {
    document.cookie = `nexuswatch_data_mode=${nextMode}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMode("demo")}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-black transition ${
            mode === "demo" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          Demo Mode
        </button>
        <button
          type="button"
          onClick={() => setMode("live")}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-black transition ${
            mode === "live" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Database className="h-4 w-4" />
          Live Mode
        </button>
      </div>
      <div className="px-2 pb-1 pt-1 text-[11px] font-semibold text-slate-500">{detail}</div>
    </div>
  );
}
