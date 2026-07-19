import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type {
  ActiveOrganizationMembership,
  ActiveOrganizationState,
  OrganizationSummary,
} from "../types/organization";

const safeMembershipError = "Unable to load organization access. Try again.";

export async function getActiveOrganizationState(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ActiveOrganizationState> {
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(2);

  if (membershipsError) {
    return {
      status: "error",
      message: safeMembershipError,
    };
  }

  const activeMemberships: ActiveOrganizationMembership[] = (
    memberships ?? []
  ).map((membership) => ({
    organizationId: membership.organization_id,
    role: membership.role,
  }));

  if (activeMemberships.length === 0) {
    return { status: "none" };
  }

  if (activeMemberships.length > 1) {
    return {
      status: "multiple",
      memberships: activeMemberships,
    };
  }

  const [membership] = activeMemberships;
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", membership.organizationId)
    .single();

  if (organizationError || !organization) {
    return {
      status: "error",
      message: safeMembershipError,
    };
  }

  const organizationSummary: OrganizationSummary = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  };

  return {
    status: "single",
    membership,
    organization: organizationSummary,
  };
}
