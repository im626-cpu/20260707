"use client";

import { useActionState } from "react";
import { BUILDINGS } from "@/lib/buildings";
import { createMeetupAction, type CreateMeetupState } from "./actions";

const initialState: CreateMeetupState = {};

export default function NewMeetupPage() {
  const [state, formAction, pending] = useActionState(createMeetupAction, initialState);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">모임 만들기</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="위치(건물)">
          <select
            name="locationBuilding"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {BUILDINGS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>

        <Field label="상세 위치">
          <input
            name="locationDetail"
            required
            placeholder="예: 302호"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="식사 가능 날짜">
          <input
            type="date"
            name="mealDate"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="식사 가능 시작 시간">
            <input
              type="time"
              name="mealStartTime"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="식사 가능 종료 시간">
            <input
              type="time"
              name="mealEndTime"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="가게명">
          <input
            name="storeName"
            required
            placeholder="예: OO치킨"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="메뉴 설명">
          <input
            name="menuDescription"
            required
            placeholder="예: 후라이드 반 + 양념 반"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="배달료 (원)">
            <input
              type="number"
              name="deliveryFee"
              required
              min={0}
              defaultValue={0}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="최소 주문 금액 (원)">
            <input
              type="number"
              name="minOrderAmount"
              required
              min={1}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="본인이 시킬 메뉴 가격 (원)">
          <input
            type="number"
            name="hostExpectedAmount"
            required
            min={1}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "등록 중..." : "모임 등록"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
