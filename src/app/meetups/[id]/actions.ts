"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
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

export async function approveAction(participationId: string, meetupId: string) {
  const user = await requireUser();
  await approveParticipation(participationId, user.id);
  revalidatePath(`/meetups/${meetupId}`);
}

export async function rejectAction(participationId: string, meetupId: string) {
  const user = await requireUser();
  await rejectParticipation(participationId, user.id);
  revalidatePath(`/meetups/${meetupId}`);
}

export async function removeAction(participationId: string, meetupId: string) {
  const user = await requireUser();
  await removeParticipant(participationId, user.id);
  revalidatePath(`/meetups/${meetupId}`);
}

export async function cancelMyParticipationAction(participationId: string, meetupId: string) {
  const user = await requireUser();
  await cancelMyParticipation(participationId, user.id);
  revalidatePath(`/meetups/${meetupId}`);
}

export async function cancelMeetupAction(meetupId: string) {
  const user = await requireUser();
  await cancelMeetup(meetupId, user.id);
  revalidatePath(`/meetups/${meetupId}`);
}
