import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type { InviteMemberInput } from "../schemas/invite-member-schema";
import type { InvitationActionResult } from "../types/invitation";
import {
  INVITATION_MESSAGES,
  mapInvitationRpcError,
} from "./invitation-errors";
import {
  generateInvitationToken,
  getInvitationExpiryDate,
  hashInvitationToken,
} from "./invitation-tokens";
import { sendInvitationEmail } from "./send-invitation-email";

export async function createInvitation(
  supabase: SupabaseClient<Database>,
  organization: { id: string; name: string },
  input: InviteMemberInput,
): Promise<InvitationActionResult> {
  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = getInvitationExpiryDate();

  const { data, error } = await supabase.rpc("create_organization_invitation", {
    target_organization_id: organization.id,
    invited_email: input.email,
    assigned_role: input.role,
    invitation_token_hash: tokenHash,
    invitation_expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return mapInvitationRpcError(error);
  }

  const invitation = data?.[0];

  if (!invitation) {
    return {
      ok: false,
      code: "INVITATION_UNKNOWN",
      message: INVITATION_MESSAGES.unknown,
    };
  }

  try {
    await sendInvitationEmail({
      to: invitation.email,
      organizationName: organization.name,
      role: input.role,
      rawToken,
      expiresAt,
    });
  } catch {
    return {
      ok: false,
      code: "INVITATION_SEND_FAILED",
      message: INVITATION_MESSAGES.sendFailed,
    };
  }

  return {
    ok: true,
    code: invitation.was_resent ? "INVITATION_RESENT" : "INVITATION_CREATED",
    message: invitation.was_resent
      ? INVITATION_MESSAGES.resent
      : INVITATION_MESSAGES.created,
  };
}
