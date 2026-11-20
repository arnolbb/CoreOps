import { InventoryBalanceList } from "@/features/inventory/components/inventory-balance-list";
import { InventoryFiltersForm } from "@/features/inventory/components/inventory-filters";
import { InventoryHeaderActions } from "@/features/inventory/components/inventory-header-actions";
import { InventoryLedgerList } from "@/features/inventory/components/inventory-ledger-list";
import { getInventoryOverview } from "@/features/inventory/queries/get-inventory-overview";
import { parseInventorySearchParams } from "@/features/inventory/schemas/inventory-search-schema";
import {
  canManageInventory,
  canReadInventory,
} from "@/features/inventory/services/inventory-permissions";
import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InventoryPageSearchParams = Promise<{
  search?: string;
  warehouseId?: string;
  stockFilter?: string;
  page?: string;
}>;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: InventoryPageSearchParams;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);
  const resolvedSearchParams = await searchParams;
  const filters = parseInventorySearchParams(resolvedSearchParams);

  if (organizationState.status !== "single") {
    return (
      <OrganizationStateMessage
        title="Inventory unavailable."
        message="Organization selection is required before inventory can be viewed."
      />
    );
  }

  const role = organizationState.membership.role;

  if (!canReadInventory(role)) {
    return (
      <OrganizationStateMessage
        title="You do not have access to inventory."
        message="Ask an Owner or Admin for access to inventory records."
      />
    );
  }

  const canManage = canManageInventory(role);
  const overview = await getInventoryOverview(
    supabase,
    organizationState.organization.id,
    filters,
  );

  if (!overview.ok) {
    return (
      <OrganizationStateMessage
        title="Unable to load inventory."
        message={overview.message}
      />
    );
  }

  const { data } = overview;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage warehouses, stock balances, and inventory ledger for{" "}
            {organizationState.organization.name}.
          </p>
        </div>
        <InventoryHeaderActions
          canManage={canManage}
          warehouses={data.warehouses}
          activeWarehouses={data.activeWarehouses}
          adjustableProducts={data.adjustableProducts}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Active Warehouses
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {data.summary.activeWarehouseCount}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Stock Entries
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {data.summary.trackedBalanceCount}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Low-Stock Alerts
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {data.summary.lowStockCount}
          </p>
        </div>
      </div>

      <InventoryFiltersForm
        filters={data.filters}
        warehouses={data.warehouses}
      />

      <InventoryBalanceList data={data} canManage={canManage} />

      <InventoryLedgerList items={data.ledger} />
    </section>
  );
}
