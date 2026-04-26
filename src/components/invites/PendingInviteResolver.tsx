"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const COOKIE_NAME = "pending_invite_token";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function PendingInviteResolver() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user.id || !session.user.username) return;

    const pendingToken = readCookie(COOKIE_NAME);
    if (!pendingToken) return;

    clearCookie(COOKIE_NAME);

    if (!UUID_RE.test(pendingToken)) return;

    fetch(`/api/invites/${pendingToken}/accept`, { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          const { vehicleId } = await res.json();
          window.location.href = `/garage/${vehicleId}`;
        } else if (res.status === 410) {
          toast.error("The invite link has expired. Ask the vehicle owner to resend it.");
          window.location.href = "/garage";
        }
      })
      .catch(() => {});
  }, [session?.user.id, session?.user.username]);

  return null;
}
