# 캠퍼스 배달메이트 매칭 서비스

같은 대학 캠퍼스 안에서 배달 최소 주문 금액을 함께 채울 사람을 찾는 매칭 서비스. 자세한 기획은 [PRD.md](./PRD.md) 참고.

## 기술 스택

- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (Postgres / Auth / Realtime)
- Prisma 7 (driver adapter 방식, `@prisma/adapter-pg` 사용)

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
| `DIRECT_URL` | Supabase 프로젝트 > Connect > Direct connection (포트 5432) — `prisma migrate`용 |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 프로젝트 Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | 프로젝트 Settings > API (서버 전용, 아직 코드에서는 미사용이지만 추후 관리자 작업용으로 확보) |
| `ALLOWED_EMAIL_DOMAINS` | 로그인 허용할 학교 이메일 도메인 (쉼표로 여러 개 가능, 예: `snu.ac.kr`) |

### 3. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev --name init
```

### 4. 채팅용 RLS / Realtime 설정 (최초 1회, 수동)

`npx prisma migrate dev`로 테이블을 만든 뒤, Supabase 대시보드 > SQL Editor에서 [`supabase/rls.sql`](./supabase/rls.sql)의 내용을 실행한다. 브라우저가 채팅 메시지를 실시간으로 구독할 수 있도록 RLS 정책과 Realtime publication을 설정하는 스크립트다.

### 5. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

## 알아두면 좋은 것들

- 위치(건물) 드롭다운은 [`src/lib/buildings.ts`](./src/lib/buildings.ts)에 예시 데이터로 들어있다. 실제 학교/건물명으로 교체 필요.
- 매칭 상태 전이(모집중 → 매칭완료, 강제 제외 시 재모집 등)는 [`src/lib/matching.ts`](./src/lib/matching.ts)의 `recalcMeetupStatus`가 유일한 진입점이다. 매칭 조건을 바꿔야 한다면 이 함수만 수정하면 된다.
- 마감(시간 만료) 처리는 배치 작업 없이 읽는 시점에 계산하는 lazy 방식이다 ([`src/lib/meetup.ts`](./src/lib/meetup.ts)의 `getEffectiveStatus`). DB의 실제 status는 그대로 두고 화면에서만 "마감"으로 보여준다.
- Prisma 7부터 `schema.prisma`에 `url`을 직접 쓸 수 없다. 마이그레이션용 연결은 `prisma.config.ts`, 앱 런타임 연결은 `src/lib/prisma.ts`의 driver adapter가 각각 담당한다.

## 배포 (Vercel)

- Vercel 프로젝트에 위 환경변수를 동일하게 등록한다.
- `npm run build`는 `prisma generate && next build`로 설정되어 있어, 빌드 시점에 항상 최신 스키마로 Prisma Client를 재생성한다.
