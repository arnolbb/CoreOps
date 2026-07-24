import Link from "next/link";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined>,
  name: string,
) {
  const value = searchParams[name];
  return typeof value === "string" ? value : undefined;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getSafeRedirectPath(
    getStringParam(resolvedSearchParams, "next"),
    "/dashboard",
  );
  const signInHref = `/sign-in?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthFormShell
      title="Create account"
      description="Register with your email and password. You will confirm your email before signing in."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={signInHref}
            className="font-medium underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm nextPath={nextPath} />
    </AuthFormShell>
  );
}
