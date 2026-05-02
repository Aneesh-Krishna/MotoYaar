import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockSignIn } = vi.hoisted(() => ({ mockSignIn: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn: mockSignIn }));

import { LoginPromptModal } from "@/components/community/LoginPromptModal";

describe("LoginPromptModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default message", () => {
    render(<LoginPromptModal open={true} onOpenChange={() => {}} />);
    expect(screen.getByText("Sign in with Google to join the conversation")).toBeInTheDocument();
    expect(screen.getByText("Join the conversation")).toBeInTheDocument();
  });

  it("renders with custom message prop", () => {
    render(
      <LoginPromptModal
        open={true}
        onOpenChange={() => {}}
        message="Sign in to like posts"
      />
    );
    expect(screen.getByText("Sign in to like posts")).toBeInTheDocument();
  });

  it("calls signIn with Google provider when button clicked", async () => {
    render(<LoginPromptModal open={true} onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));
    expect(mockSignIn).toHaveBeenCalledWith(
      "google",
      expect.objectContaining({ callbackUrl: expect.any(String) })
    );
  });

  it("does not render content when open=false", () => {
    render(<LoginPromptModal open={false} onOpenChange={() => {}} />);
    expect(screen.queryByText("Join the conversation")).not.toBeInTheDocument();
  });
});
