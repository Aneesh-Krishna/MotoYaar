import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockSignIn } = vi.hoisted(() => ({ mockSignIn: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn: mockSignIn }));

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { PostCard } from "@/components/ui/PostCard";
import type { Post } from "@/types";

// ─── Fixture ──────────────────────────────────────────────────────────────────

const POST: Post = {
  id: "post-1",
  userId: "user-1",
  title: "Test Ride Report",
  description: "A great ride through the mountains.",
  images: [],
  links: [],
  tags: [],
  edited: false,
  createdAt: new Date("2026-04-20T10:00:00Z").toISOString(),
  updatedAt: new Date("2026-04-20T10:00:00Z").toISOString(),
  author: { id: "user-1", name: "Alice", username: "alice", profileImageUrl: undefined },
  likes: 5,
  dislikes: 1,
  commentCount: 3,
  userReaction: undefined,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PostCard — guest interaction guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show LoginPromptModal on initial render", () => {
    render(<PostCard post={POST} isAuthenticated={false} />);
    expect(screen.queryByText("Join the conversation")).not.toBeInTheDocument();
  });

  it("shows LoginPromptModal when guest clicks like button", async () => {
    render(<PostCard post={POST} isAuthenticated={false} />);
    await userEvent.click(screen.getByRole("button", { name: /5 likes/i }));
    expect(screen.getByText("Join the conversation")).toBeInTheDocument();
  });

  it("shows LoginPromptModal when guest clicks dislike button", async () => {
    render(<PostCard post={POST} isAuthenticated={false} />);
    await userEvent.click(screen.getByRole("button", { name: /1 dislikes/i }));
    expect(screen.getByText("Join the conversation")).toBeInTheDocument();
  });

  it("does not show LoginPromptModal when authenticated user clicks like", async () => {
    render(<PostCard post={POST} isAuthenticated={true} />);
    await userEvent.click(screen.getByRole("button", { name: /5 likes/i }));
    expect(screen.queryByText("Join the conversation")).not.toBeInTheDocument();
  });
});
