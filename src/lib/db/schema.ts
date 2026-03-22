import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  date,
  numeric,
  doublePrecision,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    googleId: text("google_id").unique().notNull(),
    name: text("name").notNull(),
    username: text("username").unique(),
    bio: text("bio"),
    profileImageUrl: text("profile_image_url"),
    instagramLink: text("instagram_link"),
    currency: text("currency").notNull().default("INR"),
    notificationWindowDays: integer("notification_window_days").notNull().default(30),
    documentStoragePreference: text("document_storage_preference")
      .notNull()
      .default("parse_only"),
    pushNotificationsEnabled: boolean("push_notifications_enabled").notNull().default(true),
    walkthroughSeen: boolean("walkthrough_seen").notNull().default(false),
    status: text("status").notNull().default("active"),
    suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentStoragePreferenceCheck: check(
      "users_document_storage_preference_check",
      sql`${table.documentStoragePreference} IN ('parse_only', 'full_storage')`
    ),
    statusCheck: check(
      "users_status_check",
      sql`${table.status} IN ('active', 'warned', 'suspended', 'banned')`
    ),
  })
);

// ─── Admin Accounts ───────────────────────────────────────────────────────────
export const adminAccounts = pgTable("admin_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Admin Settings ───────────────────────────────────────────────────────────
export const adminSettings = pgTable("admin_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Push Subscriptions ───────────────────────────────────────────────────────
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dhKey: text("p256dh_key").notNull(),
    authKey: text("auth_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_push_subscriptions_user_id").on(table.userId),
    userIdEndpointUnique: uniqueIndex("push_subscriptions_user_id_endpoint_unique").on(
      table.userId,
      table.endpoint
    ),
  })
);

// ─── Vehicles ─────────────────────────────────────────────────────────────────
export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    company: text("company"),
    model: text("model"),
    variant: text("variant"),
    color: text("color"),
    registrationNumber: text("registration_number").notNull(),
    purchasedAt: date("purchased_at"),
    previousOwners: integer("previous_owners").notNull().default(0),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_vehicles_user_id").on(table.userId),
    userIdRegNumUnique: uniqueIndex("vehicles_user_id_registration_number_unique").on(
      table.userId,
      table.registrationNumber
    ),
    typeCheck: check(
      "vehicles_type_check",
      sql`${table.type} IN ('2-wheeler', '4-wheeler', 'truck', 'other')`
    ),
  })
);

// ─── Trips ────────────────────────────────────────────────────────────────────
export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    routeText: text("route_text"),
    mapsLink: text("maps_link"),
    timeTaken: text("time_taken"),
    breakdown: jsonb("breakdown").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_trips_user_id").on(table.userId),
    vehicleIdIdx: index("idx_trips_vehicle_id").on(table.vehicleId),
  })
);

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("INR"),
    date: date("date").notNull(),
    reason: text("reason").notNull(),
    whereText: text("where_text"),
    comment: text("comment"),
    receiptUrl: text("receipt_url"),
    receiptKey: text("receipt_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleIdIdx: index("idx_expenses_vehicle_id").on(table.vehicleId),
    userIdIdx: index("idx_expenses_user_id").on(table.userId),
    tripIdIdx: index("idx_expenses_trip_id").on(table.tripId),
    dateIdx: index("idx_expenses_date").on(table.date),
    reasonCheck: check(
      "expenses_reason_check",
      sql`${table.reason} IN ('Service', 'Fuel', 'Trip', 'Others')`
    ),
    commentCheck: check(
      "expenses_comment_check",
      sql`${table.comment} IS NULL OR ${table.comment} IN ('Overpriced', 'Average', 'Underpriced')`
    ),
  })
);

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    label: text("label"),
    expiryDate: date("expiry_date"),
    storageUrl: text("storage_url"),
    storageKey: text("storage_key"),
    parseStatus: text("parse_status").notNull().default("manual"),
    status: text("status").notNull().default("valid"),
    expiryWarningNotifiedAt: timestamp("expiry_warning_notified_at", { withTimezone: true }),
    expiryNotifiedAt: timestamp("expiry_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleIdIdx: index("idx_documents_vehicle_id").on(table.vehicleId),
    userIdIdx: index("idx_documents_user_id").on(table.userId),
    expiryDateIdx: index("idx_documents_expiry_date")
      .on(table.expiryDate)
      .where(sql`${table.expiryDate} IS NOT NULL`),
    typeCheck: check(
      "documents_type_check",
      sql`${table.type} IN ('RC', 'Insurance', 'PUC', 'DL', 'Other')`
    ),
    parseStatusCheck: check(
      "documents_parse_status_check",
      sql`${table.parseStatus} IN ('parsed', 'manual', 'incomplete')`
    ),
    statusCheck: check(
      "documents_status_check",
      sql`${table.status} IN ('valid', 'expiring', 'expired', 'incomplete')`
    ),
  })
);

