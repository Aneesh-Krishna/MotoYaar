import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { aiReportService } from "@/services/aiReportService";
import { formatDate } from "@/utils/date";
import type { AiReport } from "@/types";

export default async function AIReportsListPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const reports = await aiReportService.listByUser(session.user.id);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/reports" className="text-orange-500 text-sm font-medium">
          ← Reports
        </Link>
        <h1 className="text-base font-semibold text-gray-900">AI Reports</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <p className="text-gray-500 text-sm text-center">
              No AI reports yet. Generate one from the Reports page.
            </p>
            <Link href="/reports" className="text-orange-500 text-sm font-medium">
              Go to Reports
            </Link>
          </div>
        ) : (
          reports.map((r) => <AIReportListItem key={r.id} report={r} />)
        )}
      </div>
    </div>
  );
}

function AIReportListItem({ report }: { report: AiReport }) {
  return (
    <Link href={`/reports/ai/${report.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {report.periodLabel ?? "AI Report"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {report.completedAt
              ? formatDate(report.completedAt)
              : report.status === "pending" || report.status === "generating"
              ? "Pending…"
              : formatDate(report.requestedAt)}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: AiReport["status"] }) {
  const styles: Record<AiReport["status"], string> = {
    pending: "bg-yellow-100 text-yellow-700",
    generating: "bg-yellow-100 text-yellow-700",
    ready: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-600",
  };
  const labels: Record<AiReport["status"], string> = {
    pending: "Pending",
    generating: "Generating",
    ready: "Ready",
    failed: "Failed",
  };
  return (
    <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
