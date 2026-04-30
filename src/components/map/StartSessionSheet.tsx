"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Copy, Share2 } from "lucide-react";

interface StartSessionSheetProps {
  tripId: string;
  onClose: () => void;
}

export function StartSessionSheet({ tripId, onClose }: StartSessionSheetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleStartSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ inviteCode: string }>(`/trips/${tripId}/session`, {
        method: "POST",
      });
      setInviteCode(response.inviteCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/trips/join/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/trips/join/${inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my live trip session",
          text: "Join me on a live group ride tracking session",
          url: link,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleGoToMap = () => {
    if (inviteCode) {
      router.push(`/trips/join/${inviteCode}/map`);
      onClose();
    }
  };

  if (inviteCode) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end z-50">
        <div className="w-full bg-white rounded-t-2xl p-6 space-y-6 max-h-96">
          <div>
            <h2 className="text-xl font-bold">Group Session Started!</h2>
            <p className="text-gray-600 mt-2">Share this code with your friends</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Invite Code Display */}
          <div className="bg-gray-100 p-4 rounded space-y-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Invite Code</p>
              <p className="text-2xl font-mono font-bold text-center">{inviteCode}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Invite Link</p>
              <p className="text-sm break-all">{window.location.origin}/trips/join/{inviteCode}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50"
            >
              <Copy size={18} />
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600"
            >
              <Share2 size={18} />
              Share
            </button>
          </div>

          {/* Go to Map Button */}
          <button
            onClick={handleGoToMap}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
          >
            Go to Shared Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-2xl p-6 space-y-6 max-h-96">
        <div>
          <h2 className="text-xl font-bold">Start a Group Session</h2>
          <p className="text-gray-600 mt-2">
            Start a group session so friends can see your location in real time.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleStartSession}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Starting..." : "Start Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
