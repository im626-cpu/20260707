import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meetups, participations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getApprovedSum, getEffectiveStatus } from "@/lib/meetup";
import { formatTimeRange, formatWon } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/my");

  const [hostedMeetups, myParticipations] = await Promise.all([
    db.query.meetups.findMany({
      where: eq(meetups.hostId, user.id),
      with: { participations: true },
      orderBy: desc(meetups.createdAt),
    }),
    db.query.participations
      .findMany({
        where: eq(participations.userId, user.id),
        with: { meetup: { with: { participations: true } } },
        orderBy: desc(participations.createdAt),
      })
      .then((rows) => rows.filter((p) => p.meetup.hostId !== user.id)),
  ]);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">마이페이지</h1>
      <p className="mb-8 text-sm text-neutral-500">{user.nickname}</p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">내가 작성한 모임</h2>
        {hostedMeetups.length === 0 ? (
          <p className="text-sm text-neutral-500">작성한 모임이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {hostedMeetups.map((m) => (
              <MeetupRow
                key={m.id}
                id={m.id}
                storeName={m.storeName}
                timeRange={formatTimeRange(m.mealTimeStart, m.mealTimeEnd)}
                sumLabel={`${formatWon(getApprovedSum(m.participations))} / ${formatWon(m.minOrderAmount)}`}
                status={getEffectiveStatus(m)}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">참여 중인 모임</h2>
        {myParticipations.length === 0 ? (
          <p className="text-sm text-neutral-500">참여한 모임이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {myParticipations.map((p) => (
              <MeetupRow
                key={p.id}
                id={p.meetup.id}
                storeName={p.meetup.storeName}
                timeRange={formatTimeRange(p.meetup.mealTimeStart, p.meetup.mealTimeEnd)}
                sumLabel={`내 신청 상태: ${PARTICIPATION_LABEL[p.status]}`}
                status={getEffectiveStatus(p.meetup)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

const PARTICIPATION_LABEL: Record<string, string> = {
  PENDING: "대기중",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
  CANCELLED: "취소함",
  REMOVED: "제외됨",
};

function MeetupRow({
  id,
  storeName,
  timeRange,
  sumLabel,
  status,
}: {
  id: string;
  storeName: string;
  timeRange: string;
  sumLabel: string;
  status: "RECRUITING" | "MATCHED" | "EXPIRED" | "CANCELLED";
}) {
  return (
    <li>
      <Link
        href={`/meetups/${id}`}
        className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm hover:border-neutral-400"
      >
        <div>
          <p className="font-medium">{storeName}</p>
          <p className="text-xs text-neutral-500">
            {timeRange} · {sumLabel}
          </p>
        </div>
        <StatusBadge status={status} />
      </Link>
    </li>
  );
}
