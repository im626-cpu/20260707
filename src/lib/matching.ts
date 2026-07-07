import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export class MatchingError extends Error {}

/**
 * 승인된 참여자 예상 금액 합산을 기준으로 모임 상태를 전이시키는 단일 진입점.
 * 참여 승인/제외 등 상태를 바꾸는 모든 액션은 반드시 이 함수를 거쳐야 한다 (PRD §4-3, §4-5, §5-5).
 */
export async function recalcMeetupStatus(tx: Prisma.TransactionClient, meetupId: string) {
  const meetup = await tx.meetup.findUniqueOrThrow({ where: { id: meetupId } });

  if (meetup.status !== "RECRUITING" && meetup.status !== "MATCHED") {
    return meetup;
  }

  const approved = await tx.participation.aggregate({
    where: { meetupId, status: "APPROVED" },
    _sum: { expectedAmount: true },
  });
  const sum = approved._sum.expectedAmount ?? 0;

  if (meetup.status === "RECRUITING" && sum >= meetup.minOrderAmount) {
    // 매칭완료 전환과 동시에, 아직 승인되지 않은 대기 신청은 전부 자동 거절 (PRD §4-3, §5-5)
    await tx.participation.updateMany({
      where: { meetupId, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    return tx.meetup.update({ where: { id: meetupId }, data: { status: "MATCHED" } });
  }

  if (meetup.status === "MATCHED" && sum < meetup.minOrderAmount) {
    // 강제 제외 등으로 누적액이 다시 최소금액 미만이 되면 모집중으로 복귀 (PRD §4-5)
    return tx.meetup.update({ where: { id: meetupId }, data: { status: "RECRUITING" } });
  }

  return meetup;
}

export async function applyToMeetup(
  meetupId: string,
  userId: string,
  expectedAmount: number,
) {
  return prisma.$transaction(async (tx) => {
    const meetup = await tx.meetup.findUniqueOrThrow({ where: { id: meetupId } });

    if (meetup.status !== "RECRUITING") {
      throw new MatchingError("모집이 마감된 모임입니다.");
    }
    if (meetup.hostId === userId) {
      throw new MatchingError("방장은 참여 신청을 할 수 없습니다.");
    }

    const existing = await tx.participation.findUnique({
      where: { meetupId_userId: { meetupId, userId } },
    });

    if (existing) {
      if (existing.status === "PENDING" || existing.status === "APPROVED") {
        throw new MatchingError("이미 신청했거나 참여 중인 모임입니다.");
      }
      // 과거에 취소/거절/제외된 이력이 있어도 재신청 가능 (unique 제약 때문에 기존 row를 재사용)
      return tx.participation.update({
        where: { id: existing.id },
        data: { expectedAmount, status: "PENDING" },
      });
    }

    return tx.participation.create({
      data: { meetupId, userId, expectedAmount, status: "PENDING" },
    });
  });
}

async function assertIsHost(
  tx: Prisma.TransactionClient,
  meetupId: string,
  actingUserId: string,
) {
  const meetup = await tx.meetup.findUniqueOrThrow({ where: { id: meetupId } });
  if (meetup.hostId !== actingUserId) {
    throw new MatchingError("방장만 수행할 수 있는 작업입니다.");
  }
  return meetup;
}

export async function approveParticipation(participationId: string, actingUserId: string) {
  return prisma.$transaction(async (tx) => {
    const participation = await tx.participation.findUniqueOrThrow({
      where: { id: participationId },
    });
    await assertIsHost(tx, participation.meetupId, actingUserId);

    if (participation.status !== "PENDING") {
      throw new MatchingError("이미 처리된 신청입니다.");
    }

    await tx.participation.update({
      where: { id: participationId },
      data: { status: "APPROVED" },
    });

    return recalcMeetupStatus(tx, participation.meetupId);
  });
}

export async function rejectParticipation(participationId: string, actingUserId: string) {
  return prisma.$transaction(async (tx) => {
    const participation = await tx.participation.findUniqueOrThrow({
      where: { id: participationId },
    });
    await assertIsHost(tx, participation.meetupId, actingUserId);

    if (participation.status !== "PENDING") {
      throw new MatchingError("이미 처리된 신청입니다.");
    }

    return tx.participation.update({
      where: { id: participationId },
      data: { status: "REJECTED" },
    });
  });
}

/** 매칭완료 이후 무응답/잠적 참여자를 방장이 강제 제외 (PRD §4-5) */
export async function removeParticipant(participationId: string, actingUserId: string) {
  return prisma.$transaction(async (tx) => {
    const participation = await tx.participation.findUniqueOrThrow({
      where: { id: participationId },
    });
    await assertIsHost(tx, participation.meetupId, actingUserId);

    if (participation.status !== "APPROVED") {
      throw new MatchingError("승인된 참여자만 제외할 수 있습니다.");
    }

    await tx.participation.update({
      where: { id: participationId },
      data: { status: "REMOVED" },
    });

    return recalcMeetupStatus(tx, participation.meetupId);
  });
}

export async function cancelMyParticipation(participationId: string, actingUserId: string) {
  return prisma.$transaction(async (tx) => {
    const participation = await tx.participation.findUniqueOrThrow({
      where: { id: participationId },
    });

    if (participation.userId !== actingUserId) {
      throw new MatchingError("본인의 신청만 취소할 수 있습니다.");
    }
    if (participation.status !== "PENDING") {
      throw new MatchingError("승인 전 신청만 취소할 수 있습니다.");
    }

    return tx.participation.update({
      where: { id: participationId },
      data: { status: "CANCELLED" },
    });
  });
}
