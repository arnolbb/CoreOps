import { InviteMemberForm } from "@/features/organizations/components/invite-member-form";
import { InvitationList } from "@/features/organizations/components/invitation-list";
import { MemberList } from "@/features/organizations/components/member-list";
import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { getTeamPageData } from "@/features/organizations/queries/get-team-page-data";
import type { InvitationAssignableRole } from "@/features/organizations/types/invitation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getAssignableRoles(role: string): InvitationAssignableRole[] {
  if (role === "owner") {
    return ["admin", "staff"];
  }

  if (role === "admin") {
    return ["staff"];
  }

  return [];
}

export default async function TeamPage() {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return (
      <OrganizationStateMessage
        title="Team unavailable."
        message="Organization selection is required before team invitations can be managed."
      />
    );
  }

  const assignableRoles = getAssignableRoles(organizationState.membership.role);

  if (assignableRoles.length === 0) {
    return (
      <OrganizationStateMessage
        title="You do not have access to invite members."
        message="Ask an Owner or Admin to send organization invitations."
      />
    );
  }

  const teamData = await getTeamPageData(
    supabase,
    organizationState.organization.id,
  );

  if (!teamData.ok) {
    return (
      <OrganizationStateMessage
        title="Unable to load team."
        message={teamData.message}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Invite and manage people in {organizationState.organization.name}.
        </p>
      </div>
      <InviteMemberForm assignableRoles={assignableRoles} />
      <MemberList members={teamData.members} />
      <InvitationList invitations={teamData.invitations} />
    </section>
  );
}
