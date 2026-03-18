// ─── Client-side (browser) ─────────────────────────────────────────────────
// Note: call this only in a "use client" component after user grants permission

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ─── Server-side ────────────────────────────────────────────────────────────
// Import web-push only on server side

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export interface StoredPushSubscription {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

/**
 * Sends a push notification to a stored subscription.
 * SERVER-SIDE ONLY — must not be called from client bundles.
 */
export async function sendPushNotification(
  subscription: StoredPushSubscription,
  payload: PushPayload
): Promise<void> {
  const webpush = await import("web-push");
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dhKey,
        auth: subscription.authKey,
      },
    },
    JSON.stringify(payload)
  );
}
