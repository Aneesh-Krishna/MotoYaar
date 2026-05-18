// ─── Enums & Unions ───────────────────────────────────────────────────────────

export type VehicleType = "2-wheeler" | "4-wheeler" | "truck" | "other";

export type DocumentType = "RC" | "Insurance" | "PUC" | "DL" | "Other";

export type DocumentStatus = "valid" | "expiring" | "expired" | "incomplete";

export type ExpenseReason = "Service" | "Fuel" | "Trip" | "Others";

export type PostReactionType = "like" | "dislike";

export type UserStatus = "active" | "warned" | "suspended" | "banned";

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  googleId: string;
  name: string;
  username: string | null;
  bio?: string;
  profileImageUrl?: string;
  instagramLink?: string;
  currency: string; // default "INR"
  notificationWindowDays: number; // default 30
  status: UserStatus;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  type: VehicleType;
  company?: string;
  model?: string;
  variant?: string;
  color?: string;
  registrationNumber: string;
  purchasedAt?: string;
  previousOwners: number;
  imageUrl?: string;
  createdAt: string;
  // Computed / joined
  totalSpend?: number;
  nextDocumentExpiry?: string;
  nextDocumentStatus?: DocumentStatus;
}

export interface Document {
  id: string;
  vehicleId?: string;
  userId: string;
  type: DocumentType;
  label?: string;
  expiryDate?: string;
  storageUrl?: string;
  storageKey?: string;
  parseStatus: "parsed" | "manual" | "incomplete";
  status: DocumentStatus;
  createdAt: string;
}

export interface Expense {
  id: string;
  vehicleId?: string;
  userId: string;
  tripId?: string;
  price: number;
  currency: string;
  date: string;
  reason: ExpenseReason;
  whereText?: string;
  comment?: "Overpriced" | "Average" | "Underpriced";
  receiptUrl?: string;
  receiptKey?: string;
  litresFilled?: number;
  odometerKm?: number;
  kmpl?: number;
  serviceCenterId?: string;
  fuelStationId?: string;
  createdAt: string;
}

export interface ServiceCenter {
  id: string;
  name: string;
  city: string;
  pincode?: string;
  createdBy?: string;
  avgRating?: number;
  reviewCount: number;
  googlePlaceId?: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  createdAt: string;
}

