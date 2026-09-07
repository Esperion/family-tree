import { redirect } from "next/navigation";

import { auth, signIn, googleConfigured, devLoginEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">Account</p>
        <h1>Sign in</h1>
        <p className="sub">
          Sign in to manage a family&apos;s data. Public families stay readable without an account.
        </p>
      </header>

      <div className="signin">
        {googleConfigured && (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button type="submit" className="button">
              Continue with Google
            </button>
          </form>
        )}

        {devLoginEnabled && (
          <form
            className="signin-dev"
            action={async (formData: FormData) => {
              "use server";
              await signIn("dev", {
                email: String(formData.get("email") ?? ""),
                redirectTo: "/",
              });
            }}
          >
            <label htmlFor="email">Dev sign-in — development only</label>
            <div className="signin-dev-row">
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="off"
              />
              <button type="submit" className="button">
                Sign in
              </button>
            </div>
          </form>
        )}

        {!googleConfigured && !devLoginEnabled && (
          <p className="sub">No sign-in method is configured on this deployment.</p>
        )}
      </div>
    </main>
  );
}
