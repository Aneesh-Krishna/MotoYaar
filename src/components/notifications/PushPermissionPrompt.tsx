"use client";

import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Bell } from "lucide-react";

interface PushPermissionPromptProps {
  onComplete: () => void;
}

export function PushPermissionPrompt({ onComplete }: PushPermissionPromptProps) {
  const { subscribe, dismiss, isSubscribing } = usePushSubscription();

  const handleEnable = async () => {
    await subscribe();
    onComplete();
  };

  const handleNotNow = () => {
    dismiss();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Bell className="text-orange-500" size={24} />
          </div>
        </div>
        <h2 className="text-lg font-bold text-gray-900 text-center">
          Stay on top of your documents
        </h2>
        <p className="text-sm text-gray-500 text-center mt-2">
          Enable push notifications to get expiry alerts before your documents expire.
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={handleEnable}
            disabled={isSubscribing}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubscribing ? "Enabling..." : "Enable"}
          </button>
          <button
            onClick={handleNotNow}
            className="w-full text-gray-500 py-2 text-sm"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
