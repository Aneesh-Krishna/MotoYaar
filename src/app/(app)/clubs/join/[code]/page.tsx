import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { clubService } from "@/services/clubService";
import { JoinClubView } from "@/components/clubs/JoinClubView";
import { NotFoundError } from "@/lib/errors";
import { notFound } from "next/navigation";

export default async function JoinClubPage({ params }: { params: { code: string } }) {
  const session = await getSession();
  if (!session) redirect(`/login?next=/clubs/join/${params.code}`);

  try {
    const club = await clubService.resolveJoinLink(params.code);
    return <JoinClubView club={club} inviteCode={params.code} />;
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
}
