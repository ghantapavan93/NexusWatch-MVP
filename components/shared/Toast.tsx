"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-emerald-200 bg-white/95 p-4 text-sm text-slate-700 shadow-2xl shadow-slate-900/15 backdrop-blur">
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div>
          <div className="font-semibold text-slate-950">Saved to database</div>
          <div className="mt-1 leading-5">{message}</div>
        </div>
      </div>
    </div>
  );
}
