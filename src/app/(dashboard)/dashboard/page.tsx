import { DashboardKpiGrid } from "@/features/dashboard/components/dashboard-kpi-grid";
import { DashboardOnboardingBanner } from "@/features/dashboard/components/dashboard-onboarding-banner";
import { DashboardOperationalPanels } from "@/features/dashboard/components/dashboard-operational-panels";
import { getDashboardOverview } from "@/features/dashboard/queries/get-dashboard-overview";
import {
  getDashboardCapabilities,
  hasAnyDashboardCapability,
} from "@/features/dashboard/services/dashboard-permissions";
import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return (
      <OrganizationStateMessage
        title="Overview unavailable."
        message="Organization selection is required before workspace metrics can be loaded."
      />
    );
  }

  const role = organizationState.membership.role;
  const capabilities = getDashboardCapabilities(role);

  if (!hasAnyDashboardCapability(capabilities)) {
    return (
      <OrganizationStateMessage
        title="You do not have access to this overview."
        message="Ask an Owner or Admin to review your organization role permissions."
      />
    );
  }

  const overview = await getDashboardOverview(
    supabase,
    organizationState.organization.id,
    role,
  );

  if (!overview.ok) {
    return (
      <OrganizationStateMessage
        title="Unable to load overview."
        message={overview.message}
      />
    );
  }

  const { data } = overview;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Operational overview for {data.organization.name} (
          {data.monthPeriod.label} · {data.organization.resolvedTimezone}).
        </p>
      </div>

      {data.isEmptyOrganization ? (
        <DashboardOnboardingBanner capabilities={data.capabilities} />
      ) : null}

      <DashboardKpiGrid data={data} />

      <DashboardOperationalPanels data={data} />
    </section>
  );
}
