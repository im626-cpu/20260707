"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { BUILDINGS } from "@/lib/buildings";
import { notifyMeetupCreated } from "@/lib/email";
import { MatchingError } from "@/lib/matching";
import { createMeetup } from "@/lib/meetup";

const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  locationBuilding: z.enum(BUILDINGS),
  locationDetail: z.string().min(1, "상세 위치를 입력해주세요."),
  mealDate: z.string().min(1, "날짜를 입력해주세요."),
  mealStartTime: z
    .string()
    .min(1, "식사 가능 시작 시간을 입력해주세요.")
    .regex(TIME_24H_PATTERN, "시작 시간은 24시간제 HH:MM 형식으로 입력해주세요 (예: 18:30)."),
  mealEndTime: z
    .string()
    .min(1, "식사 가능 종료 시간을 입력해주세요.")
    .regex(TIME_24H_PATTERN, "종료 시간은 24시간제 HH:MM 형식으로 입력해주세요 (예: 19:30)."),
  storeName: z.string().min(1, "가게명을 입력해주세요."),
  menuDescription: z.string().min(1, "메뉴 설명을 입력해주세요."),
  deliveryFee: z.coerce.number().int().min(0, "배달료는 0 이상이어야 합니다."),
  minOrderAmount: z.coerce.number().int().min(1, "최소 주문 금액을 입력해주세요."),
  hostExpectedAmount: z.coerce.number().int().min(1, "본인 메뉴 가격을 입력해주세요."),
});

export type CreateMeetupState = { error?: string };

export async function createMeetupAction(
  _prevState: CreateMeetupState,
  formData: FormData,
): Promise<CreateMeetupState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const data = parsed.data;
  const mealTimeStart = new Date(`${data.mealDate}T${data.mealStartTime}`);
  const mealTimeEnd = new Date(`${data.mealDate}T${data.mealEndTime}`);

  let meetupId: string;
  try {
    const meetup = await createMeetup(user.id, {
      locationBuilding: data.locationBuilding,
      locationDetail: data.locationDetail,
      mealTimeStart,
      mealTimeEnd,
      storeName: data.storeName,
      menuDescription: data.menuDescription,
      deliveryFee: data.deliveryFee,
      minOrderAmount: data.minOrderAmount,
      hostExpectedAmount: data.hostExpectedAmount,
    });
    meetupId = meetup.id;
    await notifyMeetupCreated(meetup, user);
  } catch (e) {
    if (e instanceof MatchingError) {
      return { error: e.message };
    }
    throw e;
  }

  redirect(`/meetups/${meetupId}`);
}
