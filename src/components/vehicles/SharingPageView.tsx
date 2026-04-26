"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Clock, CheckCircle2, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Vehicle } from "@/types";
import type { VehicleInviteRecord, VehicleAccessRecord } from "@/services/vehicleInviteService";

interface Props {
  vehicle: Vehicle;
  access: VehicleAccessRecord[];
  pendingInvites: VehicleInviteRecord[];
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function SharingPageView({ vehicle, access, pendingInvites }: Props) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<VehicleAccessRecord | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<VehicleInviteRecord | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, inviteeEmail: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error?.message ?? "Failed to send invite. Try again.");
        return;
      }

      toast.success(`Invite sent to ${email.trim()}`);
      setEmail("");
      router.refresh();
    } catch {
      toast.error("Failed to send invite. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      const res = await fetch(`/api/invites/access/${revokeTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error?.message ?? "Failed to revoke access. Try again.");
        return;
      }
      toast.success(`Access revoked for ${revokeTarget.userName ?? revokeTarget.userEmail ?? "user"}`);
      setRevokeTarget(null);
      router.refresh();
    } catch {
      toast.error("Failed to revoke access. Try again.");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCancelInvite = async () => {
    if (!cancelTarget) return;
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/invites/${cancelTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error?.message ?? "Failed to cancel invite. Try again.");
        return;
      }
      toast.success(`Invite cancelled for ${cancelTarget.inviteeEmail}`);
      setCancelTarget(null);
      router.refresh();
    } catch {
      toast.error("Failed to cancel invite. Try again.");
    } finally {
      setIsCanceling(false);
    }
  };

  const focusInviteForm = () => {
    emailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    emailRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Manage Sharing</h1>
          <p className="text-xs text-gray-500">{vehicle.name}</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Invite Form */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} className="text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-900">Invite to view</h2>
          </div>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
            />
            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Sending…" : "Invite"}
            </button>
          </form>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-orange-500" />
              <h2 className="text-sm font-semibold text-gray-900">Pending invites</h2>
            </div>
            <ul className="space-y-3">
              {pendingInvites.map((invite) => {
                const days = daysUntil(invite.expiresAt);
                return (
                  <li key={invite.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">{invite.inviteeEmail}</p>
                      <p className="text-xs text-gray-400">
                        {days === 0 ? "Expires today" : `Expires in ${days} day${days === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setCancelTarget(invite)}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Active Access */}
        {access.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} className="text-green-500" />
              <h2 className="text-sm font-semibold text-gray-900">Who has access</h2>
            </div>
            <ul className="space-y-3">
              {access.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 font-medium truncate">
                      {entry.userName ?? entry.userEmail ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.accessLevel === "view" ? "View access" : entry.accessLevel} · Granted{" "}
                      {new Date(entry.grantedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => setRevokeTarget(entry)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {pendingInvites.length === 0 && access.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-3">
            <Users size={32} className="text-gray-300" />
            <p className="text-sm text-gray-500">
              No one has been invited yet. Send an invite above to share this vehicle.
            </p>
          </div>
        )}

        {/* Invite another person CTA */}
        <button
          onClick={focusInviteForm}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-medium text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
        >
          <UserPlus size={16} />
          Invite another person
        </button>
      </div>

      {/* Revoke Access Modal */}
      <ConfirmModal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke access"
        description={
          revokeTarget
            ? `Remove access for ${revokeTarget.userName ?? revokeTarget.userEmail ?? "this user"}? They will no longer be able to view ${vehicle.name}.`
            : ""
        }
        confirmLabel="Revoke"
        isDestructive
        isLoading={isRevoking}
      />

      {/* Cancel Invite Modal */}
      <ConfirmModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelInvite}
        title="Cancel invite"
        description={
          cancelTarget
            ? `Cancel the invite sent to ${cancelTarget.inviteeEmail}? They won't be able to use this invite link.`
            : ""
        }
        confirmLabel="Cancel invite"
        cancelLabel="Keep"
        isDestructive
        isLoading={isCanceling}
      />
    </div>
  );
}
