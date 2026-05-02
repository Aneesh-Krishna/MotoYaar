const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(date: string | Date | null | undefined): string {
  if (date == null) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDate();
  const mon = MONTHS[d.getMonth()];
  const yr = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${mon} ${yr}, ${hh}:${mm}`;
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (date == null) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

export function formatTripDateRange(startDate: string, endDate?: string | null): string {
  const s = new Date(startDate);
  const sDay = s.getDate();
  const sMon = MONTHS[s.getMonth()];
  const sYear = s.getFullYear();

  if (!endDate) return `${sDay} ${sMon} ${sYear}`;

  const e = new Date(endDate);
  const eDay = e.getDate();
  const eMon = MONTHS[e.getMonth()];
  const eYear = e.getFullYear();

  if (sDay === eDay && sMon === eMon && sYear === eYear) return `${sDay} ${sMon} ${eYear}`;
  if (s.getMonth() === e.getMonth() && sYear === eYear) return `${sDay}–${eDay} ${eMon} ${eYear}`;
  return `${sDay} ${sMon}–${eDay} ${eMon} ${eYear}`;
}
