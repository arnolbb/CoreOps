import Link from "next/link";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthFormShell
      title="Create account"
      description="Register with your email and password. You will confirm your email before signing in."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthFormShell>
  );
}
