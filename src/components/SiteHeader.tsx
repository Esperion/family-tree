import Link from "next/link";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function SiteHeader() {
  const session = await auth();

  let isAdmin = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });
    isAdmin = user?.isSuperAdmin ?? false;
  }

  return (
    <header className="site-header">
      <Link href="/" className="site-brand">
        Family&nbsp;Tree
      </Link>

      <nav className="site-nav">
        {session?.user ? (
          <>
            {isAdmin && <span className="badge badge-admin">Admin</span>}
            <span className="site-user">{session.user.name ?? session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="link-button">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/signin" className="link-button">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