// ─── Posts ────────────────────────────────────────────────────────────────────
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    images: text("images").array().notNull().default([]),
    links: text("links").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    isEdited: boolean("is_edited").notNull().default(false),
    editHistory: jsonb("edit_history").notNull().default([]),
    isPinned: boolean("is_pinned").notNull().default(false),
    isHidden: boolean("is_hidden").notNull().default(false),
    score: doublePrecision("score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_posts_user_id").on(table.userId),
    scoreIdx: index("idx_posts_score")
      .on(table.score.desc())
      .where(sql`${table.isHidden} = false`),
    createdAtIdx: index("idx_posts_created_at")
      .on(table.createdAt.desc())
      .where(sql`${table.isHidden} = false`),
    tagsIdx: index("idx_posts_tags").using("gin", table.tags),
  })
);

// ─── Comments ─────────────────────────────────────────────────────────────────
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    parentCommentId: uuid("parent_comment_id").references((): any => comments.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postIdIdx: index("idx_comments_post_id").on(table.postId),
    parentIdIdx: index("idx_comments_parent_id").on(table.parentCommentId),
  })
);

// ─── Post Reactions ───────────────────────────────────────────────────────────
export const postReactions = pgTable(
  "post_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postIdIdx: index("idx_post_reactions_post_id").on(table.postId),
    postUserUnique: uniqueIndex("post_reactions_post_id_user_id_unique").on(
      table.postId,
      table.userId
    ),
    typeCheck: check(
      "post_reactions_type_check",
      sql`${table.type} IN ('like', 'dislike')`
    ),
  })
);

// ─── Post Reports ─────────────────────────────────────────────────────────────
export const postReports = pgTable(
  "post_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    reporterUserId: uuid("reporter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postIdIdx: index("idx_post_reports_post_id").on(table.postId),
    postUserUnique: uniqueIndex("post_reports_post_id_reporter_user_id_unique").on(
      table.postId,
      table.reporterUserId
    ),
    reasonCheck: check(
      "post_reports_reason_check",
      sql`${table.reason} IN ('Spam', 'Inappropriate', 'Misinformation', 'Other')`
    ),
  })
);

// ─── Vehicle Invites ──────────────────────────────────────────────────────────
export const vehicleInvites = pgTable(
  "vehicle_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteeEmail: text("invitee_email").notNull(),
    inviteeUserId: uuid("invitee_user_id").references(() => users.id, { onDelete: "set null" }),
    token: text("token").unique().notNull(),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleIdIdx: index("idx_vehicle_invites_vehicle_id").on(table.vehicleId),
    tokenIdx: index("idx_vehicle_invites_token").on(table.token),
    inviteeEmailIdx: index("idx_vehicle_invites_invitee_email").on(table.inviteeEmail),
    statusCheck: check(
      "vehicle_invites_status_check",
      sql`${table.status} IN ('pending', 'accepted', 'expired', 'revoked')`
    ),
  })
);

// ─── Vehicle Access ───────────────────────────────────────────────────────────
export const vehicleAccess = pgTable(
  "vehicle_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessLevel: text("access_level").notNull().default("view"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleIdIdx: index("idx_vehicle_access_vehicle_id").on(table.vehicleId),
    userIdIdx: index("idx_vehicle_access_user_id").on(table.userId),
    vehicleUserUnique: uniqueIndex("vehicle_access_vehicle_id_user_id_unique").on(
      table.vehicleId,
      table.userId
    ),
    accessLevelCheck: check(
      "vehicle_access_access_level_check",
      sql`${table.accessLevel} IN ('view')`
    ),
  })
);

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    actionUrl: text("action_url"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_notifications_user_id").on(table.userId),
    unreadIdx: index("idx_notifications_unread")
      .on(table.userId, table.isRead)
      .where(sql`${table.isRead} = false`),
  })
);

// ─── AI Reports ───────────────────────────────────────────────────────────────
export const aiReports = pgTable(
  "ai_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    periodLabel: text("period_label"),
    content: text("content"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("idx_ai_reports_user_id").on(table.userId),
    monthlyIdx: index("idx_ai_reports_monthly").on(table.userId, table.requestedAt),
    statusCheck: check(
      "ai_reports_status_check",
      sql`${table.status} IN ('pending', 'generating', 'ready', 'failed')`
    ),
  })
);
