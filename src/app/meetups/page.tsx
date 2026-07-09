import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { meetups } from "@/db/schema";
import { BUILDINGS } from "@/lib/buildings";
import { getApprovedSum, getEffectiveStatus } from "@/lib/meetup";
import MeetupCard from "@/components/MeetupCard";

type SearchParams = Promise<{ building?: string; status?: string }>;

export default async function MeetupsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const buildingFilter = params.building ?? "";
  const statusFilter = params.status ?? "recruiting";

  const meetupList = await db.query.meetups.findMany({
    where: and(
      inArray(meetups.status, ["RECRUITING", "MATCHED"]),
      buildingFilter ? eq(meetups.locationBuilding, buildingFilter) : undefined,
    ),
    with: { participations: true, host: true },
    orderBy: asc(meetups.mealTimeStart),
  });

  const visible = meetupList.filter((m) => {
    const effective = getEffectiveStatus(m);
    if (statusFilter === "all") return true;
    if (statusFilter === "recruiting") return effective === "RECRUITING";
    if (statusFilter === "matched") return effective === "MATCHED";
    return true;
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">모임 게시판</h1>
        <Link
          href="/meetups/new"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          모임 만들기
        </Link>
      </div>

      <form method="get" className="mb-6 flex flex-wrap gap-2">
        <select
          name="building"
          defaultValue={buildingFilter}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="">전체 위치</option>
          {BUILDINGS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="recruiting">모집중</option>
          <option value="matched">매칭완료</option>
          <option value="all">전체</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1 text-sm"
        >
          필터 적용
        </button>
      </form>

      {visible.length === 0 ? (
        <p className="text-sm text-neutral-500">조건에 맞는 모임이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((m) => (
            <li key={m.id}>
              <MeetupCard meetup={m} approvedSum={getApprovedSum(m.participations)} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
