"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, meetups, participations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { MatchingError } from "@/lib/matching";

async function assertChatAccess(meetupId: string, userId: string) {
  const meetup = await db.query.meetups.findFirst({ where: eq(meetups.id, meetupId) });
  if (!meetup) throw new Error(`Meetup not found: ${meetupId}`);

  if (meetup.status !== "MATCHED") {
    throw new MatchingError("매칭 완료된 모임만 채팅할 수 있습니다.");
  }
  if (meetup.hostId === userId) return;

  const participation = await db.query.participations.findFirst({
    where: and(eq(participations.meetupId, meetupId), eq(participations.userId, userId)),
  });

  if (participation?.status !== "APPROVED") {
    throw new MatchingError("이 모임의 참여자만 채팅할 수 있습니다.");
  }
}

export async function sendMessageAction(meetupId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new MatchingError("로그인이 필요합니다.");
  }

  const trimmed = content.trim();
  if (!trimmed) return;

  await assertChatAccess(meetupId, user.id);

  const [inserted] = await db
    .insert(chatMessages)
    .values({ meetupId, userId: user.id, content: trimmed })
    .returning();

  return { id: inserted.id, createdAt: inserted.createdAt.toISOString() };
}
