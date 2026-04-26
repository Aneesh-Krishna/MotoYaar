import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { reportService } from "@/services/reportService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { VehicleReportView } from "@/components/reports/VehicleReportView";
import type { ReportFilter } from "@/types";

interface PageProps {
  params: { id: string };
  searchParams: { filter?: string; from?: string; to?: string };
}

export default async function VehicleSpendReportPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Suspense fallback={<VehicleReportSkeleton />}>
      <ReportDataFetcher
        vehicleId={params.id}
        userId={session.user.id}
        filter={searchParams}
      />
    </Suspense>
  );
}

async function ReportDataFetcher({
  vehicleId,
  userId,
  filter,
}: {
  vehicleId: string;
  userId: string;
  filter: ReportFilter;
}) {
  try {
    const report = await reportService.getVehicleReport(vehicleId, userId, filter);
    return <VehicleReportView report={report} vehicleId={vehicleId} />;
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/garage");
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

function VehicleReportSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
    </div>
  );
}
