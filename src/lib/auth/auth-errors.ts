export const AUTH_MESSAGES = {
  invalidCredentials: "Invalid email or password.",
  genericFailure: "Something went wrong. Try again.",
  passwordResetSent:
    "If an account exists, we sent password reset instructions.",
  registrationSubmitted: "Check your email to confirm your account.",
  passwordUpdated: "Password updated. Sign in with your new password.",
  invalidRecoveryLink: "Reset link expired or invalid. Request a new one.",
} as const;

const invalidCredentialMessages = [
  "invalid login credentials",
  "email not confirmed",
  "invalid credentials",
];

export function getSafeAuthErrorMessage(error: unknown) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message).toLowerCase()
      : "";

  if (
    invalidCredentialMessages.some((invalidMessage) =>
      message.includes(invalidMessage),
    )
  ) {
    return AUTH_MESSAGES.invalidCredentials;
  }

  return AUTH_MESSAGES.genericFailure;
}
