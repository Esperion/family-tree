/** Pure registration-input rules. No imports, so it is trivially testable. */

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InputProblem = "invalid-email" | "weak-password";

/** Returns the first problem with the input, or null when it is acceptable. */
export function checkRegistrationInput(
  email: string,
  password: string,
): InputProblem | null {
  if (!EMAIL_RE.test(email.trim())) return "invalid-email";
  if (password.length < MIN_PASSWORD_LENGTH) return "weak-password";
  return null;
}
