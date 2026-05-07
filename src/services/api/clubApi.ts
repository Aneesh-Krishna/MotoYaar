import type { Club, ClubMember, FeedPost } from "@/types";
import type { CreateClubInput, UpdateClubInput } from "@/lib/validations/club";

export async function listClubs(search?: string): Promise<Club[]> {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  const res = await fetch(`/api/clubs?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch clubs");
  return res.json();
}

export async function createClub(data: CreateClubInput): Promise<Club> {
  const res = await fetch("/api/clubs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to create club");
  }
  return res.json();
}

export async function getClub(id: string): Promise<Club> {
  const res = await fetch(`/api/clubs/${id}`);
  if (!res.ok) throw new Error("Failed to fetch club");
  return res.json();
}

export async function updateClub(id: string, data: UpdateClubInput): Promise<Club> {
  const res = await fetch(`/api/clubs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to update club");
  }
  return res.json();
}

export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  const res = await fetch(`/api/clubs/${clubId}/members`);
  if (!res.ok) throw new Error("Failed to fetch members");
  return res.json();
}

export async function memberAction(
  clubId: string,
  userId: string,
  action: "approve" | "reject" | "remove" | "promote"
): Promise<void> {
  const res = await fetch(`/api/clubs/${clubId}/members/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error("Failed to perform member action");
}

export async function resolveJoinLink(code: string): Promise<Club> {
  const res = await fetch(`/api/clubs/join/${code}`);
  if (!res.ok) throw new Error("Invalid invite link");
  return res.json();
}

export async function joinClub(code: string): Promise<{ status: "active" | "pending" }> {
  const res = await fetch(`/api/clubs/join/${code}`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to join club");
  }
  return res.json();
}

export async function joinClubById(clubId: string): Promise<{ status: "active" | "pending" }> {
  const res = await fetch(`/api/clubs/${clubId}/join`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to join club");
  }
  return res.json();
}

export async function getClubPosts(
  clubId: string,
  page = 1
): Promise<{ posts: FeedPost[]; hasMore: boolean }> {
  const res = await fetch(`/api/clubs/${clubId}/posts?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch club posts");
  return res.json();
}
