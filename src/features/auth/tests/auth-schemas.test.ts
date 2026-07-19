import { describe, expect, it } from "vitest";
import {
  registerSchema,
  requestPasswordResetSchema,
  signInSchema,
  updatePasswordSchema,
} from "../schemas/auth-schemas";

describe("auth schemas", () => {
  it("normalizes registration email", () => {
    const parsed = registerSchema.parse({
      email: " USER@Example.COM ",
      password: "password123",
    });

    expect(parsed.email).toBe("user@example.com");
  });

  it("rejects short registration passwords", () => {
    expect(
      registerSchema.safeParse({ email: "user@example.com", password: "short" })
        .success,
    ).toBe(false);
  });

  it("requires sign-in password", () => {
    expect(
      signInSchema.safeParse({ email: "user@example.com", password: "" })
        .success,
    ).toBe(false);
  });

  it("validates password reset email", () => {
    expect(requestPasswordResetSchema.safeParse({ email: "bad" }).success).toBe(
      false,
    );
  });

  it("validates updated password", () => {
    expect(
      updatePasswordSchema.safeParse({ password: "newpass123" }).success,
    ).toBe(true);
  });
});
