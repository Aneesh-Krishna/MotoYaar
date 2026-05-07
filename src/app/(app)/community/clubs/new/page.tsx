import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { CreateClubView } from "@/components/clubs/CreateClubView";

export default async function NewClubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <CreateClubView />;
}
