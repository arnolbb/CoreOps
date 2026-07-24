"use client";

import { useActionState } from "react";
import { FormMessage } from "@/features/auth/components/form-message";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { acceptInvitationAction } from "../actions/accept-invitation";

const idleAcceptInvitationActionState = {
  status: "idle" as const,
};

export function AcceptInvitationPanel() {
  const [state, formAction] = useActionState(
    acceptInvitationAction,
    idleAcceptInvitationActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <SubmitButton>Accept invitation</SubmitButton>
    </form>
  );
}
