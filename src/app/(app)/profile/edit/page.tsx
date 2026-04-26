import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { userService } from "@/services/userService";
import { EditProfileForm } from "@/components/profile/EditProfileForm";

export default async function EditProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await userService.getById(session.user.id);

  return (
    <EditProfileForm
      user={{
        id: user.id,
        name: user.name,
        username: user.username ?? "",
        bio: user.bio ?? "",
        profileImageUrl: user.profileImageUrl ?? null,
        instagramLink: user.instagramLink ?? "",
      }}
    />
  );
}
