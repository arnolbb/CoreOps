"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "../actions/update-password";
import { idleAuthActionState } from "../types/auth-action-result";
import { FieldError } from "./field-error";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(
    updatePasswordAction,
    idleAuthActionState,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/15"
        />
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
