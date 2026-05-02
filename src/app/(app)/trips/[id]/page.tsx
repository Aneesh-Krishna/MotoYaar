import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { tripService } from "@/services/tripService";
import { expenseService } from "@/services/expenseService";
import { redirect, notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { formatTripDateRange } from "@/utils/date";
import { formatINR } from "@/utils/currency";
import { TripKebabMenu } from "@/components/trips/TripKebabMenu";
import OfflineMapsSection from "@/components/map/OfflineMapsSection";
import { MapPin, Car, Clock, ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import type { Trip, Expense } from "@/types";
import TripDetailTabs from "@/components/trips/TripDetailTabs";

interface Props {
  params: { id: string };
  searchParams: { tab?: string };
}

function TripDetailHeader({ trip }: { trip: Trip }) {
  const dateRange = formatTripDateRange(trip.startDate, trip.endDate);

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{dateRange}</p>
      </div>
      <TripKebabMenu tripId={trip.id} hasLiveRoute={trip.hasLiveRoute} />
    </div>
  );
}


export default async function TripDetailPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const [trip, linkedExpense] = await Promise.all([
      tripService.getById(params.id, session.user.id),
      expenseService.getByTripId(params.id, session.user.id),
    ]);

    const VALID_TABS = ["overview", "route"];
    const activeTab = VALID_TABS.includes(searchParams.tab ?? "") ? searchParams.tab! : "overview";

    // Only allow route tab if trip has live route
    const visibleTabs = VALID_TABS.filter(tab => !(tab === "route" && !trip.hasLiveRoute));

    return (
      <div className="px-4 py-4 space-y-6">
        <TripDetailHeader trip={trip} />
        <Suspense fallback={null}>
          <TripDetailTabs
            trip={trip}
            linkedExpense={linkedExpense}
            activeTab={activeTab}
            visibleTabs={visibleTabs}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/trips");
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
