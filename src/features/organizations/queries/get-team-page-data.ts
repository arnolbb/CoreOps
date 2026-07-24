import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type {
  InvitationAssignableRole,
  InvitationStatus,
  OrganizationInvitation,
  TeamMember,
} from "../types/invitation";

const safeTeamError = "Unable to load team data. Try again.";

export type TeamPageDataResult =
  | {
      ok: true;
      members: TeamMember[];
      invitations: OrganizationInvitation[];
    }
  | {
      ok: false;
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

export async function getTeamPageData(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<TeamPageDataResult> {
  const { data: members, error: membersError } = await supabase.rpc(
    "get_organization_team_members",
    { target_organization_id: organizationId },
  );

  if (membersError) {
    return { ok: false, message: safeTeamError };
  }

  const { data: invitations, error: invitationsError } = await supabase
    .from("organization_invitations")
    .select("id, email, role, status, expires_at, invited_by, last_sent_at")
    .eq("organization_id", organizationId)
    .in("status", ["pending", "expired", "revoked"])
    .order("created_at", { ascending: false });

  if (invitationsError) {
    return { ok: false, message: safeTeamError };
  }

  return {
    ok: true,
    members: (members ?? []).map((member) => ({
      membershipId: member.membership_id,
      userId: member.user_id,
      email: member.email,
      role: member.role,
      status: member.status,
      joinedAt: member.joined_at,
    })),
    invitations: (invitations ?? []).flatMap((invitation) => {
      if (
        !isAssignableRole(invitation.role) ||
        !isInvitationStatus(invitation.status)
      ) {
        return [];
      }

      const status =
        invitation.status === "pending" &&
        new Date(invitation.expires_at).getTime() <= Date.now()
          ? "expired"
          : invitation.status;

      return [
        {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status,
          expiresAt: invitation.expires_at,
          invitedBy: invitation.invited_by,
          lastSentAt: invitation.last_sent_at,
        },
      ];
    }),
  };
}
