import type { EffectiveStatus } from "@/lib/meetup";

const LABELS: Record<EffectiveStatus, string> = {
  RECRUITING: "모집중",
  MATCHED: "매칭완료",
  EXPIRED: "마감(시간만료)",
  CANCELLED: "취소됨",
};

const STYLES: Record<EffectiveStatus, string> = {
  RECRUITING: "bg-blue-50 text-blue-700",
  MATCHED: "bg-green-50 text-green-700",
  EXPIRED: "bg-neutral-100 text-neutral-500",
  CANCELLED: "bg-red-50 text-red-600",
};

export default function StatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
