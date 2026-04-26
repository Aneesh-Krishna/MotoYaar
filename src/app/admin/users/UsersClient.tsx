"use client";

import { Fragment, useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

function parseEmails(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

function InviteSection() {
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    alreadyRegistered: number;
    invalid: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emails = parseEmails(emailInput);
    if (emails.length === 0) return;

    setSending(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to send invites");
      }
      setResult(await res.json());
      setEmailInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invites");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Invite Beta Users</h2>
      <p className="mb-4 text-sm text-gray-500">
        Enter email addresses (one per line or comma-separated):
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          disabled={sending}
          rows={5}
          placeholder={"alice@example.com\nbob@example.com, charlie@example.com"}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || emailInput.trim().length === 0}
          className="mt-3 flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send Invites
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="font-medium text-green-700">✓ Sent: {result.sent}</span>
          <span className="font-medium text-amber-700">
            ⚠ Already registered: {result.alreadyRegistered}
          </span>
          <span className="font-medium text-red-600">✗ Invalid: {result.invalid}</span>
          {result.failed > 0 && (
            <span className="font-medium text-gray-500">Failed: {result.failed}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface UserSummary {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  status: string;
  suspendedUntil: string | null;
  createdAt: string;
  vehicleCount: number;
  postCount: number;
}

interface UserDetail extends UserSummary {}

type PendingAction = "warn" | "suspend" | "ban" | "lift" | "unban" | "relink" | null;

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  warned: "bg-amber-100 text-amber-700",
  suspended: "bg-orange-100 text-orange-700",
  banned: "bg-red-100 text-red-700",
};

export function UsersClient() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<UserSummary | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [suspendDays, setSuspendDays] = useState(7);
  const [googleId, setGoogleId] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const delay = query === "" ? 0 : 300;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function toggleExpand(userId: string) {
    if (expandedId === userId) {
      setExpandedId(null);
      setDetail(null);
      setDetailError(null);
      return;
    }
    setExpandedId(userId);
    setDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error(`Failed to load user detail (${res.status})`);
      const data = await res.json();
      setDetail(data as UserDetail);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Failed to load detail");
    } finally {
      setLoadingDetail(false);
    }
  }

  function openAction(user: UserSummary, action: PendingAction) {
    setTargetUser(user);
    setPendingAction(action);
    setActionError(null);
    setSuspendDays(7);
    setGoogleId("");
  }

  function closeAction() {
    if (acting) return;
    setPendingAction(null);
    setTargetUser(null);
    setActionError(null);
  }

  async function confirmAction() {
    if (!targetUser || !pendingAction) return;
    setActing(true);
    setActionError(null);
    try {
      const body: Record<string, unknown> = { action: pendingAction };
      if (pendingAction === "suspend") body.suspendDays = suspendDays;
      if (pendingAction === "relink") body.googleId = googleId;

      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Action failed");
      }

      const listRes = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      const listData = await listRes.json();
      setUsers(Array.isArray(listData) ? listData : []);

      if (expandedId === targetUser.id) {
        try {
          const detailRes = await fetch(`/api/admin/users/${targetUser.id}`);
          if (detailRes.ok) setDetail((await detailRes.json()) as UserDetail);
        } catch {
          // non-critical — main list already refreshed
        }
      }

      setPendingAction(null);
      setTargetUser(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, email, or username…"
        aria-label="Search users"
        className="mb-6 w-full max-w-md rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-gray-500">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Vehicles</th>
                <th className="px-4 py-3 text-right">Posts</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <Fragment key={user.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {user.name}
                      {user.username && (
                        <span className="ml-1 text-xs text-gray-400">@{user.username}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{user.vehicleCount}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{user.postCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[user.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {user.status}
                        {user.status === "suspended" && user.suspendedUntil
                          ? ` until ${new Date(user.suspendedUntil).toLocaleDateString()}`
                          : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(user.status === "active" || user.status === "warned") && (
                          <>
                            <ActionBtn variant="amber" onClick={() => openAction(user, "warn")}>
                              Warn
                            </ActionBtn>
                            <ActionBtn variant="orange" onClick={() => openAction(user, "suspend")}>
                              Suspend
                            </ActionBtn>
                            <ActionBtn variant="red" onClick={() => openAction(user, "ban")}>
                              Ban
                            </ActionBtn>
                          </>
                        )}
                        {user.status === "suspended" && (
                          <>
                            <ActionBtn variant="green" onClick={() => openAction(user, "lift")}>
                              Lift
                            </ActionBtn>
                            <ActionBtn variant="red" onClick={() => openAction(user, "ban")}>
                              Ban
                            </ActionBtn>
                          </>
                        )}
                        {user.status === "banned" && (
                          <ActionBtn variant="green" onClick={() => openAction(user, "unban")}>
                            Unban
                          </ActionBtn>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(user.id)}
                        className="rounded-lg border border-gray-200 p-1 text-gray-400 hover:bg-gray-100"
                        aria-label="Toggle detail"
                      >
                        {expandedId === user.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedId === user.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-6 py-4">
                        {loadingDetail ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : detailError ? (
                          <p className="text-sm text-red-600">{detailError}</p>
                        ) : detail ? (
                          <div className="flex flex-wrap items-center gap-8">
                            {detail.status === "suspended" && detail.suspendedUntil && (
                              <Stat
                                label="Suspended until"
                                value={new Date(detail.suspendedUntil).toLocaleDateString()}
                              />
                            )}
                            <button
                              onClick={() => openAction(user, "relink")}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            >
                              Re-link Google
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Warn */}
      <SimpleConfirm
        open={pendingAction === "warn"}
        title="Warn user?"
        description={`Send an official warning to ${targetUser?.name}.`}
        confirmLabel="Send Warning"
        isDestructive={false}
        loading={acting}
        error={actionError}
        onClose={closeAction}
        onConfirm={confirmAction}
      />

      {/* Suspend */}
      <DialogPrimitive.Root
        open={pendingAction === "suspend"}
        onOpenChange={(v) => !v && closeAction()}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
              Suspend user?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm text-gray-600">
              How many days should {targetUser?.name} be suspended?
            </DialogPrimitive.Description>
            <input
              type="number"
              min={1}
              value={suspendDays}
              onChange={(e) => setSuspendDays(Math.max(1, Number(e.target.value)))}
              disabled={acting}
              className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
            />
            {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeAction}
                disabled={acting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={acting}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {acting && <Loader2 className="h-4 w-4 animate-spin" />}
                Suspend {suspendDays} day{suspendDays !== 1 ? "s" : ""}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Ban */}
      <SimpleConfirm
        open={pendingAction === "ban"}
        title="Ban user permanently?"
        description={`${targetUser?.name}'s account will be permanently banned.`}
        confirmLabel="Ban User"
        loading={acting}
        error={actionError}
        onClose={closeAction}
        onConfirm={confirmAction}
      />

      {/* Lift */}
      <SimpleConfirm
        open={pendingAction === "lift"}
        title="Lift suspension?"
        description={`${targetUser?.name}'s suspension will be lifted immediately.`}
        confirmLabel="Lift Suspension"
        isDestructive={false}
        loading={acting}
        error={actionError}
        onClose={closeAction}
        onConfirm={confirmAction}
      />

      {/* Unban */}
      <SimpleConfirm
        open={pendingAction === "unban"}
        title="Unban user?"
        description={`${targetUser?.name}'s account will be restored to active.`}
        confirmLabel="Unban"
        isDestructive={false}
        loading={acting}
        error={actionError}
        onClose={closeAction}
        onConfirm={confirmAction}
      />

      <InviteSection />

      {/* Re-link Google */}
      <DialogPrimitive.Root
        open={pendingAction === "relink"}
        onOpenChange={(v) => !v && closeAction()}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
              Re-link Google account
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm text-gray-600">
              Enter the new Google account ID for {targetUser?.name}.
            </DialogPrimitive.Description>
            <input
              type="text"
              value={googleId}
              onChange={(e) => setGoogleId(e.target.value)}
              disabled={acting}
              placeholder="Google account ID"
              className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            />
            {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeAction}
                disabled={acting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={acting || !googleId.trim()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {acting && <Loader2 className="h-4 w-4 animate-spin" />}
                Re-link
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: "amber" | "orange" | "red" | "green";
}) {
  const styles = {
    amber: "border border-amber-300 text-amber-700 hover:bg-amber-50",
    orange: "border border-orange-300 text-orange-700 hover:bg-orange-50",
    red: "bg-red-600 text-white hover:bg-red-700",
    green: "bg-green-600 text-white hover:bg-green-700",
  };
  return (
    <button onClick={onClick} className={`rounded-lg px-2 py-1 text-xs font-medium ${styles[variant]}`}>
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

interface SimpleConfirmProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isDestructive?: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

function SimpleConfirm({
  open,
  title,
  description,
  confirmLabel,
  isDestructive = true,
  loading,
  error,
  onClose,
  onConfirm,
}: SimpleConfirmProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
          <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-gray-600">
            {description}
          </DialogPrimitive.Description>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
