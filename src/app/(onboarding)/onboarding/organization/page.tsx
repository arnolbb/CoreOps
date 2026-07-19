import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateOrganizationForm } from "@/features/organizations/components/create-organization-form";
import { OrganizationOnboardingShell } from "@/features/organizations/components/organization-onboarding-shell";
import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";

export default async function OrganizationOnboardingPage() {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (
    organizationState.status === "single" ||
    organizationState.status === "multiple"
  ) {
    redirect("/dashboard");
  }

  if (organizationState.status === "error") {
    return (
      <OrganizationOnboardingShell
        title="Organization setup unavailable"
        description="We could not confirm your organization access right now."
      >
        <OrganizationStateMessage
          title="Try again soon."
          message={organizationState.message}
        />
      </OrganizationOnboardingShell>
    );
  }

  return (
    <OrganizationOnboardingShell
      title="Create your organization"
      description="Set up the workspace that will hold your customers, products, inventory, sales, work orders, reports, and settings."
    >
      <CreateOrganizationForm />
    </OrganizationOnboardingShell>
  );
}
