import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "../auth-errors";

describe("getSafeAuthErrorMessage", () => {
  it("maps invalid credentials to a safe message", () => {
    expect(
      getSafeAuthErrorMessage(new Error("Invalid login credentials")),
    ).toBe(AUTH_MESSAGES.invalidCredentials);
  });

  it("hides unexpected auth error details", () => {
    expect(getSafeAuthErrorMessage(new Error("database host failed"))).toBe(
      AUTH_MESSAGES.genericFailure,
    );
  });
});
