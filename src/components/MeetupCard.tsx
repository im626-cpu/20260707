import Link from "next/link";
import type { Meetup, Participation, User } from "@/generated/prisma/client";
import { getEffectiveStatus } from "@/lib/meetup";
import { formatTimeRange, formatWon } from "@/lib/format";
import ProgressBar from "./ProgressBar";
import StatusBadge from "./StatusBadge";

type Props = {
  meetup: Meetup & { host: User; participations: Participation[] };
  approvedSum: number;
};

export default function MeetupCard({ meetup, approvedSum }: Props) {
  const status = getEffectiveStatus(meetup);

  return (
    <Link
      href={`/meetups/${meetup.id}`}
      className="block rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          {meetup.locationBuilding} · {meetup.locationDetail}
        </span>
        <StatusBadge status={status} />
      </div>

      <h2 className="mb-1 text-base font-semibold">{meetup.storeName}</h2>
      <p className="mb-3 text-sm text-neutral-600">{meetup.menuDescription}</p>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span>{formatTimeRange(meetup.mealTimeStart, meetup.mealTimeEnd)}</span>
        <span>배달료 {formatWon(meetup.deliveryFee)}</span>
      </div>

      <ProgressBar current={approvedSum} target={meetup.minOrderAmount} />
      <p className="mt-1 text-xs text-neutral-500">
        {formatWon(approvedSum)} / {formatWon(meetup.minOrderAmount)}
      </p>
    </Link>
  );
}
