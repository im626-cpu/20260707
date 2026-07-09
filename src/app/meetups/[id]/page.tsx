import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meetups } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getApprovedSum, getEffectiveStatus } from "@/lib/meetup";
import { formatTimeRange, formatWon } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import StatusBadge from "@/components/StatusBadge";
import ApplyForm from "./ApplyForm";
import {
  approveAction,
  rejectAction,
  removeAction,
  cancelMyParticipationAction,
  cancelMeetupAction,
} from "./actions";

export default async function MeetupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const meetup = await db.query.meetups.findFirst({
    where: eq(meetups.id, id),
    with: {
      host: true,
      participations: { with: { user: true }, orderBy: (p) => asc(p.createdAt) },
    },
  });

  if (!meetup) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const status = getEffectiveStatus(meetup);
  const approvedSum = getApprovedSum(meetup.participations);

  const isHost = currentUser?.id === meetup.hostId;
  const myParticipation = currentUser
    ? meetup.participations.find((p) => p.userId === currentUser.id)
    : undefined;

  const approvedParticipants = meetup.participations.filter((p) => p.status === "APPROVED");
  const pendingParticipants = meetup.participations.filter((p) => p.status === "PENDING");

  const canApply =
    status === "RECRUITING" &&
    currentUser &&
    !isHost &&
    myParticipation?.status !== "PENDING" &&
    myParticipation?.status !== "APPROVED";

  const canEnterChat =
    status === "MATCHED" && (isHost || myParticipation?.status === "APPROVED");

  const canCancelMeetup = isHost && (meetup.status === "RECRUITING" || meetup.status === "MATCHED");

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          {meetup.locationBuilding} · {meetup.locationDetail}
        </span>
        <StatusBadge status={status} />
      </div>

      <h1 className="mb-1 text-2xl font-semibold">{meetup.storeName}</h1>
      <p className="mb-4 text-neutral-600">{meetup.menuDescription}</p>

      <dl className="mb-6 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-neutral-500">식사 가능 시간</dt>
        <dd>{formatTimeRange(meetup.mealTimeStart, meetup.mealTimeEnd)}</dd>
        <dt className="text-neutral-500">배달료</dt>
        <dd>{formatWon(meetup.deliveryFee)}</dd>
        <dt className="text-neutral-500">방장</dt>
        <dd>{meetup.host.nickname}</dd>
      </dl>

      <div className="mb-6">
        <ProgressBar current={approvedSum} target={meetup.minOrderAmount} />
        <p className="mt-1 text-sm text-neutral-600">
          {formatWon(approvedSum)} / {formatWon(meetup.minOrderAmount)}
        </p>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">
          참여자 ({approvedParticipants.length}명)
        </h2>
        <ul className="flex flex-col gap-2">
          {approvedParticipants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 text-sm"
            >
              <span>
                {p.user.nickname}
                {p.userId === meetup.hostId && " (방장)"} · {formatWon(p.expectedAmount)}
              </span>
              {isHost && p.userId !== meetup.hostId && meetup.status === "MATCHED" && (
                <form action={removeAction.bind(null, p.id, meetup.id)}>
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    제외
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isHost && pendingParticipants.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">
            대기 중인 참여 신청 ({pendingParticipants.length}건)
          </h2>
          <ul className="flex flex-col gap-2">
            {pendingParticipants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm"
              >
                <span>
                  {p.user.nickname} · {formatWon(p.expectedAmount)}
                </span>
                <div className="flex gap-2">
                  <form action={approveAction.bind(null, p.id, meetup.id)}>
                    <button type="submit" className="text-xs text-blue-600 hover:underline">
                      승인
                    </button>
                  </form>
                  <form action={rejectAction.bind(null, p.id, meetup.id)}>
                    <button type="submit" className="text-xs text-neutral-500 hover:underline">
                      거절
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canApply && <ApplyForm meetupId={meetup.id} />}

      {!canApply && status === "RECRUITING" && !currentUser && (
        <p className="text-sm text-neutral-500">
          <Link href={`/login?redirectTo=/meetups/${meetup.id}`} className="underline">
            로그인
          </Link>
          하면 참여 신청을 할 수 있습니다.
        </p>
      )}

      {myParticipation?.status === "PENDING" && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-neutral-600">방장의 승인을 기다리는 중입니다.</p>
          <form action={cancelMyParticipationAction.bind(null, myParticipation.id, meetup.id)}>
            <button type="submit" className="text-sm text-red-600 hover:underline">
              신청 취소
            </button>
          </form>
        </div>
      )}

      {canEnterChat && (
        <Link
          href={`/meetups/${meetup.id}/chat`}
          className="mt-4 block rounded-md bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white"
        >
          채팅방 입장
        </Link>
      )}

      {canCancelMeetup && (
        <form action={cancelMeetupAction.bind(null, meetup.id)} className="mt-6">
          <button type="submit" className="text-sm text-red-600 hover:underline">
            모임 취소하기
          </button>
        </form>
      )}
    </main>
  );
}
