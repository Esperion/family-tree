"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/lib/auth";
import { registerUser } from "@/lib/accounts";

/** Sign in with email + password, then land on the home page. */
export async function signInWithPassword(formData: FormData) {
  try {
    await signIn("password", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/signin?error=bad-credentials");
    throw error; // re-throw the NEXT_REDIRECT that a successful sign-in raises
  }
}

/** Create an account, sign the new user in, then land on the home page. */
export async function createAccount(formData: FormData) {
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

/** Sign out and land on the home page, wherever the user triggered it. */
export async function signOutToHome() {
  await signOut({ redirectTo: "/" });
}
