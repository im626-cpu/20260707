import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/logout/actions";

export default async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/meetups" className="text-sm font-semibold">
          캠퍼스 배달메이트
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/meetups" className="text-neutral-600 hover:text-neutral-900">
            게시판
          </Link>
          {user ? (
            <>
              <Link href="/my" className="text-neutral-600 hover:text-neutral-900">
                마이페이지
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-neutral-600 hover:text-neutral-900">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-neutral-600 hover:text-neutral-900">
              로그인
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
