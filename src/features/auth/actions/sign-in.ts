"use server";

import { redirect } from "next/navigation";
import { getSafeAuthErrorMessage } from "@/lib/auth/auth-errors";
import { getRequiredString } from "@/lib/auth/form-data";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodErrorToActionState } from "@/lib/validation/zod-action-state";
import { signInSchema } from "../schemas/auth-schemas";
import type { AuthActionState } from "../types/auth-action-result";

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: getRequiredString(formData, "email"),
    password: getRequiredString(formData, "password"),
    next: getRequiredString(formData, "next"),
  });

  if (!parsed.success) {
    return zodErrorToActionState(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: getSafeAuthErrorMessage(error),
    };
  }

  redirect(getSafeRedirectPath(parsed.data.next, "/dashboard"));
}
