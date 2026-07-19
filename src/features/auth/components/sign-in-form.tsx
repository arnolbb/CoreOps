"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "../actions/sign-in";
import { idleAuthActionState } from "../types/auth-action-result";
import { FieldError } from "./field-error";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

type SignInFormProps = {
  nextPath: string;
  message?: string;
};

export function SignInForm({ nextPath, message }: SignInFormProps) {
  const [state, formAction] = useActionState(signInAction, {
    ...idleAuthActionState,
    ...(message ? { status: "success" as const, message } : null),
  });

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={nextPath} />
      <FormMessage state={state} />
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/15"
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-sm underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/15"
        />
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
