"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Eye, FileQuestion, Files, Filter, Plus, ShieldCheck, Upload, Users } from "lucide-react";

export type ReviewSummaryTab =
  | "all"
  | "needs_review"
  | "accounting_review"
  | "missing_fields"
  | "threshold_warnings"
  | "approved";

function emitToolbarScroll() {
  if (typeof window === "undefined") return;
  const anchor = document.getElementById("review-queue-toolbar");
  if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function dispatchPanel(panel: "filters" | "note") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nexuswatch:review-panel", { detail: { panel } }));
  emitToolbarScroll();
}

function dispatchTab(tab: ReviewSummaryTab) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nexuswatch:review-tab", { detail: { tab } }));
  emitToolbarScroll();
}

export function ReviewHeaderActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => dispatchPanel("filters")}
        className="secondary-button px-4 py-2"
      >
        <Filter className="h-4 w-4" />
        Manage Filters
      </button>
      <button
        type="button"
        onClick={() => dispatchPanel("note")}
        className="primary-button px-4 py-2"
      >
        <Plus className="h-4 w-4" />
        Add Review Note
      </button>
      <Link href="/exports" className="secondary-button px-4 py-2">
        Export
      </Link>
      <Link href="/upload" className="primary-button px-4 py-2">
        <Upload className="h-4 w-4" />
        Upload Invoice
      </Link>
    </div>
  );
}

type SummaryTone = "indigo" | "red" | "orange" | "violet" | "amber" | "emerald";

const summaryToneStyles: Record<SummaryTone, { iconBg: string; ring: string }> = {
  indigo: { iconBg: "bg-indigo-50 text-indigo-600", ring: "hover:ring-indigo-200" },
  red: { iconBg: "bg-red-50 text-red-600", ring: "hover:ring-red-200" },
  orange: { iconBg: "bg-orange-50 text-orange-600", ring: "hover:ring-orange-200" },
  violet: { iconBg: "bg-violet-50 text-violet-600", ring: "hover:ring-violet-200" },
  amber: { iconBg: "bg-amber-50 text-amber-600", ring: "hover:ring-amber-200" },
  emerald: { iconBg: "bg-emerald-50 text-emerald-600", ring: "hover:ring-emerald-200" },
};

const summaryIcons: Record<SummaryTone, typeof Files> = {
  indigo: Files,
  red: Eye,
  orange: Users,
  violet: FileQuestion,
  amber: AlertTriangle,
  emerald: ShieldCheck,
};

export function ReviewSummaryCard({
  tone,
  label,
  value,
  detail,
  tab,
}: {
  tone: SummaryTone;
  label: string;
  value: number;
  detail: string;
  tab: ReviewSummaryTab;
}) {
  const Icon = summaryIcons[tone];
  const styles = summaryToneStyles[tone];

  return (
    <button
      type="button"
      onClick={() => dispatchTab(tab)}
      className={`premium-card flex w-full items-center gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 ${styles.ring}`}
    >
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${styles.iconBg}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs font-bold text-slate-600">{label}</div>
        <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{detail}</div>
      </div>
    </button>
  );
}

export function ReviewSummaryCardsSlot({ cards }: { cards: ReactNode }) {
  return <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">{cards}</section>;
}
