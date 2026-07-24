"use client";

import { useActionState } from "react";
import { FormMessage } from "@/features/auth/components/form-message";
import { revokeInvitationAction } from "../actions/revoke-invitation";

const idleRevokeInvitationActionState = {
  status: "idle" as const,
};

export function RevokeInvitationButton({
  invitationId,
}: {
  invitationId: string;
}) {
  const [state, formAction, pending] = useActionState(
    revokeInvitationAction,
    idleRevokeInvitationActionState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
      >
        {pending ? "Revoking…" : "Revoke"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
