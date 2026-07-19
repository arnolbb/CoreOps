"use server";

import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "@/lib/auth/auth-errors";
import { buildAuthCallbackUrl } from "@/lib/auth/callback-url";
import { getRequiredString } from "@/lib/auth/form-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodErrorToActionState } from "@/lib/validation/zod-action-state";
import { registerSchema } from "../schemas/auth-schemas";
import type { AuthActionState } from "../types/auth-action-result";

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    email: getRequiredString(formData, "email"),
    password: getRequiredString(formData, "password"),
  });

  if (!parsed.success) {
    return zodErrorToActionState(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl("confirmation", "/dashboard"),
    },
  });

  if (error) {
    return {
      status: "error",
      message: getSafeAuthErrorMessage(error),
    };
  }

  return {
    status: "success",
    message: AUTH_MESSAGES.registrationSubmitted,
  };
}
