import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { communityService } from "@/services/communityService";
import { PostDetailView } from "@/components/community/PostDetailView";
import { NotFoundError } from "@/lib/errors";

export default async function CommunityDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();

  let post;
  try {
    post = await communityService.getPost(params.id, session?.user.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return <PostDetailView post={post} currentUserId={session?.user.id} />;
}
