"use server";

import { redirect } from "next/navigation";
import { getSafeAuthErrorMessage } from "@/lib/auth/auth-errors";
import { getRequiredString } from "@/lib/auth/form-data";
import {
  clearPasswordRecoveryCookie,
  requirePasswordRecoverySession,
} from "@/lib/auth/recovery-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodErrorToActionState } from "@/lib/validation/zod-action-state";
import { updatePasswordSchema } from "../schemas/auth-schemas";
import type { AuthActionState } from "../types/auth-action-result";

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  await requirePasswordRecoverySession();

  const parsed = updatePasswordSchema.safeParse({
    password: getRequiredString(formData, "password"),
  });

  if (!parsed.success) {
    return zodErrorToActionState(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: getSafeAuthErrorMessage(error),
    };
  }

  await supabase.auth.signOut();
  await clearPasswordRecoveryCookie();

  redirect("/sign-in?message=password-updated");
}
