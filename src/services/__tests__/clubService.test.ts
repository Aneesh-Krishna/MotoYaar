import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError, BadRequestError } from "@/lib/errors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockFindFirst,
  mockFindMany,
  mockInsert,
  mockValues,
  mockReturning,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockSelect,
  makeSelectChain,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: vi.fn() });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

  const mockFindFirst = vi.fn();
  const mockFindMany = vi.fn();

  // Chainable select mock
  const mockSelectWhere = vi.fn();
  const makeSelectChain = (data: unknown[]) => ({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(data),
      }),
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(data),
            }),
          }),
        }),
      }),
      where: vi.fn().mockResolvedValue(data),
    }),
  });
  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({ where: mockSelectWhere }),
      where: mockSelectWhere,
    }),
  });

  return {
    mockFindFirst,
    mockFindMany,
    mockInsert,
    mockValues,
    mockReturning,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockSelect,
    makeSelectChain,
  };
});

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      clubs: { findFirst: mockFindFirst, findMany: mockFindMany },
      clubMembers: { findFirst: mockFindFirst, findMany: mockFindMany },
      users: { findFirst: mockFindFirst },
      posts: { findFirst: mockFindFirst },
    },
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  clubs: {},
  clubMembers: {},
  posts: {},
  users: {},
  notifications: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", args })),
  or: vi.fn((...args) => ({ type: "or", args })),
  sql: vi.fn().mockReturnValue({}),
  ilike: vi.fn(),
  isNull: vi.fn(),
  desc: vi.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { clubService } from "@/services/clubService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClub(overrides = {}) {
  return {
    id: "club-1",
    name: "Pune Riders",
    city: "Pune",
    description: null,
    logoUrl: null,
    inviteCode: "ABCD1234",
    joinPolicy: "approval",
    createdBy: "user-1",
    createdAt: new Date("2026-01-01"),
    memberCount: 1,
    ...overrides,
  };
}

function makeMember(overrides = {}) {
  return {
    id: "member-1",
    clubId: "club-1",
    userId: "user-1",
    role: "admin",
    status: "active",
    joinedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("clubService.create", () => {
  it("creates a club and adds creator as admin", async () => {
    // No name conflict
    mockFindFirst.mockResolvedValueOnce(null);
    // No invite code conflict
    mockFindFirst.mockResolvedValueOnce(null);
    const club = makeClub();
    mockReturning.mockResolvedValueOnce([club]);
    // Insert club member
    mockReturning.mockResolvedValueOnce([makeMember()]);

    const result = await clubService.create("user-1", {
      name: "Pune Riders",
      city: "Pune",
      joinPolicy: "approval",
    });

    expect(result.name).toBe("Pune Riders");
    expect(result.memberCount).toBe(1);
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("throws ConflictError if name already exists", async () => {
    mockFindFirst.mockResolvedValueOnce(makeClub());
    await expect(
      clubService.create("user-1", { name: "Pune Riders", city: "Pune", joinPolicy: "approval" })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("clubService.joinViaCode — open policy (AC: 4)", () => {
  it("auto-approves member when join_policy is open", async () => {
    const club = makeClub({ joinPolicy: "open" });
    // resolveJoinLink — select chain
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([club]),
      }),
    });
    // no existing membership
    mockFindFirst.mockResolvedValueOnce(null);
    // insert member
    mockReturning.mockResolvedValueOnce([makeMember({ role: "member", status: "active" })]);

    const result = await clubService.joinViaCode("ABCD1234", "user-2");
    expect(result.status).toBe("active");
  });
});

describe("clubService.joinViaCode — approval policy (AC: 4)", () => {
  it("sets status to pending when join_policy is approval", async () => {
    const club = makeClub({ joinPolicy: "approval" });
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([club]),
      }),
    });
    // no existing membership
    mockFindFirst.mockResolvedValueOnce(null);
    // insert member + find admins for notification
    mockReturning.mockResolvedValueOnce([makeMember({ role: "member", status: "pending" })]);
    // getAdmins call
    mockFindMany.mockResolvedValueOnce([makeMember({ userId: "user-1" })]);
    // applicant user name
    mockFindFirst.mockResolvedValueOnce({ name: "New User" });
    // insert notification
    mockReturning.mockResolvedValueOnce([]);

    const result = await clubService.joinViaCode("ABCD1234", "user-2");
    expect(result.status).toBe("pending");
  });

  it("throws ConflictError if already active member", async () => {
    const club = makeClub({ joinPolicy: "approval" });
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([club]),
      }),
    });
    mockFindFirst.mockResolvedValueOnce(makeMember({ userId: "user-1", status: "active" }));
    await expect(clubService.joinViaCode("ABCD1234", "user-1")).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("clubService.getClubPosts — club posts not in main feed (AC: 7, 8)", () => {
  it("only returns posts for active members", async () => {
    // assertActiveMember
    mockFindFirst.mockResolvedValueOnce(makeMember({ userId: "user-1", status: "active" }));
    // select posts
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }),
    });

    const result = await clubService.getClubPosts("club-1", "user-1", 1);
    expect(result.posts).toEqual([]);
  });

  it("throws ForbiddenError for non-members", async () => {
    mockFindFirst.mockResolvedValueOnce(null); // not a member
    await expect(clubService.getClubPosts("club-1", "user-99", 1)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("clubService.memberAction", () => {
  it("approves a pending member", async () => {
    // assertAdmin
    mockFindFirst.mockResolvedValueOnce(makeMember({ role: "admin", status: "active" }));
    // target member
    mockFindFirst.mockResolvedValueOnce(makeMember({ id: "member-2", userId: "user-2", role: "member", status: "pending" }));
    // update
    mockUpdateWhere.mockResolvedValueOnce([]);

    await expect(clubService.memberAction("club-1", "user-1", "user-2", "approve")).resolves.toBeUndefined();
  });

  it("throws if acting on self", async () => {
    mockFindFirst.mockResolvedValueOnce(makeMember({ role: "admin", status: "active" }));
    await expect(clubService.memberAction("club-1", "user-1", "user-1", "remove")).rejects.toBeInstanceOf(BadRequestError);
  });

  it("throws ForbiddenError if not admin", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    await expect(clubService.memberAction("club-1", "user-2", "user-3", "approve")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
