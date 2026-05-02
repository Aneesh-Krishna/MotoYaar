import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Loader2, XCircle } from "lucide-react";
import { getSession } from "@/lib/session";
import { aiReportService } from "@/services/aiReportService";
import { formatRelativeTime, formatDate } from "@/utils/date";
import type { AiReport } from "@/types";

interface PageProps {
  params: { id: string };
}

export default async function AIReportDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  let report: AiReport;
  try {
    report = await aiReportService.getById(params.id, session.user.id);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/reports/ai" className="text-orange-500 text-sm font-medium">
          ← AI Reports
        </Link>
        <h1 className="text-base font-semibold text-gray-900">Report Detail</h1>
      </div>

      <div className="px-4 py-4">
        <AIReportDetailView report={report} />
      </div>
    </div>
  );
}

function AIReportDetailView({ report }: { report: AiReport }) {
  if (report.status === "pending" || report.status === "generating") {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <p className="text-gray-600 text-sm">Your report is still being generated. Check back shortly.</p>
        <Link href="/reports" className="text-orange-500 text-sm font-medium">
          Back to Reports
        </Link>
      </div>
    );
  }

  if (report.status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <XCircle className="text-red-400" size={32} />
        <p className="text-gray-600 text-sm text-center">
          Report generation failed.<br />Your free quota has not been used.
        </p>
        <Link href="/reports" className="text-orange-500 text-sm font-medium">
          Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Report header card */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4">
        <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">AI Spending Analysis</p>
        <h1 className="text-lg font-bold text-gray-900 mt-1">{report.periodLabel ?? "Spending Report"}</h1>
        {report.completedAt && (
          <p className="text-xs text-gray-500 mt-1">
            Generated {formatRelativeTime(report.completedAt)} · {formatDate(report.completedAt)}
          </p>
        )}
      </div>

      {/* Narrative content */}
      {report.content ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-6 whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
          {report.content}
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center py-10">No content available.</p>
      )}

      <div className="pt-2">
        <Link href="/reports" className="text-orange-500 text-sm font-medium">
          ← Back to Reports
        </Link>
      </div>
    </div>
  );
}
