"use client";

import { useActionState } from "react";
import { applyAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export default function ApplyForm({ meetupId }: { meetupId: string }) {
  const boundAction = applyAction.bind(null, meetupId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">예상 주문 금액(원)</span>
        <input
          type="number"
          name="expectedAmount"
          min={1}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "신청 중..." : "참여 신청"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
