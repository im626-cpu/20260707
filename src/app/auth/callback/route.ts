import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAllowedSchoolEmail, sanitizeRedirectPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = sanitizeRedirectPath(searchParams.get("redirectTo"));

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const { user: authUser } = data;

  // requestMagicLink에서만 도메인을 검사하므로, Supabase Auth API를 직접 호출해
  // 우회하는 경우를 막기 위해 세션 발급 시점에도 반드시 재검증한다.
  if (!authUser.email || !isAllowedSchoolEmail(authUser.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=domain", origin));
  }

  const defaultNickname = authUser.email.split("@")[0];

  await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      schoolEmail: authUser.email,
      nickname: defaultNickname,
    },
  });

  return NextResponse.redirect(new URL(redirectTo, origin));
}
