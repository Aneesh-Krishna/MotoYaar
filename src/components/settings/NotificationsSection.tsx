"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { updateSettings } from "@/services/api/userApi";
import { toast } from "sonner";

// ─── Expiry Window ────────────────────────────────────────────────────────────

function ExpiryWindowSetting({ value }: { value: number }) {
  const [days, setDays] = useState(value);

  const handleBlur = async () => {
    const previousDays = days;
    const clamped = Math.min(90, Math.max(7, days));
    setDays(clamped);
    try {
      await updateSettings({ notificationWindowDays: clamped });
    } catch {
      setDays(previousDays);
      toast.error("Failed to save expiry window");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-sm font-medium text-gray-900">Expiry alert window</p>
        <p className="text-xs text-gray-500">Get warned this many days before expiry</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={7}
          max={90}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-16 border border-gray-300 rounded-lg text-center text-sm py-1.5"
          aria-label="Expiry alert window in days"
        />
        <span className="text-xs text-gray-500">days</span>
      </div>
    </div>
  );
}

// ─── Push Notifications ───────────────────────────────────────────────────────

function PushNotificationSetting() {
  const { permissionState, subscribe, isSubscribing } = usePushSubscription();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  useEffect(() => {
    fetch("/api/push/status")
      .then((r) => r.json())
      .then((d: { hasSubscription: boolean }) => setIsEnabled(d.hasSubscription))
      .catch(() => {});
  }, []);

  const handleToggle = async (on: boolean) => {
    if (on) {
      const success = await subscribe();
      setIsEnabled(success);
      if (!success) toast.error("Failed to enable push notifications");
    } else {
      setIsUnsubscribing(true);
      try {
        await fetch("/api/push/unsubscribe", { method: "DELETE" });
        setIsEnabled(false);
      } catch {
        toast.error("Failed to disable push notifications");
      } finally {
        setIsUnsubscribing(false);
      }
    }
  };

  const permissionLabel: Record<string, string> = {
    granted: "Permission granted",
    denied: "Blocked in browser — change in browser settings",
    default: "Not yet requested",
    unsupported: "Not supported on this device",
  };

  return (
    <div className="flex items-start justify-between px-4 py-4">
      <div>
        <p className="text-sm font-medium text-gray-900">Push notifications</p>
        <p className="text-xs text-gray-500">{permissionLabel[permissionState] ?? ""}</p>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={
          permissionState === "denied" ||
          permissionState === "unsupported" ||
          isSubscribing ||
          isUnsubscribing
        }
        aria-label="Toggle push notifications"
      />
    </div>
  );
}

// ─── Email Notifications ──────────────────────────────────────────────────────

function EmailNotificationSetting({
  enabled,
}: {
  enabled: boolean;
}) {
  const [isEnabled, setIsEnabled] = useState(enabled);

  const handleToggle = async (on: boolean) => {
    setIsEnabled(on);
    try {
      await updateSettings({ emailNotificationsEnabled: on });
    } catch {
      setIsEnabled(!on);
      toast.error("Failed to update email notification preference");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-sm font-medium text-gray-900">Email notifications</p>
        <p className="text-xs text-gray-500">Document expiry reminders via email</p>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        aria-label="Toggle email notifications"
      />
    </div>
  );
}

// ─── Notifications Section ────────────────────────────────────────────────────

interface Props {
  notificationWindowDays: number;
  emailNotificationsEnabled: boolean;
}

export function NotificationsSection({ notificationWindowDays, emailNotificationsEnabled }: Props) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 bg-gray-50 rounded-t-xl">
        Notifications
      </h2>
      <div className="bg-white divide-y divide-gray-100 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
        <ExpiryWindowSetting value={notificationWindowDays} />
        <PushNotificationSetting />
        <EmailNotificationSetting enabled={emailNotificationsEnabled} />
      </div>
    </section>
  );
}
