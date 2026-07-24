import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type { InvitationActionResult } from "../types/invitation";
import {
  INVITATION_MESSAGES,
  mapInvitationRpcError,
} from "./invitation-errors";

export async function revokeInvitation(
  supabase: SupabaseClient<Database>,
  invitationId: string,
): Promise<InvitationActionResult> {
  const { data, error } = await supabase.rpc("revoke_organization_invitation", {
    invitation_id: invitationId,
  });

  if (error) {
    return mapInvitationRpcError(error);
  }

  if (!data?.[0]) {
    return {
      ok: false,
      code: "INVITATION_UNKNOWN",
      message: INVITATION_MESSAGES.unknown,
    };
  }

  return {
    ok: true,
    code: "INVITATION_REVOKED",
    message: INVITATION_MESSAGES.revoked,
  };
}
