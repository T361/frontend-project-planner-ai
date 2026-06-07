import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/atoms/logo";
import { UserMenu } from "@/features/auth/user-menu";
import { getAuth } from "@/lib/auth";

/** Shell for all authenticated routes. Proxy guards too, but we re-check here. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getAuth();
  if (!user) redirect("/?auth=required");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <UserMenu
            email={user.email ?? ""}
            name={user.user_metadata?.full_name}
            avatarUrl={user.user_metadata?.avatar_url}
          />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
