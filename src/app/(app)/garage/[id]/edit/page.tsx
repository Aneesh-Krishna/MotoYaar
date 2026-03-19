import { getSession } from "@/lib/session";
import { vehicleService } from "@/services/vehicleService";
import { redirect, notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { EditVehicleForm } from "@/components/vehicles/EditVehicleForm";

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const vehicle = await vehicleService.getByIdOwnerOnly(params.id, session.user.id);
    return <EditVehicleForm vehicle={vehicle} />;
  } catch (error) {
    if (error instanceof ForbiddenError) redirect(`/garage/${params.id}`);
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
