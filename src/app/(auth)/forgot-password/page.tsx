import Link from "next/link";
import { AUTH_MESSAGES } from "@/lib/auth/auth-errors";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined>,
  name: string,
) {
  const value = searchParams[name];
  return typeof value === "string" ? value : undefined;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const errorParam = getStringParam(resolvedSearchParams, "error");
  const errorMessage =
    errorParam === "recovery-link-invalid"
      ? AUTH_MESSAGES.invalidRecoveryLink
      : undefined;

  return (
    <AuthFormShell
      title="Reset password"
      description="Enter your email and we will send password reset instructions."
      footer={
        <Link
          href="/sign-in"
          className="font-medium underline underline-offset-4"
        >
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm errorMessage={errorMessage} />
    </AuthFormShell>
  );
}
