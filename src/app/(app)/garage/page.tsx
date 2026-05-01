import Link from "next/link";
import { Plus, Car } from "lucide-react";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getCachedVehicles } from "@/lib/cache";
import { VehicleCard } from "@/components/ui/VehicleCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function GaragePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const vehicles = await getCachedVehicles(session.user.id);
  const isEmpty = vehicles.length === 0;

  return (
    <>
      <div className="px-screen-x py-5 max-w-screen-xl mx-auto lg:px-screen-x-md">
        {isEmpty ? (
          <EmptyState
            icon={<Car size={56} />}
            heading="Your garage is empty"
            subtext="Add your first vehicle to start tracking documents, expenses, and trips."
            action={
              <Link
                href="/garage/new"
                className="inline-flex items-center gap-2 bg-primary text-white rounded-btn px-5 py-2.5 text-body font-semibold hover:bg-primary-dark transition-colors"
              >
                <Plus size={16} aria-hidden="true" />
                Add Vehicle
              </Link>
            }
          />
        ) : (
          <ul
            className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0"
            aria-label="Your vehicles"
          >
            {vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <VehicleCard vehicle={vehicle} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isEmpty && (
        <Link
          href="/garage/new"
          aria-label="Add a new vehicle"
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
