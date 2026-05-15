import { CALCULATION_RULES } from "@/lib/constants";

export function roundCurrency(value: number) {
  if (!CALCULATION_RULES.ROUND_TO_CENTS) return value;
  return Math.round(value * 100) / 100;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function stateLabel(stateCode?: string | null) {
  return stateCode ? stateCode.toUpperCase() : "Missing";
}
