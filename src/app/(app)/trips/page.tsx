import Link from "next/link";
import { Plus, MapPin } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { TripCard } from "@/components/ui/TripCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Trip } from "@/types";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TRIPS: Trip[] = [
  {
    id: "t1",
    userId: "u1",
    vehicleId: "v1",
    title: "Pune to Mumbai Weekend Run",
    description: "Quick getaway with the Meteor.",
    startDate: "2026-03-10",
    endDate: "2026-03-11",
    routeText: "Pune → Expressway → Mumbai",
    timeTaken: "3h 20min",
    breakdown: [
      { category: "Fuel", amount: 450 },
      { category: "Food", amount: 350 },
    ],
    totalCost: 800,
    createdAt: "2026-03-10",
    vehicle: { id: "v1", name: "Royal Enfield Meteor", registrationNumber: "MH02AB1234" },
  },
  {
    id: "t2",
    userId: "u1",
    vehicleId: "v2",
    title: "Family Trip to Lonavala",
    startDate: "2026-02-22",
    routeText: "Mumbai → Lonavala",
    timeTaken: "2h",
    breakdown: [
      { category: "Fuel", amount: 600 },
      { category: "Stay", amount: 2500 },
      { category: "Food", amount: 900 },
    ],
    totalCost: 4000,
    createdAt: "2026-02-22",
    vehicle: { id: "v2", name: "Maruti Swift", registrationNumber: "MH02CD5678" },
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const isEmpty = MOCK_TRIPS.length === 0;

  return (
    <>
      <TopBar
        title="Trips"
        actions={
          <Link
            href="/trips/new"
            className="flex items-center gap-1.5 bg-primary text-white rounded-btn px-3 py-1.5 text-caption font-semibold hover:bg-primary-dark transition-colors"
            aria-label="Log a new trip"
          >
            <Plus size={14} aria-hidden="true" />
            Log Trip
          </Link>
        }
      />

      <div className="px-screen-x py-5 max-w-screen-xl mx-auto lg:px-screen-x-md">
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
            {MOCK_TRIPS.map((trip) => (
              <li key={trip.id}>
                <TripCard trip={trip} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB */}
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