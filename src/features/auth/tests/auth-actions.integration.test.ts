import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_MESSAGES } from "@/lib/auth/auth-errors";
import { requestPasswordResetAction } from "../actions/request-password-reset";
import { registerAction } from "../actions/register";

const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      signUp,
      resetPasswordForEmail,
    },
  }),
}));

describe("auth server actions", () => {
  beforeEach(() => {
    signUp.mockReset();
    resetPasswordForEmail.mockReset();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("registers with a safe confirmation callback URL", async () => {
    signUp.mockResolvedValue({ error: null });
    const formData = new FormData();
    formData.set("email", "User@Example.com");
    formData.set("password", "password123");

    const result = await registerAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "success",
      message: AUTH_MESSAGES.registrationSubmitted,
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
      options: {
        emailRedirectTo:
          "http://localhost:3000/auth/callback?flow=confirmation&next=%2Fdashboard",
      },
    });
  });

  it("does not call sign-up when registration input is invalid", async () => {
    const formData = new FormData();
    formData.set("email", "bad");
    formData.set("password", "short");

    const result = await registerAction({ status: "idle" }, formData);

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.email?.[0]).toBe("Enter a valid email address.");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("returns generic password reset success even if provider errors", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: new Error("no user") });
    const formData = new FormData();
    formData.set("email", "missing@example.com");

    const result = await requestPasswordResetAction(
      { status: "idle" },
      formData,
    );

    expect(result).toEqual({
      status: "success",
      message: AUTH_MESSAGES.passwordResetSent,
    });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("missing@example.com", {
      redirectTo:
        "http://localhost:3000/auth/callback?flow=recovery&next=%2Fupdate-password",
    });
  });
});
