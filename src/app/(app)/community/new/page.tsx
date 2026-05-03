"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PostForm } from "@/components/community/PostForm";
import type { CreatePostInput } from "@/lib/validations/post";

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

export default function NewPostPage() {
  const router = useRouter();

  async function handleSubmit(data: CreatePostInput) {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.status === 409) {
      toast.error("Your post was already submitted.");
      return;
    }

    if (!res.ok) {
      toast.error("Failed to create post. Please try again.");
      return;
    }

    const post = await res.json();
    router.push(`/community/${post.id}`);
  }

  return (
    <div className="px-screen-x py-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">New Post</h1>
      <PostForm onSubmit={handleSubmit} onImageUpload={uploadPostImage} />
    </div>
  );
}
