"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PostForm } from "@/components/community/PostForm";
import type { CreatePostInput } from "@/lib/validations/post";
import type { PostDetail } from "@/types";

async function uploadPostImage(file: File): Promise<string> {
  const res = await fetch("/api/uploads/post-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Upload failed");
  }

  const { uploadUrl, key } = await res.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putRes.ok) throw new Error("Failed to upload image to storage");

  return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
}

interface EditPostViewProps {
  post: PostDetail;
}

export function EditPostView({ post }: EditPostViewProps) {
  const router = useRouter();

  async function handleSubmit(data: CreatePostInput) {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      toast.error("Failed to save changes. Please try again.");
      return;
    }

    router.push(`/community/${post.id}`);
  }

  return (
    <div className="px-screen-x py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Edit Post</h1>
        <button
          type="button"
          onClick={() => router.push(`/community/${post.id}`)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
      <PostForm
        initialValues={{
          title: post.title,
          description: post.description,
          imageKeys: post.images,
          link: post.links[0] ?? "",
          tags: post.tags,
        }}
        onSubmit={handleSubmit}
        onImageUpload={uploadPostImage}
        submitLabel="Save changes"
        loadingLabel="Saving…"
      />
    </div>
  );
}
