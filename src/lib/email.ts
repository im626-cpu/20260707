import { Resend } from "resend";
import { formatTimeRange, formatWon } from "@/lib/format";
import type { Meetup, Participation, User } from "@/db/schema";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const NOTIFY_TO = process.env.NOTIFICATION_EMAIL;
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function meetupUrl(meetupId: string) {
  return `${SITE_URL}/meetups/${meetupId}`;
}

async function sendNotificationEmail(subject: string, html: string) {
  if (!resend || !NOTIFY_TO) {
    console.warn("RESEND_API_KEY 또는 NOTIFICATION_EMAIL이 설정되지 않아 알림 이메일을 보내지 않습니다.");
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to: NOTIFY_TO, subject, html });
  } catch (e) {
    // 알림 발송 실패가 모임 생성/매칭 같은 핵심 동작을 막아서는 안 되므로 로그만 남긴다.
    console.error("알림 이메일 전송 실패:", e);
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY가 설정되지 않아 알림 이메일을 보내지 않습니다.");
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    // 특정 수신자에 대한 발송 실패가 매칭 같은 핵심 동작이나 다른 수신자에 대한 발송을 막아서는 안 되므로 로그만 남긴다.
    console.error(`알림 이메일 전송 실패 (${to}):`, e);
  }
}

export async function notifyMeetupCreated(meetup: Meetup, host: User) {
  const html = `
    <h2>새 모임이 생성되었습니다</h2>
    <ul>
      <li>방장: ${host.nickname} (${host.schoolEmail})</li>
      <li>위치: ${meetup.locationBuilding} ${meetup.locationDetail}</li>
      <li>식사 가능 시간: ${formatTimeRange(meetup.mealTimeStart, meetup.mealTimeEnd)}</li>
      <li>가게명: ${meetup.storeName}</li>
      <li>메뉴: ${meetup.menuDescription}</li>
      <li>배달료: ${formatWon(meetup.deliveryFee)}</li>
      <li>최소 주문 금액: ${formatWon(meetup.minOrderAmount)}</li>
    </ul>
    <p><a href="${meetupUrl(meetup.id)}">모임 보기</a></p>
  `;
  await sendNotificationEmail(`[배달메이트] 새 모임 생성: ${meetup.storeName}`, html);
}

export async function notifyMeetupMatched(
  meetup: Meetup,
  approvedParticipants: (Participation & { user: User })[],
) {
  const rows = approvedParticipants
    .map((p) => `<li>${p.user.nickname} (${p.user.schoolEmail}) — ${formatWon(p.expectedAmount)}</li>`)
    .join("");
  const total = approvedParticipants.reduce((sum, p) => sum + p.expectedAmount, 0);

  const html = `
    <h2>모임이 매칭 완료되었습니다</h2>
    <ul>
      <li>위치: ${meetup.locationBuilding} ${meetup.locationDetail}</li>
      <li>식사 가능 시간: ${formatTimeRange(meetup.mealTimeStart, meetup.mealTimeEnd)}</li>
      <li>가게명: ${meetup.storeName}</li>
      <li>메뉴: ${meetup.menuDescription}</li>
      <li>최소 주문 금액: ${formatWon(meetup.minOrderAmount)}</li>
      <li>모집된 금액: ${formatWon(total)}</li>
    </ul>
    <h3>참여자 (${approvedParticipants.length}명)</h3>
    <ul>${rows}</ul>
    <p><a href="${meetupUrl(meetup.id)}">모임 보기</a></p>
  `;
  await sendNotificationEmail(`[배달메이트] 매칭 완료: ${meetup.storeName}`, html);
}

/** 매칭 완료 시 방장·참여자 각자에게 로그인 이메일(schoolEmail)로 개별 알림 발송 */
export async function notifyMatchedMembers(
  meetup: Meetup,
  approvedParticipants: (Participation & { user: User })[],
) {
  const rows = approvedParticipants
    .map(
      (p) =>
        `<li>${p.user.nickname}${p.user.id === meetup.hostId ? " (방장)" : ""} — ${formatWon(p.expectedAmount)}</li>`,
    )
    .join("");
  const total = approvedParticipants.reduce((sum, p) => sum + p.expectedAmount, 0);

  const html = `
    <h2>배달메이트 매칭이 완료되었습니다!</h2>
    <ul>
      <li>위치: ${meetup.locationBuilding} ${meetup.locationDetail}</li>
      <li>식사 가능 시간: ${formatTimeRange(meetup.mealTimeStart, meetup.mealTimeEnd)}</li>
      <li>가게명: ${meetup.storeName}</li>
      <li>메뉴: ${meetup.menuDescription}</li>
      <li>배달료: ${formatWon(meetup.deliveryFee)}</li>
      <li>모집된 금액: ${formatWon(total)} (최소 주문 금액 ${formatWon(meetup.minOrderAmount)})</li>
    </ul>
    <h3>메이트 (${approvedParticipants.length}명)</h3>
    <ul>${rows}</ul>
    <p><a href="${meetupUrl(meetup.id)}">모임 보기</a></p>
  `;
  const subject = `[배달메이트] 매칭 완료: ${meetup.storeName}`;

  await Promise.all(
    approvedParticipants.map((p) => sendEmail(p.user.schoolEmail, subject, html)),
  );
}
