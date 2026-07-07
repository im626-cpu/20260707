export function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const hourMinuteFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTimeRange(start: Date, end: Date) {
  return `${timeFormatter.format(start)} ~ ${hourMinuteFormatter.format(end)}`;
}
