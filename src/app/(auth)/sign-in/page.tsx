import Link from "next/link";
import { AUTH_MESSAGES } from "@/lib/auth/auth-errors";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { SignInForm } from "@/features/auth/components/sign-in-form";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined>,
  name: string,
) {
  const value = searchParams[name];
  return typeof value === "string" ? value : undefined;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = await searchParams;
  const messageParam = getStringParam(resolvedSearchParams, "message");
  const nextPath = getSafeRedirectPath(
    getStringParam(resolvedSearchParams, "next"),
    "/dashboard",
  );
  const message =
    messageParam === "password-updated"
      ? AUTH_MESSAGES.passwordUpdated
      : undefined;

  return (
    <AuthFormShell
      title="Sign in"
      description="Use your CoreOps account to continue."
      footer={
        <>
          Need an account?{" "}
          <Link
            href="/register"
            className="font-medium underline underline-offset-4"
          >
            Register
          </Link>
        </>
      }
    >
      <SignInForm nextPath={nextPath} message={message} />
    </AuthFormShell>
  );
}
