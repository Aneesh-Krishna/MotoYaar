export function formatTripDateRange(startDate: string, endDate?: string): string {
  const start = new Date(startDate);
  const startStr = start.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!endDate) return startStr;

  const end = new Date(endDate);
  const endStr = end.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // If same day, just show once
  if (startStr === endStr) return startStr;

  // If same month/year, show as "Jan 1–3, 2026"
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}–${endStr}`;
  }

  return `${startStr} – ${endStr}`;
}
