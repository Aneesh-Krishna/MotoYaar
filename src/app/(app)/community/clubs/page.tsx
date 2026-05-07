import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ClubsView } from "@/components/clubs/ClubsView";

export default async function ClubsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ClubsView currentUserId={session.user.id} />;
}
