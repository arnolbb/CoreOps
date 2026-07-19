import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "./session";

export const PASSWORD_RECOVERY_COOKIE = "coreops-password-recovery";

export const PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS = 15 * 60;

export async function setPasswordRecoveryCookie() {
  const cookieStore = await cookies();

  cookieStore.set(PASSWORD_RECOVERY_COOKIE, "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearPasswordRecoveryCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
}

export async function hasPasswordRecoveryCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value === "active";
}

export async function requirePasswordRecoverySession() {
  const hasRecoveryCookie = await hasPasswordRecoveryCookie();

  if (!hasRecoveryCookie) {
    redirect("/forgot-password?error=recovery-link-invalid");
  }

  return requireAuthenticatedUser();
}
