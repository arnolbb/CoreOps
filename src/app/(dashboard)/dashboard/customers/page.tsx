import { CustomerHeaderActions } from "@/features/customers/components/customer-header-actions";
import { CustomerList } from "@/features/customers/components/customer-list";
import { CustomerListFiltersForm } from "@/features/customers/components/customer-list-filters";
import { getCustomerList } from "@/features/customers/queries/get-customer-list";
import { parseCustomerListSearchParams } from "@/features/customers/schemas/customer-list-search-schema";
import {
  canManageCustomers,
  canReadCustomers,
} from "@/features/customers/services/customer-permissions";
import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CustomerPageSearchParams = Promise<{
  search?: string;
  status?: string;
  page?: string;
}>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: CustomerPageSearchParams;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);
  const resolvedSearchParams = await searchParams;
  const filters = parseCustomerListSearchParams(resolvedSearchParams);

  if (organizationState.status !== "single") {
    return (
      <OrganizationStateMessage
        title="Customers unavailable."
        message="Organization selection is required before customers can be listed."
      />
    );
  }

  if (!canReadCustomers(organizationState.membership.role)) {
    return (
      <OrganizationStateMessage
        title="You do not have access to customers."
        message="Ask an Owner or Admin for access to customer records."
      />
    );
  }

  const canManage = canManageCustomers(organizationState.membership.role);

  const customerList = await getCustomerList(
    supabase,
    organizationState.organization.id,
    filters,
  );

  if (!customerList.ok) {
    return (
      <OrganizationStateMessage
        title="Unable to load customers."
        message={customerList.message}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Search and review customer records for{" "}
            {organizationState.organization.name}.
          </p>
        </div>
        <CustomerHeaderActions
          canManage={canManage}
          organizationId={organizationState.organization.id}
        />
      </div>
      <CustomerListFiltersForm filters={customerList.data.filters} />
      <CustomerList data={customerList.data} />
    </section>
  );
}

