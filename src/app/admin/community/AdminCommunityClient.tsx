"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, EyeOff } from "lucide-react";
import { PostForm } from "@/components/community/PostForm";
import type { CreatePostInput } from "@/lib/validations/post";
import type { AdminPost } from "@/services/adminService";

interface Props {
  initialPosts: AdminPost[];
}

export function AdminCommunityClient({ initialPosts }: Props) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState<string | null>(null);

  async function handleCreatePost(data: CreatePostInput) {
    setFormError(null);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFormError(json.error ?? "Failed to create post");
        return;
      }
      setShowForm(false);
      router.refresh();
    } catch {
      setFormError("An unexpected error occurred. Please try again.");
    }
  }

  async function handlePinToggle(postId: string, currentlyPinned: boolean) {
    setPinLoading(postId);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !currentlyPinned }),
      });
      if (!res.ok) throw new Error("Failed to update pin");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isPinned: !currentlyPinned, pinnedAt: !currentlyPinned ? new Date() : null }
            : p
        )
      );
    } finally {
      setPinLoading(null);
    }
  }

  async function handleImageUpload(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const { key } = await res.json();
    return key;
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Community Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          Create Official Post
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Official Post</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {formError && <p className="text-sm text-red-500 mb-3">{formError}</p>}
            <PostForm
              onSubmit={handleCreatePost}
              submitLabel="Publish as MotoYaar Official"
              loadingLabel="Publishing…"
              onImageUpload={handleImageUpload}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Pin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No posts yet.
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                  {post.title}
                </td>
                <td className="px-4 py-3 text-gray-500">{post.author.name}</td>
                <td className="px-4 py-3">
                  {post.isHidden ? (
                    <span className="flex items-center gap-1 text-gray-400">
                      <EyeOff size={14} /> Hidden
                    </span>
                  ) : post.isPinned ? (
                    <span className="flex items-center gap-1 text-orange-600 font-medium">
                      <Pin size={14} /> Pinned
                    </span>
                  ) : (
                    <span className="text-green-600">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handlePinToggle(post.id, post.isPinned)}
                    disabled={pinLoading === post.id}
                    aria-label={post.isPinned ? "Unpin post" : "Pin post"}
                    className="p-1.5 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {post.isPinned ? (
                      <PinOff size={16} className="text-orange-500" />
                    ) : (
                      <Pin size={16} className="text-gray-400 hover:text-orange-500" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
