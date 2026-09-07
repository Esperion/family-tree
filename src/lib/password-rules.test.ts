import { describe, expect, it } from "vitest";

import { checkRegistrationInput, MIN_PASSWORD_LENGTH } from "./password-rules";

describe("checkRegistrationInput", () => {
  it("accepts a well-formed email and long-enough password", () => {
    expect(
      checkRegistrationInput("someone@example.com", "a".repeat(MIN_PASSWORD_LENGTH)),
    ).toBeNull();
  });

  it("rejects a malformed email", () => {
    expect(checkRegistrationInput("someone@", "longenough")).toBe("invalid-email");
    expect(checkRegistrationInput("no-at-sign", "longenough")).toBe("invalid-email");
    expect(checkRegistrationInput("spaces in@example.com", "longenough")).toBe("invalid-email");
  });

  it("rejects a password shorter than the minimum", () => {
    expect(
      checkRegistrationInput("someone@example.com", "a".repeat(MIN_PASSWORD_LENGTH - 1)),
    ).toBe("weak-password");
  });

  it("reports the email problem before the password problem", () => {
    expect(checkRegistrationInput("bad", "short")).toBe("invalid-email");
  });
});
