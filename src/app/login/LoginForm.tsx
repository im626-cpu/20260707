"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { requestMagicLink } from "./actions";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/meetups";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const result = await requestMagicLink(email, redirectTo);

    if (result.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
      setErrorMessage(result.error);
    }
  }

  return (
    <>
      {status === "sent" ? (
        <p className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          {email}로 인증 메일을 보냈습니다. 메일함을 확인해주세요.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="학교 이메일 (예: student@example.ac.kr)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {status === "loading" ? "전송 중..." : "인증 메일 받기"}
          </button>
        </form>
      )}
    </>
  );
}
