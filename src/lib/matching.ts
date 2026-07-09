import { and, eq, sql } from "drizzle-orm";
import { db, type Transaction } from "@/lib/db";
import { meetups, participations } from "@/db/schema";

export class MatchingError extends Error {}

async function getMeetupOrThrow(tx: Transaction, meetupId: string) {
  const meetup = await tx.query.meetups.findFirst({ where: eq(meetups.id, meetupId) });
  if (!meetup) throw new Error(`Meetup not found: ${meetupId}`);
  return meetup;
}

async function getParticipationOrThrow(tx: Transaction, participationId: string) {
  const participation = await tx.query.participations.findFirst({
    where: eq(participations.id, participationId),
  });
  if (!participation) throw new Error(`Participation not found: ${participationId}`);
  return participation;
}

/**
 * 승인된 참여자 예상 금액 합산을 기준으로 모임 상태를 전이시키는 단일 진입점.
 * 참여 승인/제외 등 상태를 바꾸는 모든 액션은 반드시 이 함수를 거쳐야 한다 (PRD §4-3, §4-5, §5-5).
 */
export async function recalcMeetupStatus(tx: Transaction, meetupId: string) {
  const meetup = await getMeetupOrThrow(tx, meetupId);

  if (meetup.status !== "RECRUITING" && meetup.status !== "MATCHED") {
    return meetup;
  }

  const [approved] = await tx
    .select({
      sum: sql<number>`coalesce(sum(${participations.expectedAmount}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(participations)
    .where(and(eq(participations.meetupId, meetupId), eq(participations.status, "APPROVED")));
  const sum = approved.sum;
  const count = approved.count;
  // 방장 혼자 최소 주문 금액을 채운 것만으로는 "배달메이트 매칭"이 성립하지 않으므로,
  // 방장 외 최소 1인 이상 승인된 경우에만 매칭완료로 전환한다.
  const hasMate = count >= 2;

  if (meetup.status === "RECRUITING" && sum >= meetup.minOrderAmount && hasMate) {
    // 매칭완료 전환과 동시에, 아직 승인되지 않은 대기 신청은 전부 자동 거절 (PRD §4-3, §5-5)
    await tx
      .update(participations)
      .set({ status: "REJECTED" })
      .where(and(eq(participations.meetupId, meetupId), eq(participations.status, "PENDING")));
    const [updated] = await tx
      .update(meetups)
      .set({ status: "MATCHED" })
      .where(eq(meetups.id, meetupId))
      .returning();
    return updated;
  }

  if (meetup.status === "MATCHED" && (sum < meetup.minOrderAmount || !hasMate)) {
    // 강제 제외 등으로 누적액이 다시 최소금액 미만이 되거나 메이트가 없어지면 모집중으로 복귀 (PRD §4-5)
    const [updated] = await tx
      .update(meetups)
      .set({ status: "RECRUITING" })
      .where(eq(meetups.id, meetupId))
      .returning();
    return updated;
  }

  return meetup;
}

export async function applyToMeetup(
  meetupId: string,
  userId: string,
  expectedAmount: number,
) {
  return db.transaction(async (tx) => {
    const meetup = await getMeetupOrThrow(tx, meetupId);

    if (meetup.status !== "RECRUITING") {
      throw new MatchingError("모집이 마감된 모임입니다.");
    }
    if (meetup.hostId === userId) {
      throw new MatchingError("방장은 참여 신청을 할 수 없습니다.");
    }

    const existing = await tx.query.participations.findFirst({
      where: and(eq(participations.meetupId, meetupId), eq(participations.userId, userId)),
    });

    if (existing) {
      if (existing.status === "PENDING" || existing.status === "APPROVED") {
        throw new MatchingError("이미 신청했거나 참여 중인 모임입니다.");
      }
      // 과거에 취소/거절/제외된 이력이 있어도 재신청 가능 (unique 제약 때문에 기존 row를 재사용)
      const [updated] = await tx
        .update(participations)
        .set({ expectedAmount, status: "PENDING" })
        .where(eq(participations.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await tx
      .insert(participations)
      .values({ meetupId, userId, expectedAmount, status: "PENDING" })
      .returning();
    return created;
  });
}

async function assertIsHost(tx: Transaction, meetupId: string, actingUserId: string) {
  const meetup = await getMeetupOrThrow(tx, meetupId);
  if (meetup.hostId !== actingUserId) {
    throw new MatchingError("방장만 수행할 수 있는 작업입니다.");
  }
  return meetup;
}

export async function approveParticipation(participationId: string, actingUserId: string) {
  return db.transaction(async (tx) => {
    const participation = await getParticipationOrThrow(tx, participationId);
    await assertIsHost(tx, participation.meetupId, actingUserId);

    if (participation.status !== "PENDING") {
      throw new MatchingError("이미 처리된 신청입니다.");
    }

    await tx
      .update(participations)
      .set({ status: "APPROVED" })
      .where(eq(participations.id, participationId));

    return recalcMeetupStatus(tx, participation.meetupId);
  });
}

export async function rejectParticipation(participationId: string, actingUserId: string) {
  return db.transaction(async (tx) => {
    const participation = await getParticipationOrThrow(tx, participationId);
    await assertIsHost(tx, participation.meetupId, actingUserId);

    if (participation.status !== "PENDING") {
      throw new MatchingError("이미 처리된 신청입니다.");
    }

    const [updated] = await tx
      .update(participations)
      .set({ status: "REJECTED" })
      .where(eq(participations.id, participationId))
      .returning();
    return updated;
  });
}

/** 매칭완료 이후 무응답/잠적 참여자를 방장이 강제 제외 (PRD §4-5) */
export async function removeParticipant(participationId: string, actingUserId: string) {
  return db.transaction(async (tx) => {
    const participation = await getParticipationOrThrow(tx, participationId);
    await assertIsHost(tx, participation.meetupId, actingUserId);

    if (participation.status !== "APPROVED") {
      throw new MatchingError("승인된 참여자만 제외할 수 있습니다.");
    }

    await tx
      .update(participations)
      .set({ status: "REMOVED" })
      .where(eq(participations.id, participationId));

    return recalcMeetupStatus(tx, participation.meetupId);
  });
}

export async function cancelMyParticipation(participationId: string, actingUserId: string) {
  return db.transaction(async (tx) => {
    const participation = await getParticipationOrThrow(tx, participationId);

    if (participation.userId !== actingUserId) {
      throw new MatchingError("본인의 신청만 취소할 수 있습니다.");
    }
    if (participation.status !== "PENDING") {
      throw new MatchingError("승인 전 신청만 취소할 수 있습니다.");
    }

    const [updated] = await tx
      .update(participations)
      .set({ status: "CANCELLED" })
      .where(eq(participations.id, participationId))
      .returning();
    return updated;
  });
}
