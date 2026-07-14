import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedSchoolEmail(email: string): boolean {
  // TODO(temp): 테스트를 위해 학교 이메일 도메인 제한을 임시로 비활성화. 아래 early return을
  // 지우면 ALLOWED_EMAIL_DOMAINS 기반 검증으로 되돌아간다.
  if (email.includes("@")) return true;

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return allowedDomains().includes(domain);
}

const DEFAULT_REDIRECT_PATH = "/meetups";

/** 오픈 리다이렉트 방지: 같은 오리진의 상대 경로만 허용하고, 그 외는 기본 경로로 대체. */
export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path) return DEFAULT_REDIRECT_PATH;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return DEFAULT_REDIRECT_PATH;
  }
  return path;
}

/** 로그인된 경우 Supabase 세션 + User row를 함께 반환. 비로그인 시 null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, authUser.id) });
  return user ?? null;
}
