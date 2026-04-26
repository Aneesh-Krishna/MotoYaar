import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { communityService } from "@/services/communityService";
import { EditPostView } from "@/components/community/EditPostView";
import { NotFoundError } from "@/lib/errors";
import { notFound } from "next/navigation";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  let post;
  try {
    post = await communityService.getPost(params.id, session.user.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  if (post.userId !== session.user.id) redirect(`/community/${params.id}`);

  return <EditPostView post={post} />;
}
