"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MatchingError } from "@/lib/matching";

async function assertChatAccess(meetupId: string, userId: string) {
  const meetup = await prisma.meetup.findUniqueOrThrow({ where: { id: meetupId } });

  if (meetup.status !== "MATCHED") {
    throw new MatchingError("매칭 완료된 모임만 채팅할 수 있습니다.");
  }
  if (meetup.hostId === userId) return;

  const participation = await prisma.participation.findUnique({
    where: { meetupId_userId: { meetupId, userId } },
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

  await prisma.chatMessage.create({
    data: { meetupId, userId: user.id, content: trimmed },
  });
}
