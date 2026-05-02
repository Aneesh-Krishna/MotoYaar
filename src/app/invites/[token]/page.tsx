import { getSession } from "@/lib/session";
import { vehicleInviteService } from "@/services/vehicleInviteService";
import { redirect } from "next/navigation";
import { InviteErrorView } from "@/components/invites/InviteErrorView";

interface Props {
  params: { token: string };
}

export default async function InvitePage({ params }: Props) {
  const session = await getSession();

  if (!session) {
    redirect(`/login?inviteToken=${params.token}`);
  }

  let result: { vehicleId: string };
  try {
    result = await vehicleInviteService.acceptInvite(params.token, session.user.id);
  } catch (err) {
    return <InviteErrorView error={err} />;
  }

  redirect(`/garage/${result.vehicleId}`);
}
