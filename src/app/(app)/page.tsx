import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Car, IndianRupee } from "lucide-react";
import { vehicleService } from "@/services/vehicleService";
import { expenseService } from "@/services/expenseService";
import { VehicleCard } from "@/components/ui/VehicleCard";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { RefreshButton } from "./_components/RefreshButton";
import { formatDate, formatINR } from "@/lib/utils";
import type { Vehicle, RecentActivity } from "@/types";

// ─── Greeting helpers (IST server-side) ──────────────────────────────────────

function getIST() {
  const now = new Date();
  const hourStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).format(now);
  const hour = parseInt(hourStr, 10);
  return { hour, now };
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function getFormattedDate(now: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function GreetingSection({ userName, hour, dateStr }: { userName: string; hour: number; dateStr: string }) {
  return (
    <section aria-label="Greeting" className="flex items-start justify-between">
      <div>
        <h2 className="text-title font-semibold text-foreground">
          {getGreeting(hour)}, {userName} 👋
        </h2>
        <p className="text-caption text-foreground-muted mt-0.5">{dateStr}</p>
      </div>
      <RefreshButton />
    </section>
  );
}

function VehicleCarousel({ vehicles }: { vehicles: Vehicle[] }) {
  return (
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
      <div
        className="flex gap-3 overflow-x-auto scroll-bleed scrollbar-none pb-1 snap-x snap-mandatory"
        role="list"
        aria-label="Vehicle cards"
      >
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} role="listitem" className="snap-start flex-shrink-0">
            <VehicleCard vehicle={vehicle} compact />
          </div>
        ))}
        <div role="listitem" className="snap-start flex-shrink-0">
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
      </div>
    </section>
  );
}

function RecentActivitySection({ activities }: { activities: RecentActivity[] }) {
  return (
    <section aria-label="Recent activity">
      <h2 className="text-heading font-semibold text-foreground mb-3">Recent Activity</h2>
      {activities.length === 0 ? (
        <div className="bg-card rounded-card border border-border shadow-card px-4 py-6 text-center">
          <p className="text-caption text-foreground-muted">No recent activity yet.</p>
        </div>
      ) : (
        <div className="bg-card rounded-card border border-border shadow-card">
          {activities.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
            >
              <IndianRupee size={16} className="text-foreground-muted shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-foreground truncate">
                  {item.reason} — {item.vehicleName}
                </p>
                <p className="text-caption text-foreground-muted">
                  {formatDate(item.date)}
                </p>
              </div>
              <span className="text-body font-semibold text-foreground tabular-nums shrink-0">
                {formatINR(parseFloat(String(item.price)))}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CommunityHighlights() {
  return (
    <section aria-label="Community highlights">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-heading font-semibold text-foreground">Community</h2>
        <Link
          href="/community"
          className="text-caption font-medium text-primary hover:text-primary-dark"
        >
          See all
        </Link>
      </div>
      <div className="bg-card rounded-card border border-border shadow-card px-4 py-6 text-center">
        <p className="text-caption text-foreground-muted">
          Community highlights coming soon
        </p>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-8">
      <Car size={64} className="text-gray-300" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-gray-700">No vehicles yet</h2>
      <p className="text-sm text-gray-500">
        Add your first vehicle to start tracking documents, expenses, and trips.
      </p>
      <Link
        href="/garage/new"
        className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
      >
        Add your first vehicle
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [vehicles, recentActivities] = await Promise.all([
    vehicleService.listByUser(session.user.id),
    expenseService.recentByUser(session.user.id, 5),
  ]);

  // Empty state — show full-screen prompt when user has no vehicles
  if (vehicles.length === 0) {
    return <EmptyState />;
  }

  // Alert strip
  const expiredVehicles = vehicles.filter((v) => v.nextDocumentStatus === "expired");
  const expiringVehicles = vehicles.filter((v) => v.nextDocumentStatus === "expiring");
  const hasAlerts = expiredVehicles.length > 0 || expiringVehicles.length > 0;

  // Greeting (IST)
  const { hour, now } = getIST();
  const dateStr = getFormattedDate(now);
  const userName = session.user.name ?? "there";

  return (
    <>
      {hasAlerts && (
        <AlertBanner
          variant={expiredVehicles.length > 0 ? "danger" : "warning"}
          message={
            expiredVehicles.length > 0
              ? `${expiredVehicles.length} document(s) have expired. Renew now.`
              : `${expiringVehicles.length} document(s) expiring soon. Check your vehicles.`
          }
          href="/garage"
        />
      )}

      <div className="px-screen-x py-5 space-y-6 max-w-screen-xl mx-auto lg:px-screen-x-md">
        <GreetingSection userName={userName} hour={hour} dateStr={dateStr} />
        <VehicleCarousel vehicles={vehicles} />
        <RecentActivitySection activities={recentActivities} />
        <CommunityHighlights />
      </div>
    </>
  );
}
