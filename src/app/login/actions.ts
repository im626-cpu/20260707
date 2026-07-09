"use server";

import { headers } from "next/headers";
import { isAllowedSchoolEmail, sanitizeRedirectPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type RequestMagicLinkResult =
  | { ok: true }
  | { ok: false; error: string };

export async function requestMagicLink(
  email: string,
  redirectTo: string,
): Promise<RequestMagicLinkResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    return { ok: false, error: "이메일을 입력해주세요." };
  }

  if (!isAllowedSchoolEmail(trimmedEmail)) {
    return {
      ok: false,
      error: "허용된 학교 이메일 도메인이 아닙니다.",
    };
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("host")}`;

  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("redirectTo", sanitizeRedirectPath(redirectTo));

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return { ok: false, error: "인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { ok: true };
}
