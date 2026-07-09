-- 채팅 Realtime 구독을 위한 RLS 설정
-- 실행 순서: `npm run db:push`로 테이블을 먼저 생성한 뒤,
-- Supabase 대시보드 > SQL Editor에서 이 파일 전체를 실행한다.
--
-- 배경: 앱의 일반적인 읽기/쓰기는 서버(Drizzle, pooled connection)를 통해서만 이루어지므로
-- RLS의 영향을 받지 않는다. 하지만 브라우저가 Supabase Realtime을 통해 ChatMessage 테이블 변경을
-- 직접 구독할 때는 anon key + 로그인 세션(auth.uid())을 기준으로 RLS 정책을 통과해야 한다.

alter table "ChatMessage" enable row level security;

create policy "chat_select_participants"
on "ChatMessage" for select
using (
  exists (
    select 1 from "Meetup" m
    where m.id = "ChatMessage"."meetupId"
      and m."hostId" = auth.uid()::text
  )
  or exists (
    select 1 from "Participation" p
    where p."meetupId" = "ChatMessage"."meetupId"
      and p."userId" = auth.uid()::text
      and p.status = 'APPROVED'
  )
);

create policy "chat_insert_participants"
on "ChatMessage" for insert
with check (
  "userId" = auth.uid()::text
  and (
    exists (
      select 1 from "Meetup" m
      where m.id = "ChatMessage"."meetupId"
        and m."hostId" = auth.uid()::text
    )
    or exists (
      select 1 from "Participation" p
      where p."meetupId" = "ChatMessage"."meetupId"
        and p."userId" = auth.uid()::text
        and p.status = 'APPROVED'
    )
  )
);

-- 브라우저가 postgres_changes(INSERT)를 구독할 수 있도록 Realtime publication에 추가
alter publication supabase_realtime add table "ChatMessage";
