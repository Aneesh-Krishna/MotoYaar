import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { communityService } from "@/services/communityService";
import { CommunityFeedView } from "@/components/community/CommunityFeedView";

export default async function CommunityPage() {
  const session = await getSession();

  const { posts, hasMore } = await communityService.listPosts(
    "trending",
    1,
    undefined,
    session?.user.id
  );

  return (
    <Suspense>
      <CommunityFeedView
        initialPosts={posts}
        initialHasMore={hasMore}
        isAuthenticated={!!session}
      />
    </Suspense>
  );
}
