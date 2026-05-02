import { getSession } from "@/lib/session";
import { vehicleService } from "@/services/vehicleService";
import { vehicleInviteService } from "@/services/vehicleInviteService";
import { redirect, notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { SharingPageView } from "@/components/vehicles/SharingPageView";

interface Props {
  params: { id: string };
}

export default async function SharingPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const [vehicle, access, pendingInvites] = await Promise.all([
      vehicleService.getByIdOwnerOnly(params.id, session.user.id),
      vehicleInviteService.listAccess(params.id, session.user.id),
      vehicleInviteService.listPendingInvites(params.id, session.user.id),
    ]);

    return (
      <SharingPageView
        vehicle={vehicle}
        access={access}
        pendingInvites={pendingInvites}
      />
    );
  } catch (error) {
    if (error instanceof ForbiddenError) redirect(`/garage/${params.id}`);
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
