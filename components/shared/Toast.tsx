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
    <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg border border-emerald-200 bg-white p-4 text-sm text-slate-700 shadow-lg">
      <div className="flex gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div>
          <div className="font-semibold text-slate-950">Saved to database</div>
          <div className="mt-1 leading-5">{message}</div>
        </div>
      </div>
    </div>
  );
}
