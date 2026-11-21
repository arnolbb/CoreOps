import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import {
  formatAuditActionSummary,
  formatInventoryTransactionLabel,
  formatStatusLabel,
} from "../services/dashboard-formatting";
import { getDashboardCapabilities } from "../services/dashboard-permissions";
import {
  getCurrentMonthBoundariesUtc,
  type MonthBoundariesUtc,
} from "../services/timezone-boundaries";
import type {
  DashboardActiveWorkOrderItem,
  DashboardActivityItem,
  DashboardCapabilities,
  DashboardLowStockItem,
  DashboardOverviewData,
} from "../types/dashboard";

const SAFE_DASHBOARD_LOAD_ERROR = "Unable to load dashboard. Try again.";
const LOW_STOCK_DISPLAY_LIMIT = 5;
const ACTIVE_WORK_ORDERS_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 8;
const OPERATIONAL_ACTIVITY_PER_SOURCE_LIMIT = 5;

export type DashboardOverviewResult =
  | {
      ok: true;
      data: DashboardOverviewData;
    }
  | {
      ok: false;
      message: string;
    };

function toCents(value: number | string | null | undefined): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.round(numeric * 100);
}

function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function formatQuantityDelta(delta: number, unit: string): string {
  const rounded = Number(delta.toFixed(3));
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded} ${unit}`;
}

type CustomerSummaryResult =
  | { ok: true; activeCustomerCount: number | null }
  | { ok: false };

async function fetchCustomerSummary(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  capabilities: DashboardCapabilities,
): Promise<CustomerSummaryResult> {
  if (!capabilities.canReadCustomers) {
    return { ok: true, activeCustomerCount: null };
  }

  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (error) {
    return { ok: false };
  }

  return { ok: true, activeCustomerCount: count ?? 0 };
}

type SalesSummaryResult =
  | {
      ok: true;
      monthlySalesCount: number | null;
      monthlySalesTotal: number | null;
      outstandingOrdersCount: number | null;
      outstandingTotal: number | null;
      anySalesOrderCount: number;
      recentActivity: DashboardActivityItem[];
    }
  | { ok: false };

async function fetchSalesSummary(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  capabilities: DashboardCapabilities,
  monthBoundaries: MonthBoundariesUtc,
): Promise<SalesSummaryResult> {
  if (!capabilities.canReadSales) {
    return {
      ok: true,
      monthlySalesCount: null,
      monthlySalesTotal: null,
      outstandingOrdersCount: null,
      outstandingTotal: null,
      anySalesOrderCount: 0,
      recentActivity: [],
    };
  }

  const monthlyPromise = capabilities.canViewFinancialTotals
    ? supabase
        .from("sales_orders")
        .select("id, grand_total", { count: "exact" })
        .eq("organization_id", organizationId)
        .in("status", ["confirmed", "completed"])
        .gte("created_at", monthBoundaries.startIso)
        .lt("created_at", monthBoundaries.endIso)
    : supabase
        .from("sales_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["confirmed", "completed"])
        .gte("created_at", monthBoundaries.startIso)
        .lt("created_at", monthBoundaries.endIso);

  const outstandingPromise = capabilities.canViewFinancialTotals
    ? supabase
        .from("sales_orders")
        .select("id, grand_total, paid_total", { count: "exact" })
        .eq("organization_id", organizationId)
        .in("status", ["confirmed", "completed"])
        .in("payment_status", ["unpaid", "partially_paid"])
    : supabase
        .from("sales_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["confirmed", "completed"])
        .in("payment_status", ["unpaid", "partially_paid"]);

  const recentOrCountPromise = capabilities.canViewAuditActivity
    ? supabase
        .from("sales_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
    : supabase
        .from("sales_orders")
        .select("id, order_number, status, updated_at, created_at", {
          count: "exact",
        })
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(OPERATIONAL_ACTIVITY_PER_SOURCE_LIMIT);

  const [monthlyResult, outstandingResult, recentResult] = await Promise.all([
    monthlyPromise,
    outstandingPromise,
    recentOrCountPromise,
  ]);

  if (monthlyResult.error || outstandingResult.error || recentResult.error) {
    return { ok: false };
  }

  const monthlyRows = monthlyResult.data ?? [];
  const monthlySalesCount = monthlyResult.count ?? monthlyRows.length;
  const monthlySalesTotal = capabilities.canViewFinancialTotals
    ? fromCents(
        monthlyRows.reduce((sum, row) => {
          const total = "grand_total" in row ? row.grand_total : 0;
          return sum + toCents(total);
        }, 0),
      )
    : null;

  const outstandingRows = outstandingResult.data ?? [];
  const outstandingOrdersCount =
    outstandingResult.count ?? outstandingRows.length;
  const outstandingTotal = capabilities.canViewFinancialTotals
    ? fromCents(
        outstandingRows.reduce((sum, row) => {
          const grandTotal = "grand_total" in row ? row.grand_total : 0;
          const paidTotal = "paid_total" in row ? row.paid_total : 0;
          return sum + Math.max(0, toCents(grandTotal) - toCents(paidTotal));
        }, 0),
      )
    : null;

  const recentRows = recentResult.data ?? [];
  const anySalesOrderCount = recentResult.count ?? recentRows.length;

  const recentActivity: DashboardActivityItem[] =
    capabilities.canViewAuditActivity
      ? []
      : recentRows.flatMap((row) => {
          if (!("order_number" in row)) {
            return [];
          }

          return [
            {
              id: `so-${row.id}`,
              summary: `Sales order ${row.order_number} · ${formatStatusLabel(row.status)}`,
              category: "sales" as const,
              actorLabel: null,
              createdAt: row.updated_at || row.created_at,
            },
          ];
        });

  return {
    ok: true,
    monthlySalesCount,
    monthlySalesTotal,
    outstandingOrdersCount,
    outstandingTotal,
    anySalesOrderCount,
    recentActivity,
  };
}

type InventorySummaryResult =
  | {
      ok: true;
      lowStockCount: number | null;
      lowStockItems: DashboardLowStockItem[];
      hasInventoryRecords: boolean;
      recentActivity: DashboardActivityItem[];
    }
  | { ok: false };

async function fetchInventorySummary(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  capabilities: DashboardCapabilities,
): Promise<InventorySummaryResult> {
  if (!capabilities.canReadInventory) {
    return {
      ok: true,
      lowStockCount: null,
      lowStockItems: [],
      hasInventoryRecords: false,
      recentActivity: [],
    };
  }

  const transactionsPromise = capabilities.canViewAuditActivity
    ? Promise.resolve({
        data: [] as Array<{
          id: string;
          warehouse_id: string;
          product_id: string;
          transaction_type: string;
          quantity_delta: number;
          created_at: string;
        }>,
        error: null,
      })
    : supabase
        .from("inventory_transactions")
        .select(
          "id, warehouse_id, product_id, transaction_type, quantity_delta, created_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(OPERATIONAL_ACTIVITY_PER_SOURCE_LIMIT);

  const [warehousesResult, productsResult, balancesResult, transactionsResult] =
    await Promise.all([
      supabase
        .from("warehouses")
        .select("id, name, code, is_active")
        .eq("organization_id", organizationId),
      supabase
        .from("products")
        .select(
          "id, name, sku, unit, minimum_stock, track_inventory, is_active, archived_at",
        )
        .eq("organization_id", organizationId),
      supabase
        .from("inventory_balances")
        .select("warehouse_id, product_id, quantity")
        .eq("organization_id", organizationId),
      transactionsPromise,
    ]);

  if (
    warehousesResult.error ||
    productsResult.error ||
    balancesResult.error ||
    transactionsResult.error
  ) {
    return { ok: false };
  }

  const warehouses = warehousesResult.data ?? [];
  const products = productsResult.data ?? [];
  const balances = balancesResult.data ?? [];

  const warehouseMap = new Map(warehouses.map((wh) => [wh.id, wh]));
  const productMap = new Map(products.map((prod) => [prod.id, prod]));

  const lowStockMatches: DashboardLowStockItem[] = [];

  for (const balance of balances) {
    const warehouse = warehouseMap.get(balance.warehouse_id);
    const product = productMap.get(balance.product_id);

    if (!warehouse?.is_active) {
      continue;
    }

    if (
      !product ||
      !product.is_active ||
      product.archived_at !== null ||
      !product.track_inventory ||
      product.minimum_stock === null ||
      product.minimum_stock === undefined
    ) {
      continue;
    }

    const quantity = Number(balance.quantity);
    const minimumStock = Number(product.minimum_stock);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(minimumStock) ||
      quantity > minimumStock
    ) {
      continue;
    }

    lowStockMatches.push({
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      warehouseCode: warehouse.code,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productUnit: product.unit,
      quantity,
      minimumStock,
      buffer: Number((quantity - minimumStock).toFixed(3)),
    });
  }

  lowStockMatches.sort(
    (a, b) =>
      a.buffer - b.buffer ||
      a.productName.localeCompare(b.productName) ||
      a.warehouseName.localeCompare(b.warehouseName),
  );

  const recentActivity: DashboardActivityItem[] = (
    transactionsResult.data ?? []
  ).map((tx) => {
    const product = productMap.get(tx.product_id);
    const warehouse = warehouseMap.get(tx.warehouse_id);
    const productName = product?.name ?? "Product";
    const unit = product?.unit ?? "unit";
    const warehouseLabel = warehouse ? warehouse.name : "Warehouse";
    const deltaLabel = formatQuantityDelta(Number(tx.quantity_delta), unit);

    return {
      id: `inv-${tx.id}`,
      summary: `${formatInventoryTransactionLabel(tx.transaction_type)}: ${productName} (${deltaLabel}) · ${warehouseLabel}`,
      category: "inventory" as const,
      actorLabel: null,
      createdAt: tx.created_at,
    };
  });

  const hasInventoryRecords =
    warehouses.length > 0 || products.length > 0 || balances.length > 0;

  return {
    ok: true,
    lowStockCount: lowStockMatches.length,
    lowStockItems: lowStockMatches.slice(0, LOW_STOCK_DISPLAY_LIMIT),
    hasInventoryRecords,
    recentActivity,
  };
}

type WorkOrderSummaryResult =
  | {
      ok: true;
      activeWorkOrdersCount: number | null;
      activeWorkOrders: DashboardActiveWorkOrderItem[];
      anyWorkOrderCount: number;
      recentActivity: DashboardActivityItem[];
    }
  | { ok: false };

async function fetchWorkOrderSummary(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  capabilities: DashboardCapabilities,
): Promise<WorkOrderSummaryResult> {
  if (!capabilities.canReadWorkOrders) {
    return {
      ok: true,
      activeWorkOrdersCount: null,
      activeWorkOrders: [],
      anyWorkOrderCount: 0,
      recentActivity: [],
    };
  }

  const activePromise = supabase
    .from("work_orders")
    .select(
      "id, work_order_number, customer_id, work_type, priority, status, scheduled_start, created_at",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .in("status", ["draft", "scheduled", "in_progress"])
    .order("scheduled_start", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(ACTIVE_WORK_ORDERS_LIMIT);

  const recentOrCountPromise = capabilities.canViewAuditActivity
    ? supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
    : supabase
        .from("work_orders")
        .select("id, work_order_number, status, updated_at, created_at", {
          count: "exact",
        })
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(OPERATIONAL_ACTIVITY_PER_SOURCE_LIMIT);

  const [activeResult, recentResult] = await Promise.all([
    activePromise,
    recentOrCountPromise,
  ]);

  if (activeResult.error || recentResult.error) {
    return { ok: false };
  }

  const activeRows = activeResult.data ?? [];
  const activeWorkOrdersCount = activeResult.count ?? activeRows.length;

  const customerIds = [...new Set(activeRows.map((row) => row.customer_id))];
  const customerNameMap = new Map<string, string>();

  if (customerIds.length > 0) {
    const { data: customerRows, error: customerError } = await supabase
      .from("customers")
      .select("id, display_name")
      .eq("organization_id", organizationId)
      .in("id", customerIds);

    if (customerError) {
      return { ok: false };
    }

    for (const customer of customerRows ?? []) {
      customerNameMap.set(customer.id, customer.display_name);
    }
  }

  const activeWorkOrders: DashboardActiveWorkOrderItem[] = activeRows.map(
    (row) => ({
      id: row.id,
      workOrderNumber: row.work_order_number,
      customerName: customerNameMap.get(row.customer_id) ?? "Customer",
      workType: row.work_type,
      priority: row.priority,
      status: row.status,
      scheduledStart: row.scheduled_start,
      createdAt: row.created_at,
    }),
  );

  const recentRows = recentResult.data ?? [];
  const anyWorkOrderCount = recentResult.count ?? recentRows.length;

  const recentActivity: DashboardActivityItem[] =
    capabilities.canViewAuditActivity
      ? []
      : recentRows.flatMap((row) => {
          if (!("work_order_number" in row)) {
            return [];
          }

          return [
            {
              id: `wo-${row.id}`,
              summary: `Work order ${row.work_order_number} · ${formatStatusLabel(row.status)}`,
              category: "work_order" as const,
              actorLabel: null,
              createdAt: row.updated_at || row.created_at,
            },
          ];
        });

  return {
    ok: true,
    activeWorkOrdersCount,
    activeWorkOrders,
    anyWorkOrderCount,
    recentActivity,
  };
}

type AuditActivityResult =
  | { ok: true; items: DashboardActivityItem[] }
  | { ok: false };

async function fetchAuditActivity(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  capabilities: DashboardCapabilities,
): Promise<AuditActivityResult> {
  if (!capabilities.canViewAuditActivity) {
    return { ok: true, items: [] };
  }

  const { data, error } = await supabase.rpc(
    "get_recent_organization_audit_logs",
    {
      target_organization_id: organizationId,
      p_limit: RECENT_ACTIVITY_LIMIT,
    },
  );

  if (error) {
    return { ok: false };
  }

  const items: DashboardActivityItem[] = (data ?? []).map((row) => ({
    id: `audit-${row.id}`,
    summary: formatAuditActionSummary(row.action, row.entity_type),
    category: "audit" as const,
    actorLabel: row.actor_email ?? "System",
    createdAt: row.created_at,
  }));

  return { ok: true, items };
}

/**
 * Loads organization-scoped, role-authorized dashboard metrics and activity feeds.
 */
export async function getDashboardOverview(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  role: string,
  options?: { now?: Date },
): Promise<DashboardOverviewResult> {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, currency_code, timezone")
    .eq("id", organizationId)
    .single();

  if (organizationError || !organization) {
    return {
      ok: false,
      message: SAFE_DASHBOARD_LOAD_ERROR,
    };
  }

  const capabilities = getDashboardCapabilities(role);
  const monthBoundaries = getCurrentMonthBoundariesUtc(
    organization.timezone,
    options?.now,
  );

  const [
    customerSummary,
    salesSummary,
    inventorySummary,
    workOrderSummary,
    auditActivity,
  ] = await Promise.all([
    fetchCustomerSummary(supabase, organizationId, capabilities),
    fetchSalesSummary(supabase, organizationId, capabilities, monthBoundaries),
    fetchInventorySummary(supabase, organizationId, capabilities),
    fetchWorkOrderSummary(supabase, organizationId, capabilities),
    fetchAuditActivity(supabase, organizationId, capabilities),
  ]);

  if (
    !customerSummary.ok ||
    !salesSummary.ok ||
    !inventorySummary.ok ||
    !workOrderSummary.ok ||
    !auditActivity.ok
  ) {
    return {
      ok: false,
      message: SAFE_DASHBOARD_LOAD_ERROR,
    };
  }

  const recentActivity = capabilities.canViewAuditActivity
    ? auditActivity.items
    : [
        ...workOrderSummary.recentActivity,
        ...inventorySummary.recentActivity,
        ...salesSummary.recentActivity,
      ]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, RECENT_ACTIVITY_LIMIT);

  const isEmptyOrganization =
    (customerSummary.activeCustomerCount ?? 0) === 0 &&
    !inventorySummary.hasInventoryRecords &&
    salesSummary.anySalesOrderCount === 0 &&
    workOrderSummary.anyWorkOrderCount === 0;

  return {
    ok: true,
    data: {
      organization: {
        id: organization.id,
        name: organization.name,
        currencyCode: organization.currency_code,
        timezone: organization.timezone,
        resolvedTimezone: monthBoundaries.resolvedTimezone,
      },
      role,
      capabilities,
      monthPeriod: {
        label: monthBoundaries.monthLabel,
        startIso: monthBoundaries.startIso,
        endIso: monthBoundaries.endIso,
      },
      kpis: {
        activeCustomerCount: customerSummary.activeCustomerCount,
        monthlySalesCount: salesSummary.monthlySalesCount,
        monthlySalesTotal: salesSummary.monthlySalesTotal,
        outstandingOrdersCount: salesSummary.outstandingOrdersCount,
        outstandingTotal: salesSummary.outstandingTotal,
        lowStockCount: inventorySummary.lowStockCount,
        activeWorkOrdersCount: workOrderSummary.activeWorkOrdersCount,
      },
      lowStockItems: inventorySummary.lowStockItems,
      activeWorkOrders: workOrderSummary.activeWorkOrders,
      recentActivity,
      isEmptyOrganization,
    },
  };
}
