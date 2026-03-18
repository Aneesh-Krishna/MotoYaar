import { Plus } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { VehicleCard } from "@/components/ui/VehicleCard";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { PostCard } from "@/components/ui/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Car } from "lucide-react";
import type { Vehicle, Post } from "@/types";

// ─── Mock data (replace with real data fetching) ──────────────────────────────

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

const MOCK_POSTS: Post[] = [
  {
    id: "p1",
    userId: "u2",
    title: "Manali via Rohtang — Solo Ride Report",
    description:
      "Finally did the Manali solo trip on my Bullet. 1,200km over 4 days. Here's everything you need to know about the route, fuel stops, and stay options.",
    images: [],
    links: [],
    tags: ["Bikes", "Travel"],
    edited: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    author: { id: "u2", name: "Ravi Kumar", username: "ravikumar", profileImageUrl: undefined },
    likes: 47,
    dislikes: 2,
    commentCount: 13,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const expiringDocs = MOCK_VEHICLES.filter(
    (v) => v.nextDocumentStatus === "expiring" || v.nextDocumentStatus === "expired"
  );

  return (
    <>
      <TopBar showLogo unreadCount={2} />

      {/* Document expiry alert */}
      {expiringDocs.length > 0 && (
        <AlertBanner
          variant={expiringDocs.some((v) => v.nextDocumentStatus === "expired") ? "danger" : "warning"}
          message={
            expiringDocs.length === 1
              ? `${expiringDocs[0].name}: document expiring soon`
              : `${expiringDocs.length} documents expiring soon`
          }
          href="/garage"
        />
      )}

      <div className="px-screen-x py-5 space-y-6 max-w-screen-xl mx-auto lg:px-screen-x-md">

        {/* Greeting */}
        <section aria-label="Greeting">
          <h2 className="text-title font-semibold text-foreground">
            Good morning, Rahul 👋
          </h2>
          <p className="text-caption text-foreground-muted mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </section>

        {/* Vehicle cards — horizontal scroll on mobile */}
        <section aria-label="My vehicles">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading font-semibold text-foreground">My Vehicles</h2>
            <Link
              href="/garage"
              className="text-caption font-medium text-primary hover:text-primary-dark"
            >
              See all
            </Link>
          </div>

          {MOCK_VEHICLES.length === 0 ? (
            <EmptyState
              icon={<Car size={48} />}
              heading="No vehicles yet"
              subtext="Add your first vehicle to get started."
              action={
                <Link
                  href="/garage/new"
                  className="inline-flex items-center gap-2 bg-primary text-white rounded-btn px-4 py-2 text-body font-semibold hover:bg-primary-dark transition-colors"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add Vehicle
                </Link>
              }
            />
          ) : (
            <div
              className="flex gap-3 overflow-x-auto scroll-bleed scrollbar-none pb-1"
              role="list"
              aria-label="Vehicle cards"
            >
              {MOCK_VEHICLES.map((vehicle) => (
                <div key={vehicle.id} role="listitem">
                  <VehicleCard vehicle={vehicle} compact />
                </div>
              ))}

              {/* Add vehicle card */}
              <Link
                href="/garage/new"
                className="flex w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border text-foreground-muted hover:border-primary hover:text-primary transition-colors"
                aria-label="Add a new vehicle"
                style={{ minHeight: "8.5rem" }}
              >
                <Plus size={24} aria-hidden="true" />
                <span className="text-caption font-medium">Add Vehicle</span>
              </Link>
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section aria-label="Recent activity">
          <h2 className="text-heading font-semibold text-foreground mb-3">
            Recent Activity
          </h2>
          <div className="bg-card rounded-card border border-border shadow-card">
            {/* Placeholder rows */}
            {[
              { label: "Fuel — Royal Enfield Meteor", amount: "₹1,200", date: "Today" },
              { label: "Service — Maruti Swift", amount: "₹3,500", date: "12 Mar" },
              { label: "Trip: Pune to Mumbai", amount: "₹850", date: "10 Mar" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-body font-medium text-foreground">{item.label}</p>
                  <p className="text-caption text-foreground-muted">{item.date}</p>
                </div>
                <span className="text-body font-semibold text-foreground tabular-nums">
                  {item.amount}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Community Highlights */}
        <section aria-label="Community highlights">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading font-semibold text-foreground">
              Community
            </h2>
            <Link
              href="/community"
              className="text-caption font-medium text-primary hover:text-primary-dark"
            >
              See all
            </Link>
          </div>

          <div className="space-y-3">
            {MOCK_POSTS.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}