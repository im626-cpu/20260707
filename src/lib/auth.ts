import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedSchoolEmail(email: string): boolean {
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

/** 로그인된 경우 Supabase 세션 + Prisma User row를 함께 반환. 비로그인 시 null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  return user;
}
