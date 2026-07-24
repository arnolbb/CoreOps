import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type {
  InvitationAssignableRole,
  InvitationPreview,
  InvitationStatus,
} from "../types/invitation";

export type InvitationPreviewResult =
  | {
      ok: true;
      preview: InvitationPreview;
    }
  | {
      ok: false;
      status: "invalid" | "expired" | "revoked" | "accepted" | "unknown";
      message: string;
    };

function isAssignableRole(value: string): value is InvitationAssignableRole {
  return value === "admin" || value === "staff";
}

function isInvitationStatus(value: string): value is InvitationStatus {
  return (
    value === "pending" ||
    value === "accepted" ||
    value === "revoked" ||
    value === "expired"
  );
}

export async function getInvitationPreview(
  supabase: SupabaseClient<Database>,
  tokenHash: string,
): Promise<InvitationPreviewResult> {
  const { data, error } = await supabase.rpc(
    "get_organization_invitation_preview",
    {
      invitation_token_hash: tokenHash,
    },
  );

  if (error) {
    return {
      ok: false,
      status: "unknown",
      message: "Something went wrong. Try again.",
    };
  }

  const preview = data?.[0];

  if (!preview) {
    return {
      ok: false,
      status: "invalid",
      message: "This invitation link is invalid.",
    };
  }

  if (preview.invitation_status === "expired") {
    return {
      ok: false,
      status: "expired",
      message: "This invitation expired. Ask for a new invitation.",
    };
  }

  if (preview.invitation_status === "revoked") {
    return {
      ok: false,
      status: "revoked",
      message: "This invitation is no longer valid.",
    };
  }

  if (preview.invitation_status === "accepted") {
    return {
      ok: false,
      status: "accepted",
      message: "This invitation has already been used.",
    };
  }

  if (
    !isInvitationStatus(preview.invitation_status) ||
    !isAssignableRole(preview.assigned_role)
  ) {
    return {
      ok: false,
      status: "invalid",
      message: "This invitation link is invalid.",
    };
  }

  return {
    ok: true,
    preview: {
      status: preview.invitation_status,
      organizationName: preview.organization_name,
      email: preview.invited_email,
      role: preview.assigned_role,
      expiresAt: preview.expires_at,
    },
  };
}
