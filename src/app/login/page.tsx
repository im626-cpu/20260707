import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-2 text-xl font-semibold">로그인</h1>
      <p className="mb-6 text-sm text-neutral-500">
        학교 이메일로 인증 링크를 받아 로그인합니다.
      </p>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
