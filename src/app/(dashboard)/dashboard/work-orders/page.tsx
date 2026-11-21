import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { WorkOrderFiltersForm } from "@/features/work-orders/components/work-order-filters";
import { WorkOrderHeaderActions } from "@/features/work-orders/components/work-order-header-actions";
import { WorkOrderList } from "@/features/work-orders/components/work-order-list";
import { getWorkOrdersOverview } from "@/features/work-orders/queries/get-work-orders";
import { parseWorkOrderSearchParams } from "@/features/work-orders/schemas/work-order-search-schema";
import {
  canManageWorkOrders,
  canReadWorkOrders,
} from "@/features/work-orders/services/work-order-permissions";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WorkOrdersPageSearchParams = Promise<{
  search?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  page?: string;
}>;

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: WorkOrdersPageSearchParams;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);
  const resolvedSearchParams = await searchParams;
  const filters = parseWorkOrderSearchParams(resolvedSearchParams);

  if (organizationState.status !== "single") {
    return (
      <OrganizationStateMessage
        title="Work orders unavailable."
        message="Organization selection is required before work orders can be viewed."
      />
    );
  }

  const role = organizationState.membership.role;

  if (!canReadWorkOrders(role)) {
    return (
      <OrganizationStateMessage
        title="You do not have access to work orders."
        message="Ask an Owner or Admin for access to work order records."
      />
    );
  }

  const canManage = canManageWorkOrders(role);
  const isTechnician = role === "technician";

  const overview = await getWorkOrdersOverview(
    supabase,
    organizationState.organization.id,
    role,
    filters,
    { userId: user.id, userEmail: user.email },
  );

  if (!overview.ok) {
    return (
      <OrganizationStateMessage
        title="Unable to load work orders."
        message={overview.message}
      />
    );
  }

  const { data } = overview;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Work Orders</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Schedule, assign, and track field service and operational tasks for{" "}
            {organizationState.organization.name}.
          </p>
        </div>
        <WorkOrderHeaderActions
          canManage={canManage}
          isTechnician={isTechnician}
          customers={data.customers}
          addresses={data.addresses}
          assignees={data.assignees}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total Work Orders
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {data.summary.totalCount}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            In Progress
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {data.summary.inProgressCount}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Scheduled
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {data.summary.scheduledCount}
          </p>
        </div>
      </div>

      <WorkOrderFiltersForm
        filters={data.filters}
        assignees={data.assignees}
        isTechnician={isTechnician}
      />

      <WorkOrderList data={data} />
    </section>
  );
}
