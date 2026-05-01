// TODO: Full implementation in Story 7.x — Admin

export interface AdminPost {
  id: string;
  userId: string;
  title: string;
  description: string;
  isPinned: boolean;
  isHidden: boolean;
  score: number;
  createdAt: string;
  author: { id: string; name: string; email?: string | null };
}

export interface ReportedPost {
  id: string;
  postId: string;
  reporterUserId: string;
  reason: string;
  description: string | null;
  createdAt: string;
  title: string;
  isHidden: boolean;
  descriptionPreview: string;
  reportCount: number;
  reasonBreakdown: Record<string, number>;
  author: { id: string; name: string; email?: string | null };
}

export interface AdminUser {
  id: string;
  name: string;
  email?: string | null;
  googleId: string;
  username: string | null;
  status: string;
  vehicleCount: number;
  postCount: number;
  createdAt: string;
}

export const adminService = {
  async login(_email: string, _password: string): Promise<{ id: string; email: string }> {
    throw new Error("Invalid credentials");
  },

  async getAllPosts(): Promise<AdminPost[]> {
    return [];
  },

  async listPosts(): Promise<AdminPost[]> {
    return [];
  },

  async getPost(_postId: string): Promise<AdminPost | null> {
    return null;
  },

  async restorePost(_postId: string, _adminId: string): Promise<void> {},

  async removePost(_postId: string, _adminId: string): Promise<void> {},

  async getReportedPosts(): Promise<ReportedPost[]> {
    return [];
  },

  async listReportedPosts(): Promise<ReportedPost[]> {
    return [];
  },

  async hidePost(_postId: string): Promise<void> {},

  async listUsers(): Promise<AdminUser[]> {
    return [];
  },

  async searchUsers(_query: string): Promise<AdminUser[]> {
    return [];
  },

  async getUser(_userId: string): Promise<AdminUser> {
    throw new Error("Not implemented");
  },

  async suspendUser(_userId: string, _days: number, _adminId?: string): Promise<void> {},

  async unsuspendUser(_userId: string): Promise<void> {},

  async banUser(_userId: string, _adminId?: string): Promise<void> {},

  async updateUserStatus(
    _userId: string,
    _action: "warn" | "suspend" | "ban" | "lift" | "unban" | "relink",
    _opts?: { suspendDays?: number; googleId?: string; adminId?: string }
  ): Promise<void> {},

  async getAnalytics(): Promise<Record<string, unknown>> {
    return {};
  },

  async _getParseSuccessRate(_since: Date): Promise<number> {
    return 100;
  },

  async _getWeeklySignups(_since: Date): Promise<Array<{ week: string; count: number }>> {
    return [];
  },

  async _getWeeklyActivity(_since: Date): Promise<unknown[]> {
    return [];
  },

  async bulkInviteUsers(
    _emails: string[],
    _adminId?: string
  ): Promise<{ sent: number; alreadyRegistered: number; invalid: number; failed: number }> {
    return { sent: 0, alreadyRegistered: 0, invalid: 0, failed: 0 };
  },
};
