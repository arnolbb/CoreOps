"use server";

import { AUTH_MESSAGES } from "@/lib/auth/auth-errors";
import { buildAuthCallbackUrl } from "@/lib/auth/callback-url";
import { getRequiredString } from "@/lib/auth/form-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodErrorToActionState } from "@/lib/validation/zod-action-state";
import { requestPasswordResetSchema } from "../schemas/auth-schemas";
import type { AuthActionState } from "../types/auth-action-result";

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: getRequiredString(formData, "email"),
  });

  if (!parsed.success) {
    return zodErrorToActionState(parsed.error);
  }

  const supabase = await createSupabaseServerClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: buildAuthCallbackUrl("recovery", "/update-password"),
  });

  return {
    status: "success",
    message: AUTH_MESSAGES.passwordResetSent,
  };
}
