import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { SalesFiltersForm } from "@/features/sales/components/sales-filters";
import { SalesHeaderActions } from "@/features/sales/components/sales-header-actions";
import { SalesOrderList } from "@/features/sales/components/sales-order-list";
import { getSalesOverview } from "@/features/sales/queries/get-sales-list";
import { parseSalesSearchParams } from "@/features/sales/schemas/sales-search-schema";
import { formatCurrency } from "@/features/sales/services/sales-formatters";
import {
  canManageSales,
  canReadSales,
} from "@/features/sales/services/sales-permissions";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SalesPageSearchParams = Promise<{
  search?: string;
  status?: string;
  paymentStatus?: string;
  page?: string;
}>;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: SalesPageSearchParams;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);
  const resolvedSearchParams = await searchParams;
  const filters = parseSalesSearchParams(resolvedSearchParams);

  if (organizationState.status !== "single") {
    return (
      <OrganizationStateMessage
        title="Sales unavailable."
        message="Organization selection is required before sales orders can be viewed."
      />
    );
  }

  const role = organizationState.membership.role;

  if (!canReadSales(role)) {
    return (
      <OrganizationStateMessage
        title="You do not have access to sales."
        message="Ask an Owner or Admin for access to sales records."
      />
    );
  }

  const canManage = canManageSales(role);
  const overview = await getSalesOverview(
    supabase,
    organizationState.organization.id,
    filters,
  );

  if (!overview.ok) {
    return (
      <OrganizationStateMessage
        title="Unable to load sales."
        message={overview.message}
      />
    );
  }

  const { data } = overview;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Sales</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage sales orders, fulfillment, and customer payments for{" "}
            {organizationState.organization.name}.
          </p>
        </div>
        <SalesHeaderActions
          canManage={canManage}
          formOptions={data.formOptions}
          currencyCode={data.currencyCode}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total Orders
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {data.summary.totalOrders}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Confirmed Revenue
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(data.summary.confirmedRevenue, data.currencyCode)}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Outstanding Balance
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(data.summary.outstandingBalance, data.currencyCode)}
          </p>
        </div>
      </div>

      <SalesFiltersForm filters={data.filters} />

      <SalesOrderList data={data} canManage={canManage} />
    </section>
  );
}
