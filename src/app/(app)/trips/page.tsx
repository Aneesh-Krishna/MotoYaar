import Link from "next/link";
import { Plus, MapPin } from "lucide-react";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { tripService } from "@/services/tripService";
import { TripCard } from "@/components/ui/TripCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResumeTripBanner } from "@/components/map/ResumeTripBanner";
import { StartLiveTripSheetWrapper } from "@/components/trips/StartLiveTripSheetWrapper";

export default async function TripsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const trips = await tripService.listByUser(session.user.id);
  const isEmpty = trips.length === 0;

  return (
    <>
      <div className="px-screen-x py-5 max-w-screen-xl mx-auto lg:px-screen-x-md">
        <ResumeTripBanner />

        {isEmpty ? (
          <EmptyState
            icon={<MapPin size={56} />}
            heading="No trips logged yet"
            subtext="Log your first trip to start tracking routes and costs."
            action={
              <Link
                href="/trips/new"
                className="inline-flex items-center gap-2 bg-primary text-white rounded-btn px-5 py-2.5 text-body font-semibold hover:bg-primary-dark transition-colors"
              >
                <Plus size={16} aria-hidden="true" />
                Log Trip
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3" aria-label="Your trips">
            {trips.map((trip) => (
              <li key={trip.id}>
                <TripCard trip={trip} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isEmpty && <StartLiveTripSheetWrapper />}

      {!isEmpty && (
        <Link
          href="/trips/new"
          aria-label="Log a new trip"
          className="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] z-30 lg:hidden
                     w-14 h-14 bg-primary text-white rounded-full shadow-lg
                     flex items-center justify-center
                     hover:bg-primary-dark transition-colors
                     focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus size={24} aria-hidden="true" />
        </Link>
      )}
    </>
  );
}
