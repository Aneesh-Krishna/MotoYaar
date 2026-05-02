import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { reportService } from "@/services/reportService";
import { OverallReportView } from "@/components/reports/OverallReportView";
import type { OverallReportFilter } from "@/types";

interface PageProps {
  searchParams: {
    filter?: string;
    month1?: string;
    month2?: string;
    from?: string;
    to?: string;
    compFrom?: string;
    compTo?: string;
  };
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Suspense fallback={<OverallReportSkeleton />}>
      <ReportDataFetcher userId={session.user.id} searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportDataFetcher({
  userId,
  searchParams,
}: {
  userId: string;
  searchParams: PageProps["searchParams"];
}) {
  // A-6: map searchParams.filter (URL param) → OverallReportFilter.type (internal field)
  const validTypes: OverallReportFilter["type"][] = ["monthly", "range", "yearly"];
  const rawType = searchParams.filter ?? "monthly";
  const filterType: OverallReportFilter["type"] = validTypes.includes(rawType as OverallReportFilter["type"])
    ? (rawType as OverallReportFilter["type"])
    : "monthly";

  const filter: OverallReportFilter = {
    type: filterType,
    month1: searchParams.month1,
    month2: searchParams.month2,
    from: searchParams.from,
    to: searchParams.to,
    compFrom: searchParams.compFrom,
    compTo: searchParams.compTo,
  };

  const report = await reportService.getOverallReport(userId, filter);
  return <OverallReportView report={report} />;
}

function OverallReportSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
      <div className="flex gap-3 overflow-x-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-36 flex-shrink-0 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
      <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
    </div>
  );
}
