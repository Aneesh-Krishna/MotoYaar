import GuestLiveMapView from "./GuestLiveMapView";
import type { LiveTripSession, LiveTripParticipant } from "@/types";

interface SessionResponse extends LiveTripSession {
  participants: LiveTripParticipant[];
}

async function getSession(code: string): Promise<SessionResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/sessions/${code}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function GuestJoinPage({ params }: { params: { code: string } }) {
  const session = await getSession(params.code);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-xl font-semibold text-gray-800">Invite link not found.</p>
        <p className="text-gray-600 mt-2">This invite link may have expired or doesn&apos;t exist.</p>
      </div>
    );
  }

  if (session.status !== "active") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-xl font-semibold text-gray-800">This session has ended.</p>
        <p className="text-gray-600 mt-2">Sessions are only available while active.</p>
      </div>
    );
  }

  return <GuestLiveMapView session={session} code={params.code} />;
}
