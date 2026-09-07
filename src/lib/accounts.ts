import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import {
  checkRegistrationInput,
  type InputProblem,
} from "@/lib/password-rules";

export { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";

export type RegistrationProblem = InputProblem | "email-taken";

export type RegisterResult =
  | { ok: true; email: string }
  | { ok: false; problem: RegistrationProblem };

/** Validate, check the address is free, then create the account. */
export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<RegisterResult> {
  const email = input.email.trim().toLowerCase();

  const shapeProblem = checkRegistrationInput(email, input.password);
  if (shapeProblem) return { ok: false, problem: shapeProblem };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return { ok: false, problem: "email-taken" };

  const passwordHash = await bcrypt.hash(input.password, 12);
  const name = input.name?.trim() || email.split("@")[0];

  await prisma.user.create({ data: { email, name, passwordHash } });
  return { ok: true, email };
}
