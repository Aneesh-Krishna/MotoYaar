import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  BarChart2,
  CreditCard,
  UserPlus,
  Settings,
  Instagram,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { userService } from "@/services/userService";
import { db } from "@/lib/db/client";
import { vehicles, trips, posts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { cn } from "@/lib/utils";

function ProfileActionCard({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-4 bg-card rounded-card border border-border shadow-card p-4",
        "hover:shadow-md transition-shadow",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-primary" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-foreground">{label}</p>
        <p className="text-caption text-foreground-muted">{description}</p>
      </div>
      <ChevronRight size={16} className="text-foreground-muted shrink-0" aria-hidden="true" />
    </Link>
  );
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, counts] = await Promise.all([
    userService.getById(session.user.id),
    Promise.all([
      db.select({ count: sql<number>`COUNT(*)::int` }).from(vehicles).where(eq(vehicles.userId, session.user.id)),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(trips).where(eq(trips.userId, session.user.id)),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(posts).where(eq(posts.userId, session.user.id)),
    ]),
  ]);

  const [vehicleCount, tripCount, postCount] = counts.map((r) => r[0]?.count ?? 0);

  return (
    <>
      <div className="px-screen-x py-5 space-y-5 max-w-screen-xl mx-auto lg:px-screen-x-md">

        {/* Profile header */}
        <section aria-label="Profile info" className="flex items-start gap-4">
          <div className="relative w-20 h-20 rounded-full bg-gray-200 shrink-0 overflow-hidden">
            {user.profileImageUrl ? (
              <Image
                src={user.profileImageUrl}
                alt={user.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-400">
                {user.name[0]}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-title font-bold text-foreground">{user.name}</h2>
            <p className="text-body text-foreground-muted">@{user.username}</p>
            {user.bio && (
              <p className="text-body text-foreground mt-1.5">{user.bio}</p>
            )}
            {user.instagramLink && (
              <a
                href={user.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-caption text-primary mt-1 hover:underline"
              >
                <Instagram size={12} aria-hidden="true" />
                Instagram
              </a>
            )}
          </div>

          <Link
            href="/profile/edit"
            className="shrink-0 text-caption font-semibold text-primary border border-primary/30 rounded-btn px-3 py-1.5 hover:bg-primary/10 transition-colors"
          >
            Edit
          </Link>
        </section>

        {/* Stats row */}
        <section
          aria-label="Profile stats"
          className="grid grid-cols-3 bg-card rounded-card border border-border shadow-card"
        >
          {[
            { label: "Vehicles", value: vehicleCount },
            { label: "Trips", value: tripCount },
            { label: "Posts", value: postCount },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              className={cn(
                "flex flex-col items-center py-4",
                i < 2 && "border-r border-border"
              )}
            >
              <span className="text-title font-bold text-foreground">{value}</span>
              <span className="text-caption text-foreground-muted">{label}</span>
            </div>
          ))}
        </section>

        {/* Action cards */}
        <section aria-label="Profile actions" className="space-y-3">
          <ProfileActionCard
            href="/reports"
            icon={BarChart2}
            label="Reports & Spends"
            description="View overall spend across all vehicles"
          />
          <ProfileActionCard
            href="/profile/driving-licence"
            icon={CreditCard}
            label="Driver's Licence"
            description="Track your DL expiry date"
          />
          <ProfileActionCard
            href="/profile/invites"
            icon={UserPlus}
            label="Vehicle Sharing"
            description="Invite others to view your vehicles"
          />
        </section>

        {/* Settings link */}
        <Link
          href="/profile/settings"
          className={cn(
            "flex items-center gap-3 bg-card rounded-card border border-border shadow-card p-4",
            "hover:shadow-md transition-shadow"
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <Settings size={20} className="text-foreground-muted" aria-hidden="true" />
          </div>
          <span className="flex-1 text-body font-semibold text-foreground">Settings</span>
          <ChevronRight size={16} className="text-foreground-muted" aria-hidden="true" />
        </Link>

        <SignOutButton />
      </div>
    </>
  );
}
