"use client";
import { useState } from "react";
import type { ParticipantMapState } from "@/types";

interface ParticipantPanelProps {
  participantStates: Map<string, ParticipantMapState>;
  isHost: boolean;
  onEndSession: () => Promise<void>;
  onLeaveSession: () => Promise<void>;
}

export function ParticipantPanel({
  participantStates,
  isHost,
  onEndSession,
  onLeaveSession,
}: ParticipantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleEndSession = async () => {
    setActionLoading(true);
    try {
      await onEndSession();
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveSession = async () => {
    setActionLoading(true);
    try {
      await onLeaveSession();
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeColor = (status: ParticipantMapState["connectionStatus"]) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "stale":
      case "offline":
        return "bg-gray-400";
      case "left":
        return "hidden";
      default:
        return "bg-gray-300";
    }
  };

  const getLastSeenText = (status: ParticipantMapState["connectionStatus"], lastSeen: number | null) => {
    if (status === "active") return null;
    if (!lastSeen) return "Never seen";

    const now = Date.now();
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    if (diffMins === 0) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute bottom-6 right-6 z-20 px-4 py-2 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600"
      >
        {isOpen ? "Hide" : "Show"} Members ({participantStates.size})
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-2xl shadow-xl max-h-96 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-4">Participants</h3>

            <div className="space-y-3 mb-6">
              {Array.from(participantStates.values())
                .filter(state => state.connectionStatus !== "left")
                .map((state) => (
                  <div key={state.userId} className="flex items-center gap-3">
                    {/* Avatar circle */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: state.color }}
                    >
                      {state.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <p className="font-medium">{state.name}</p>
                      <p className="text-xs text-gray-600">
                        {getLastSeenText(state.connectionStatus, state.lastSeen) ?? "Active"}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className={`w-3 h-3 rounded-full ${getStatusBadgeColor(state.connectionStatus)}`} />
                  </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="border-t pt-4">
              {isHost ? (
                <button
                  onClick={handleEndSession}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {actionLoading ? "Ending..." : "End Session"}
                </button>
              ) : (
                <button
                  onClick={handleLeaveSession}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded font-medium hover:bg-gray-600 disabled:opacity-50"
                >
                  {actionLoading ? "Leaving..." : "Leave Session"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
