"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodErrorToActionState } from "@/lib/validation/zod-action-state";
import { getActiveOrganizationState } from "../queries/get-active-organization-memberships";
import { inviteMemberSchema } from "../schemas/invite-member-schema";
import { createInvitation } from "../services/create-invitation";
import { INVITATION_MESSAGES } from "../services/invitation-errors";

type InviteMemberActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function getRequiredString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export async function inviteMemberAction(
  _previousState: InviteMemberActionState,
  formData: FormData,
): Promise<InviteMemberActionState> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status === "none") {
    return {
      status: "error",
      message: INVITATION_MESSAGES.organizationRequired,
    };
  }

  if (organizationState.status === "multiple") {
    return {
      status: "error",
      message: INVITATION_MESSAGES.organizationSelectionRequired,
    };
  }

  if (organizationState.status === "error") {
    return {
      status: "error",
      message: organizationState.message,
    };
  }

  const parsed = inviteMemberSchema.safeParse({
    email: getRequiredString(formData, "email"),
    role: getRequiredString(formData, "role"),
  });

  if (!parsed.success) {
    return zodErrorToActionState(parsed.error);
  }

  const result = await createInvitation(
    supabase,
    organizationState.organization,
    parsed.data,
  );

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
    };
  }

  revalidatePath("/team");

  return {
    status: "success",
    message: result.message,
  };
}
