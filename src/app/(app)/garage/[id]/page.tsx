import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { vehicleService } from "@/services/vehicleService";
import { expenseService } from "@/services/expenseService";
import { documentService } from "@/services/documentService";
import { redirect, notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { VehicleHeader } from "@/components/vehicles/VehicleHeader";
import { VehicleDetailTabs } from "@/components/vehicles/VehicleDetailTabs";

interface Props {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function VehicleDetailPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  try {
    const vehicle = await vehicleService.getWithAccessCheck(params.id, session.user.id);
    const VALID_TABS = ["overview", "documents", "expenses", "trips"];
    const activeTab = VALID_TABS.includes(searchParams.tab ?? "") ? searchParams.tab! : "overview";

    const [totalSpend, lastService, nextExpiry, dbUser] = await Promise.all([
      expenseService.sumByVehicle(vehicle.id),
      expenseService.lastServiceDate(vehicle.id),
      documentService.nextExpiry(vehicle.id),
      db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
    ]);

    const storagePreference =
      (dbUser?.documentStoragePreference as "parse_only" | "full_storage") ?? "parse_only";

    return (
      <div className="min-h-screen bg-gray-50">
        <VehicleHeader vehicle={vehicle} currentUserId={session.user.id} />
        <Suspense fallback={null}>
          <VehicleDetailTabs
            vehicle={vehicle}
            activeTab={activeTab}
            totalSpend={totalSpend}
            lastService={lastService}
            nextExpiry={nextExpiry}
            storagePreference={storagePreference}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/garage");
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
