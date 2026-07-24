"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodErrorToActionState } from "@/lib/validation/zod-action-state";
import { revokeInvitationSchema } from "../schemas/invite-member-schema";
import { revokeInvitation } from "../services/revoke-invitation";

type RevokeInvitationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function getRequiredString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export async function revokeInvitationAction(
  _previousState: RevokeInvitationActionState,
  formData: FormData,
): Promise<RevokeInvitationActionState> {
  await requireAuthenticatedUser();
  const parsed = revokeInvitationSchema.safeParse({
    invitationId: getRequiredString(formData, "invitationId"),
  });

  if (!parsed.success) {
    return zodErrorToActionState(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const result = await revokeInvitation(supabase, parsed.data.invitationId);

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