export interface FuelStation {
  id: string;
  googlePlaceId: string;
  name: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface ServiceCenterReview {
  id: string;
  serviceCenterId: string;
  userId: string;
  rating: number;
  reviewText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripBreakdownItem {
  category: "Food" | "Fuel" | "Stay" | "Toll" | "Other";
  amount: number;
}

export interface Trip {
  id: string;
  userId: string;
  vehicleId?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  routeText?: string;
  mapsLink?: string;
  timeTaken?: string;
  breakdown: TripBreakdownItem[];
  totalCost?: number;
  createdAt: string;
  // Joined
  vehicle?: Pick<Vehicle, "id" | "name" | "registrationNumber">;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  description: string;
  images: string[];
  links: string[];
  tags: string[];
  edited: boolean;
  isPinned?: boolean;
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined
  author?: Pick<User, "id" | "name" | "username" | "profileImageUrl">;
  likes: number;
  dislikes: number;
  commentCount: number;
  userReaction?: PostReactionType;
}

export interface Comment {
  id: string;
  postId: string;
  parentCommentId?: string;
  userId: string;
  content: string;
  deleted?: boolean;
  score: number;
  userVote?: "up" | "down";
  createdAt: string;
  author?: Pick<User, "id" | "name" | "username" | "profileImageUrl">;
  replies?: Comment[];
}

export interface VehicleInvite {
  id: string;
  vehicleId: string;
  ownerUserId: string;
  inviteeEmail: string;
  inviteeUserId?: string;
  status: InviteStatus;
  expiresAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | "document_expiry_warning"
    | "document_expired"
    | "ai_report_ready"
    | "vehicle_access_revoked"
    | "service_reminder"
    | "warned"
    | "suspended"
    | "group_expense_invite"
    | "club_join_request";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ─── Group Expenses ───────────────────────────────────────────────────────────

export type GroupExpenseSessionStatus = "active" | "archived";

export interface GroupExpenseSession {
  id: string;
  title: string | null;
  tripId: string | null;
  createdBy: string;
  status: GroupExpenseSessionStatus;
  currency: string;
  inviteCode: string;
  createdAt: string;
  members: GroupExpenseSessionMember[];
}

export interface GroupExpenseSessionMember {
  userId: string;
  name: string;
  username: string | null;
  profileImageUrl: string | null;
  joinedAt: string;
}

export type GroupExpenseItemCategory = "Food" | "Fuel" | "Stay" | "Toll" | "Misc";

export interface GroupExpenseItem {
  id: string;
  sessionId: string;
  loggedBy: string;
  paidBy: string;
  paidByName: string;
  amount: number;
  description: string;
  category: GroupExpenseItemCategory;
  includedUserIds: string[];
  perPerson: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupExpenseBalance {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface GroupExpenseSettlement {
  id: string;
  sessionId: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  settledAt: string;
  settledBy: string;
}

export interface GroupExpenseBalancesResponse {
  activeBalances: GroupExpenseBalance[];
  settlements: GroupExpenseSettlement[];
  totalSessionSpend: number;
  perMemberShare: { userId: string; name: string; share: number }[];
}

// ─── UI State Types ────────────────────────────────────────────────────────────

export interface NavTab {
  href: string;
  label: string;
  icon: string; // Lucide icon name
}

// Expense row joined with vehicle name — used by expenseService.recentByUser()
// kind discriminator required for trip vs expense icon in Epic 05
export type RecentActivity = Expense & { vehicleName: string; kind: "expense" | "trip" };

export interface SpendReport {
  vehicleId?: string;
  period: string;
  totalSpend: number;
  byCategory: { category: string; amount: number }[];
  trend?: { date: string; amount: number }[];
}


// ─── Reports ──────────────────────────────────────────────────────────────────

export interface OverallReportFilter {
  type: "monthly" | "range" | "yearly";
  month1?: string;
  month2?: string;
  from?: string;
  to?: string;
  compFrom?: string;
  compTo?: string;
}

export interface ReportFilter {
  filter?: string;
  from?: string;
  to?: string;
}

export interface CategoryDataPoint {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface MonthlyDataPoint {
  month: string;
  amount: number;
}

export interface VehicleReport {
  vehicle: Pick<Vehicle, "id" | "name" | "registrationNumber">;
  totalSpend: number;
  prevTotalSpend: number;
  currency: string;
  byCategory: CategoryDataPoint[];
  monthlyData: MonthlyDataPoint[];
  avgMonthlySpend: number;
  mostExpensiveCategory: string | null;
  hadCurrencyConversion: boolean;
}

export type PostDetail = Post & { comments: Comment[] };

export interface OverallReport {
  totalSpend: number;
  prevTotalSpend: number;
  currency: string;
  comparisonLabel: string;
  hadCurrencyConversion: boolean;
  perVehicle: { vehicleId: string; vehicleName: string; total: number }[];
  byCategory: CategoryDataPoint[];
  monthlyData: { month: string; primary: number; comparison: number }[];
}

export interface ExpenseSnapshot {
  periodLabel: string;
  totalExpenses: number;
  currency: string;
  byCategory: { category: string; total: number; count: number }[];
  monthlyTotals: { month: string; total: number }[];
  vehicleCount: number;
  topVehicle?: { name: string; total: number };
}

// ─── AI Reports ───────────────────────────────────────────────────────────────

export interface AiReport {
  id: string;
  userId: string;
  status: "pending" | "generating" | "ready" | "failed";
  periodLabel?: string;
  content?: string;
  requestedAt: string;
  completedAt?: string;
}

// ─── Service Reminders ────────────────────────────────────────────────────────

export interface ServiceReminder {
  id: string;
  vehicleId: string;
  userId: string;
  serviceType: string;
  kmInterval?: number;
  dayInterval?: number;
  lastServicedKm?: number;
  lastServicedAt?: string;
  notifiedAt?: string;
  createdAt: string;
}

// ─── Community ────────────────────────────────────────────────────────────────

export type FeedPost = Post;

// ─── Clubs ────────────────────────────────────────────────────────────────────

export type ClubJoinPolicy = "approval" | "open";
export type ClubMemberRole = "admin" | "member";
export type ClubMemberStatus = "active" | "pending" | "removed";

export interface Club {
  id: string;
  name: string;
  city: string;
  description?: string;
  logoUrl?: string;
  inviteCode: string;
  joinPolicy: ClubJoinPolicy;
  createdBy: string;
  createdAt: string;
  memberCount?: number;
}

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  role: ClubMemberRole;
  status: ClubMemberStatus;
  joinedAt: string;
  user?: Pick<User, "id" | "name" | "username" | "profileImageUrl">;
}

