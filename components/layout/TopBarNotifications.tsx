"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Loader2, RefreshCcw, X } from "lucide-react";
import { formatDate } from "@/lib/format";

type AuditEntry = {
  id: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  actor?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function entityHref(entry: AuditEntry): string | null {
  const metadata = entry.metadata ?? {};
  const invoiceNumber =
    typeof metadata.invoice_number === "string"
      ? metadata.invoice_number
      : typeof metadata.invoiceNumber === "string"
        ? metadata.invoiceNumber
        : null;
  if (entry.entityType === "invoice" && invoiceNumber) return `/invoices/${invoiceNumber.toLowerCase()}`;
  if (entry.entityType === "invoice" && entry.entityId) return `/invoices/${entry.entityId}`;
  if (entry.entityType === "invoice_document" && invoiceNumber) return `/invoices/${invoiceNumber.toLowerCase()}`;
  if (entry.entityType === "invoice_pdf" && invoiceNumber) return `/invoices/${invoiceNumber.toLowerCase()}`;
  return null;
}

function relativeTime(value?: string | null) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const diff = Date.now() - time;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} hr ago`;
  if (diff < 604_800_000) return `${Math.round(diff / 86_400_000)} d ago`;
  return formatDate(value);
}

export function TopBarNotifications() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  async function loadEntries() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/audit?limit=15", { cache: "no-store" });
      const result = (await response.json()) as { entries?: AuditEntry[]; message?: string };
      if (!response.ok) {
        setError(result.message ?? "Could not load activity.");
        return;
      }
      setEntries(result.entries ?? []);
      setLastLoadedAt(Date.now());
    } catch {
      setError("Could not load activity. Check the local server and Supabase connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (lastLoadedAt && Date.now() - lastLoadedAt < 15_000) return;
    void loadEntries();
  }, [open, lastLoadedAt]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm hover:text-slate-900"
      >
        <Bell className="h-4 w-4" />
        {entries.length ? (
          <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {entries.length > 9 ? "9+" : entries.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-slate-950">Recent activity</h3>
              <p className="text-xs text-slate-500">Latest entries from Supabase audit log.</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void loadEntries()}
                aria-label="Refresh"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {error ? (
              <div className="px-4 py-6 text-sm text-red-700">{error}</div>
            ) : loading && entries.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading activity...
              </div>
            ) : entries.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No activity yet. Upload an invoice or move items through the review queue.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const href = entityHref(entry);
                  const body = (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-950">{readable(entry.action)}</span>
                        <span className="text-xs text-slate-500">{relativeTime(entry.createdAt)}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{entry.message ?? readable(entry.entityType)}</div>
                      {entry.actor ? <div className="mt-1 text-[11px] text-slate-400">by {entry.actor}</div> : null}
                    </>
                  );
                  return (
                    <li key={entry.id}>
                      {href ? (
                        <Link
                          href={href}
                          className="block px-4 py-3 text-sm transition hover:bg-slate-50"
                          onClick={() => setOpen(false)}
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="block px-4 py-3 text-sm">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-right">
            <Link
              href="/exports"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              View export history &rarr;
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
