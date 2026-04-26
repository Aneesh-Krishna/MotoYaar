"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { ReportedPost } from "@/services/adminService";

interface Props {
  post: ReportedPost;
  adminId: string;
}

type PostAction = "remove" | null;
type UserAction = "warn" | "ban" | null;

export function ReportedPostCard({ post }: Props) {
  const router = useRouter();
  const [postAction, setPostAction] = useState<PostAction>(null);
  const [userAction, setUserAction] = useState<UserAction>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendDays, setSuspendDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patchPost(action: "restore" | "remove") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Action failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
      setPostAction(null);
    }
  }

  async function patchUser(action: "warn" | "suspend" | "ban", days?: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${post.author.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, suspendDays: days }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Action failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
      setUserAction(null);
      setSuspendOpen(false);
    }
  }

  const reasonsLabel = Object.entries(post.reasonBreakdown)
    .map(([r, n]) => `${r.charAt(0).toUpperCase() + r.slice(1)} ×${n}`)
    .join(", ");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="truncate text-base font-semibold text-gray-900">{post.title}</h2>
            {post.isHidden && (
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Hidden
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            by {post.author.name}
            {post.author.email ? ` (${post.author.email})` : ""}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {post.reportCount} report{post.reportCount !== 1 ? "s" : ""}
            {reasonsLabel ? ` — ${reasonsLabel}` : ""}
          </p>
          <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
            {post.descriptionPreview}
            {post.descriptionPreview.length >= 200 && (
              <span className="text-gray-400">…</span>
            )}
          </p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            onClick={() => patchPost("restore")}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Restore"}
          </button>
          <button
            onClick={() => setPostAction("remove")}
            disabled={loading}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Remove Post
          </button>
          <button
            onClick={() => setUserAction("warn")}
            disabled={loading}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
          >
            Warn User
          </button>
          <button
            onClick={() => setSuspendOpen(true)}
            disabled={loading}
            className="rounded-lg border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
          >
            Suspend User
          </button>
          <button
            onClick={() => setUserAction("ban")}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Ban User
          </button>
        </div>
      </div>

      <ConfirmModal
        open={postAction === "remove"}
        onClose={() => setPostAction(null)}
        onConfirm={() => patchPost("remove")}
        title="Remove post?"
        description={`This will permanently delete "${post.title}" and cannot be undone.`}
        confirmLabel="Remove"
        isLoading={loading}
      />

      <ConfirmModal
        open={userAction === "warn"}
        onClose={() => setUserAction(null)}
        onConfirm={() => patchUser("warn")}
        title="Warn user?"
        description={`Send an official warning to ${post.author.name} for violating community guidelines.`}
        confirmLabel="Send Warning"
        isDestructive={false}
        isLoading={loading}
      />

      <ConfirmModal
        open={userAction === "ban"}
        onClose={() => setUserAction(null)}
        onConfirm={() => patchUser("ban")}
        title="Ban user permanently?"
        description={`${post.author.name}'s account will be permanently banned. This cannot be undone.`}
        confirmLabel="Ban User"
        isLoading={loading}
      />

      <DialogPrimitive.Root open={suspendOpen} onOpenChange={(v) => !v && setSuspendOpen(false)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            onInteractOutside={(e) => loading && e.preventDefault()}
            onEscapeKeyDown={(e) => loading && e.preventDefault()}
            className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
              Suspend user?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm text-gray-600">
              How many days should {post.author.name} be suspended?
            </DialogPrimitive.Description>
            <input
              type="number"
              min={1}
              value={suspendDays}
              onChange={(e) => setSuspendDays(Math.max(1, Number(e.target.value)))}
              disabled={loading}
              className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSuspendOpen(false)}
                disabled={loading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => patchUser("suspend", suspendDays)}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Suspend {suspendDays} day{suspendDays !== 1 ? "s" : ""}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
