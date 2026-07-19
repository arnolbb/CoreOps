import { requirePasswordRecoverySession } from "@/lib/auth/recovery-session";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";

export default async function UpdatePasswordPage() {
  await requirePasswordRecoverySession();

  return (
    <AuthFormShell
      title="Update password"
      description="Enter a new password for your CoreOps account."
    >
      <UpdatePasswordForm />
    </AuthFormShell>
  );
}
