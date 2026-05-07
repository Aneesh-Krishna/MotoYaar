import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { clubService } from "@/services/clubService";
import { ClubProfileView } from "@/components/clubs/ClubProfileView";
import { NotFoundError } from "@/lib/errors";
import { notFound } from "next/navigation";

export default async function ClubPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const club = await clubService.getById(params.id, session.user.id);
    return <ClubProfileView club={club} currentUserId={session.user.id} />;
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
}
