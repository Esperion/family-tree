import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn, googleConfigured } from "@/lib/auth";
import { registerUser, MIN_PASSWORD_LENGTH } from "@/lib/accounts";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  "bad-credentials": "Email or password is incorrect.",
  "invalid-email": "Enter a valid email address.",
  "weak-password": `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  "email-taken": "An account with that email already exists — sign in instead.",
};

async function signInWithPassword(formData: FormData) {
  "use server";
  try {
    await signIn("password", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/signin?error=bad-credentials");
    throw error;
  }
}

async function createAccount(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");

  const result = await registerUser({ email, password, name });
  if (!result.ok) redirect(`/signin?mode=register&error=${result.problem}`);

  try {
    await signIn("password", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/signin?error=bad-credentials");
    throw error;
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;
  const message = error ? (MESSAGES[error] ?? "Something went wrong.") : null;

  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">Account</p>
        <h1>Sign in</h1>
        <p className="sub">
          Sign in to manage a family&apos;s data. Public families stay readable without an account.
        </p>
      </header>

      {message && <p className="signin-error">{message}</p>}

      <div className="signin">
        <form className="signin-form" action={signInWithPassword}>
          <h2>Sign in</h2>
          <label htmlFor="si-email">Email</label>
          <input id="si-email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="si-password">Password</label>
          <input
            id="si-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
          <button type="submit" className="button">
            Sign in
          </button>
        </form>

        <form className="signin-form" action={createAccount}>
          <h2>Create an account</h2>
          <label htmlFor="su-name">Name</label>
          <input id="su-name" name="name" type="text" autoComplete="name" placeholder="optional" />
          <label htmlFor="su-email">Email</label>
          <input id="su-email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="su-password">Password</label>
          <input
            id="su-password"
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
          <button type="submit" className="button">
            Create account
          </button>
        </form>

        {googleConfigured && (
          <form
            className="signin-google"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button type="submit" className="button button-secondary">
              Continue with Google
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
