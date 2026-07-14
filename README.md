# 캠퍼스 배달메이트 매칭 서비스

같은 대학 캠퍼스 안에서 배달 최소 주문 금액을 함께 채울 사람을 찾는 매칭 서비스. 자세한 기획은 [PRD.md](./PRD.md) 참고.

## 기술 스택

- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (Postgres / Auth / Realtime)
- Drizzle ORM (`drizzle-orm/node-postgres`, `pg` 드라이버 사용)

## 처음 셋업하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 `.env.local`로 복사한 뒤, Supabase 프로젝트 정보로 채운다.

```bash
cp .env.example .env.local
```

| 변수 | 위치 |
|---|---|
| `DATABASE_URL` | Supabase 프로젝트 > Connect > Connection pooling (포트 6543, `?pgbouncer=true`) — 앱 런타임용 |
| `DIRECT_URL` | Supabase 프로젝트 > Connect > Direct connection (포트 5432) — `drizzle-kit` 마이그레이션용 |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 프로젝트 Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | 프로젝트 Settings > API (서버 전용, 아직 코드에서는 미사용이지만 추후 관리자 작업용으로 확보) |
| `ALLOWED_EMAIL_DOMAINS` | 로그인 허용할 학교 이메일 도메인 (쉼표로 여러 개 가능, 예: `snu.ac.kr`) |
| `RESEND_API_KEY` | [resend.com](https://resend.com)에서 발급 — 모임 생성/매칭 완료 알림 메일 발송용. 비워두면 알림을 보내지 않고 로그만 남긴다 |
| `NOTIFICATION_EMAIL` | 알림 메일을 받을 주소 |
| `RESEND_FROM_EMAIL` | 선택. 커스텀 도메인을 Resend에 인증하지 않았다면 기본값(`onboarding@resend.dev`) 사용 |
| `NEXT_PUBLIC_SITE_URL` | 선택. 알림 메일 속 모임 링크에 쓰일 배포 도메인 (미설정 시 `http://localhost:3000`) |

### 3. 데이터베이스 마이그레이션

```bash
npm run db:push
```

스키마를 바꾼 뒤 정식 마이그레이션 파일을 남기고 싶다면 `npm run db:generate`로 SQL을 생성하고, 별도 마이그레이션 러너로 적용한다. `npm run db:studio`로 Drizzle Studio를 열어 데이터를 확인할 수도 있다.

### 4. 채팅용 RLS / Realtime 설정 (최초 1회, 수동)

`npm run db:push`로 테이블을 만든 뒤, Supabase 대시보드 > SQL Editor에서 [`supabase/rls.sql`](./supabase/rls.sql)의 내용을 실행한다. 브라우저가 채팅 메시지를 실시간으로 구독할 수 있도록 RLS 정책과 Realtime publication을 설정하는 스크립트다.

### 5. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

## 알아두면 좋은 것들

- 위치(건물) 드롭다운은 [`src/lib/buildings.ts`](./src/lib/buildings.ts)에 예시 데이터로 들어있다. 실제 학교/건물명으로 교체 필요.
- 매칭 상태 전이(모집중 → 매칭완료, 강제 제외 시 재모집 등)는 [`src/lib/matching.ts`](./src/lib/matching.ts)의 `recalcMeetupStatus`가 유일한 진입점이다. 매칭 조건을 바꿔야 한다면 이 함수만 수정하면 된다.
- 마감(시간 만료) 처리는 배치 작업 없이 읽는 시점에 계산하는 lazy 방식이다 ([`src/lib/meetup.ts`](./src/lib/meetup.ts)의 `getEffectiveStatus`). DB의 실제 status는 그대로 두고 화면에서만 "마감"으로 보여준다.
- 마이그레이션용 연결은 `drizzle.config.ts`, 앱 런타임 연결은 `src/lib/db.ts`가 각각 담당한다 (전자는 direct connection, 후자는 pooled connection).
- 테이블 스키마는 [`src/db/schema.ts`](./src/db/schema.ts)에 정의되어 있다.
- 모임 생성 시([`src/app/meetups/new/actions.ts`](./src/app/meetups/new/actions.ts))와 매칭 완료 전이 시([`src/app/meetups/[id]/actions.ts`](./src/app/meetups/[id]/actions.ts)의 `approveAction`) [`src/lib/email.ts`](./src/lib/email.ts)를 통해 관리자에게 알림 메일을 보낸다. 발송 실패는 로그만 남기고 핵심 동작(모임 생성/승인)을 막지 않는다.

## 배포 (Vercel)

- Vercel 프로젝트에 위 환경변수를 동일하게 등록한다.
- 스키마 변경 시 배포 전에 `npm run db:push` (또는 `db:generate` + 마이그레이션 적용)를 별도로 실행해야 한다. `npm run build`는 순수 `next build`만 수행한다.
