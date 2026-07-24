"use client";

import { useActionState } from "react";
import { FieldError } from "@/features/auth/components/field-error";
import { FormMessage } from "@/features/auth/components/form-message";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { inviteMemberAction } from "../actions/invite-member";
import type { InvitationAssignableRole } from "../types/invitation";

const roleLabels: Record<InvitationAssignableRole, string> = {
  admin: "Admin",
  staff: "Staff",
};

const idleInviteMemberActionState = {
  status: "idle" as const,
};

type InviteMemberFormProps = {
  assignableRoles: InvitationAssignableRole[];
};

export function InviteMemberForm({ assignableRoles }: InviteMemberFormProps) {
  const [state, formAction] = useActionState(
    inviteMemberAction,
    idleInviteMemberActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-zinc-950"
      noValidate
    >
      <div>
        <h2 className="text-lg font-semibold">Invite member</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Send an email invitation to add a teammate to this organization.
        </p>
      </div>
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
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
          <label htmlFor="role" className="text-sm font-medium">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue={assignableRoles[0]}
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/15"
          >
            {assignableRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.role} />
        </div>
      </div>
      <SubmitButton>Send invitation</SubmitButton>
    </form>
  );
}
