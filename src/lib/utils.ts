import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely — use everywhere instead of raw `clsx`. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian Rupees. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a date as "15 Mar 2026". */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** Format a date as "Mar 2026" (for report periods). */
export function formatMonthYear(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** Return days remaining until a date (negative = expired). */
export function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Derive document status from expiry date and notification window. */
export function getDocumentStatus(
  expiryDate: Date | string | null,
  notificationWindowDays = 30
): "valid" | "expiring" | "expired" | "incomplete" {
  if (!expiryDate) return "incomplete";
  const days = daysUntil(expiryDate);
  if (days < 0) return "expired";
  if (days <= notificationWindowDays) return "expiring";
  return "valid";
}

/** Truncate text to a max character count with ellipsis. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Format a relative time string ("2h ago", "3 days ago"). */
export function timeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}