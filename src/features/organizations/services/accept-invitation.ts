import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type { InvitationActionResult } from "../types/invitation";
import {
  INVITATION_MESSAGES,
  mapInvitationRpcError,
} from "./invitation-errors";

export async function acceptInvitation(
  supabase: SupabaseClient<Database>,
  tokenHash: string,
): Promise<InvitationActionResult> {
  const { data, error } = await supabase.rpc("accept_organization_invitation", {
    invitation_token_hash: tokenHash,
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
    code: "INVITATION_ACCEPTED",
    message: INVITATION_MESSAGES.accepted,
  };
}
