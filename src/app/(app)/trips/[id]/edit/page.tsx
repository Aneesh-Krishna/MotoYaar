import { getSession } from "@/lib/session";
import { tripService } from "@/services/tripService";
import { TripEditForm } from "@/components/trips/TripEditForm";
import { redirect, notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

interface Props {
  params: { id: string };
}

export default async function EditTripPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const trip = await tripService.getById(params.id, session.user.id);
    return <TripEditForm trip={trip} />;
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/trips");
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
