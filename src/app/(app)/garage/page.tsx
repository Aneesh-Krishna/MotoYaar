import Link from "next/link";
import { Plus, Car } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { VehicleCard } from "@/components/ui/VehicleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Vehicle } from "@/types";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "v1",
    userId: "u1",
    name: "Royal Enfield Meteor",
    type: "2-wheeler",
    registrationNumber: "MH02AB1234",
    previousOwners: 0,
    totalSpend: 14500,
    nextDocumentStatus: "expiring",
    nextDocumentExpiry: "2026-04-10",
    createdAt: "2025-01-01",
  },
  {
    id: "v2",
    userId: "u1",
    name: "Maruti Swift",
    type: "4-wheeler",
    registrationNumber: "MH02CD5678",
    previousOwners: 1,
    totalSpend: 42000,
    nextDocumentStatus: "valid",
    createdAt: "2025-03-01",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GaragePage() {
  const isEmpty = MOCK_VEHICLES.length === 0;

  return (
    <>
      <TopBar
        title="Garage"
        actions={
          <Link
            href="/garage/new"
            className="flex items-center gap-1.5 bg-primary text-white rounded-btn px-3 py-1.5 text-caption font-semibold hover:bg-primary-dark transition-colors"
            aria-label="Add a new vehicle"
          >
            <Plus size={14} aria-hidden="true" />
            Add
          </Link>
        }
      />

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
            {MOCK_VEHICLES.map((vehicle) => (
              <li key={vehicle.id}>
                <VehicleCard vehicle={vehicle} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB — mobile only */}
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