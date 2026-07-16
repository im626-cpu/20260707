"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { participations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { notifyMeetupMatched, notifyMatchedMembers } from "@/lib/email";
import {
  applyToMeetup,
  approveParticipation,
  rejectParticipation,
  removeParticipant,
  cancelMyParticipation,
  MatchingError,
} from "@/lib/matching";
import { cancelMeetup } from "@/lib/meetup";

export type ActionState = { error?: string };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new MatchingError("로그인이 필요합니다.");
  }
  return user;
}

function handle(e: unknown): ActionState {
  if (e instanceof MatchingError) {
    return { error: e.message };
  }
  throw e;
}

/**
 * 반환값을 쓰지 않는 순수 form action(useActionState 미사용)용.
 * 더블클릭 등으로 인한 MatchingError(예: 이미 처리된 신청)는 조용히 무시하고,
 * 그 외 예외만 그대로 전파한다.
 */
function ignoreMatchingError(e: unknown): void {
  if (e instanceof MatchingError) return;
  throw e;
}

export async function applyAction(
  meetupId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const expectedAmount = Number(formData.get("expectedAmount"));
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return { error: "예상 주문 금액을 입력해주세요." };
    }
    await applyToMeetup(meetupId, user.id, expectedAmount);
  } catch (e) {
    return handle(e);
  }

  revalidatePath(`/meetups/${meetupId}`);
  return {};
}

export async function approveAction(participationId: string, meetupId: string): Promise<void> {
  let meetup;
  try {
    const user = await requireUser();
    meetup = await approveParticipation(participationId, user.id);
  } catch (e) {
    return ignoreMatchingError(e);
  }
  revalidatePath(`/meetups/${meetupId}`);

  // approveParticipation은 PENDING 신청에 대해서만 성공하고, PENDING은 RECRUITING 상태에서만
  // 존재할 수 있으므로(매칭 시 자동 거절됨) 여기서 status가 MATCHED라는 것은 방금 막 전환되었다는 뜻이다.
  if (meetup.status === "MATCHED") {
    const approved = await db.query.participations.findMany({
      where: eq(participations.meetupId, meetupId),
      with: { user: true },
    });
    const approvedParticipants = approved.filter((p) => p.status === "APPROVED");
    await notifyMeetupMatched(meetup, approvedParticipants);
    await notifyMatchedMembers(meetup, approvedParticipants);
  }
}

export async function rejectAction(participationId: string, meetupId: string): Promise<void> {
  try {
    const user = await requireUser();
    await rejectParticipation(participationId, user.id);
  } catch (e) {
    return ignoreMatchingError(e);
  }
  revalidatePath(`/meetups/${meetupId}`);
}

export async function removeAction(participationId: string, meetupId: string): Promise<void> {
  try {
    const user = await requireUser();
    await removeParticipant(participationId, user.id);
  } catch (e) {
    return ignoreMatchingError(e);
  }
  revalidatePath(`/meetups/${meetupId}`);
}

export async function cancelMyParticipationAction(
  participationId: string,
  meetupId: string,
): Promise<void> {
  try {
    const user = await requireUser();
    await cancelMyParticipation(participationId, user.id);
  } catch (e) {
    return ignoreMatchingError(e);
  }
  revalidatePath(`/meetups/${meetupId}`);
}

export async function cancelMeetupAction(meetupId: string): Promise<void> {
  try {
    const user = await requireUser();
    await cancelMeetup(meetupId, user.id);
  } catch (e) {
    return ignoreMatchingError(e);
  }
  revalidatePath(`/meetups/${meetupId}`);
}
