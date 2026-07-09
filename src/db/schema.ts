import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const meetupStatusEnum = pgEnum("MeetupStatus", [
  "RECRUITING",
  "MATCHED",
  "EXPIRED",
  "CANCELLED",
]);

export const participationStatusEnum = pgEnum("ParticipationStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "REMOVED",
]);

export const users = pgTable(
  "User",
  {
    // Supabase auth user UUID와 동일한 값 사용
    id: text("id").primaryKey(),
    nickname: text("nickname").notNull(),
    schoolEmail: text("schoolEmail").notNull(),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("User_schoolEmail_key").on(table.schoolEmail)],
);

export const meetups = pgTable(
  "Meetup",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    hostId: text("hostId")
      .notNull()
      .references(() => users.id),
    locationBuilding: text("locationBuilding").notNull(),
    locationDetail: text("locationDetail").notNull(),
    mealTimeStart: timestamp("mealTimeStart", { precision: 3, mode: "date" }).notNull(),
    mealTimeEnd: timestamp("mealTimeEnd", { precision: 3, mode: "date" }).notNull(),
    storeName: text("storeName").notNull(),
    menuDescription: text("menuDescription").notNull(),
    deliveryFee: integer("deliveryFee").notNull(),
    minOrderAmount: integer("minOrderAmount").notNull(),
    status: meetupStatusEnum("status").notNull().default("RECRUITING"),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("Meetup_status_idx").on(table.status),
    index("Meetup_hostId_idx").on(table.hostId),
  ],
);

export const participations = pgTable(
  "Participation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    meetupId: text("meetupId")
      .notNull()
      .references(() => meetups.id),
    userId: text("userId")
      .notNull()
      .references(() => users.id),
    expectedAmount: integer("expectedAmount").notNull(),
    status: participationStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("Participation_meetupId_userId_key").on(table.meetupId, table.userId),
    index("Participation_meetupId_status_idx").on(table.meetupId, table.status),
  ],
);

export const chatMessages = pgTable(
  "ChatMessage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    meetupId: text("meetupId")
      .notNull()
      .references(() => meetups.id),
    userId: text("userId")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("ChatMessage_meetupId_createdAt_idx").on(table.meetupId, table.createdAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  meetups: many(meetups),
  participations: many(participations),
  chatMessages: many(chatMessages),
}));

export const meetupsRelations = relations(meetups, ({ one, many }) => ({
  host: one(users, { fields: [meetups.hostId], references: [users.id] }),
  participations: many(participations),
  chatMessages: many(chatMessages),
}));

export const participationsRelations = relations(participations, ({ one }) => ({
  meetup: one(meetups, { fields: [participations.meetupId], references: [meetups.id] }),
  user: one(users, { fields: [participations.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  meetup: one(meetups, { fields: [chatMessages.meetupId], references: [meetups.id] }),
  user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Meetup = typeof meetups.$inferSelect;
export type Participation = typeof participations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
