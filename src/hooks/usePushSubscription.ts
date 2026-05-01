"use client";

import { useState, useEffect } from "react";

type PermissionState = "granted" | "denied" | "default" | "unsupported";

interface UsePushSubscriptionResult {
  permissionState: PermissionState;
  subscribe: () => Promise<boolean>;
  isSubscribing: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [permissionState, setPermissionState] = useState<PermissionState>("default");
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      setPermissionState("unsupported");
      return;
    }
    setPermissionState(Notification.permission as PermissionState);
  }, []);

  const subscribe = async (): Promise<boolean> => {
    if (permissionState === "unsupported") return false;

    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PermissionState);
      if (permission !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID public key not configured");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, keys }),
      });

      return res.ok;
    } catch {
      return false;
    } finally {
      setIsSubscribing(false);
    }
  };

  return { permissionState, subscribe, isSubscribing };
}
