import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meetups, participations } from "@/db/schema";
import { recalcMeetupStatus, MatchingError } from "@/lib/matching";

export type CreateMeetupInput = {
  locationBuilding: string;
  locationDetail: string;
  mealTimeStart: Date;
  mealTimeEnd: Date;
  storeName: string;
  menuDescription: string;
  deliveryFee: number;
  minOrderAmount: number;
  hostExpectedAmount: number;
};

export async function createMeetup(hostId: string, input: CreateMeetupInput) {
  if (input.mealTimeEnd <= input.mealTimeStart) {
    throw new MatchingError("식사 가능 시간 종료는 시작 이후여야 합니다.");
  }

  return db.transaction(async (tx) => {
    const [meetup] = await tx
      .insert(meetups)
      .values({
        hostId,
        locationBuilding: input.locationBuilding,
        locationDetail: input.locationDetail,
        mealTimeStart: input.mealTimeStart,
        mealTimeEnd: input.mealTimeEnd,
        storeName: input.storeName,
        menuDescription: input.menuDescription,
        deliveryFee: input.deliveryFee,
        minOrderAmount: input.minOrderAmount,
      })
      .returning();

    // 방장도 참여자 1인으로 취급 (PRD §4-1) — 합산/목록 로직을 하나로 통일하기 위해
    // 별도 필드 대신 Participation row(APPROVED)로 기록한다.
    await tx.insert(participations).values({
      meetupId: meetup.id,
      userId: hostId,
      expectedAmount: input.hostExpectedAmount,
      status: "APPROVED",
    });

    return recalcMeetupStatus(tx, meetup.id);
  });
}

export async function cancelMeetup(meetupId: string, actingUserId: string) {
  return db.transaction(async (tx) => {
    const meetup = await tx.query.meetups.findFirst({ where: eq(meetups.id, meetupId) });
    if (!meetup) throw new Error(`Meetup not found: ${meetupId}`);

    if (meetup.hostId !== actingUserId) {
      throw new MatchingError("방장만 모임을 취소할 수 있습니다.");
    }
    if (meetup.status === "CANCELLED") {
      throw new MatchingError("이미 취소된 모임입니다.");
    }

    const [updated] = await tx
      .update(meetups)
      .set({ status: "CANCELLED" })
      .where(eq(meetups.id, meetupId))
      .returning();
    return updated;
  });
}

/** 식사 가능 시간이 지났는지 여부 (마감 판정은 배치 없이 읽기 시점에 lazy하게 계산) */
export function isExpired(meetup: { mealTimeEnd: Date }) {
  return new Date() > meetup.mealTimeEnd;
}

export type EffectiveStatus = "RECRUITING" | "MATCHED" | "EXPIRED" | "CANCELLED";

/** 화면 표시용 상태 — DB status가 RECRUITING이어도 시간이 지났으면 EXPIRED로 보여준다 (PRD §4-4) */
export function getEffectiveStatus(meetup: {
  status: "RECRUITING" | "MATCHED" | "EXPIRED" | "CANCELLED";
  mealTimeEnd: Date;
}): EffectiveStatus {
  if (meetup.status === "RECRUITING" && isExpired(meetup)) {
    return "EXPIRED";
  }
  return meetup.status;
}

export function getApprovedSum(
  participations: { status: string; expectedAmount: number }[],
) {
  return participations
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.expectedAmount, 0);
}
