import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database-generated";
import { getDashboardOverview } from "../queries/get-dashboard-overview";

type OrgRow = Pick<
  Database["public"]["Tables"]["organizations"]["Row"],
  "id" | "name" | "currency_code" | "timezone"
>;

type WarehouseRow = Pick<
  Database["public"]["Tables"]["warehouses"]["Row"],
  "id" | "name" | "code" | "is_active"
>;

type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "name"
  | "sku"
  | "unit"
  | "minimum_stock"
  | "track_inventory"
  | "is_active"
  | "archived_at"
>;

type BalanceRow = Pick<
  Database["public"]["Tables"]["inventory_balances"]["Row"],
  "warehouse_id" | "product_id" | "quantity"
>;

type InventoryTxRow = Pick<
  Database["public"]["Tables"]["inventory_transactions"]["Row"],
  | "id"
  | "warehouse_id"
  | "product_id"
  | "transaction_type"
  | "quantity_delta"
  | "created_at"
>;

type SalesOrderRow = Pick<
  Database["public"]["Tables"]["sales_orders"]["Row"],
  | "id"
  | "order_number"
  | "status"
  | "payment_status"
  | "grand_total"
  | "paid_total"
  | "created_at"
  | "updated_at"
>;

type WorkOrderRow = Pick<
  Database["public"]["Tables"]["work_orders"]["Row"],
  | "id"
  | "work_order_number"
  | "customer_id"
  | "work_type"
  | "priority"
  | "status"
  | "scheduled_start"
  | "created_at"
  | "updated_at"
>;

type CustomerRow = Pick<
  Database["public"]["Tables"]["customers"]["Row"],
  "id" | "display_name" | "status"
>;

type AuditRow =
  Database["public"]["Functions"]["get_recent_organization_audit_logs"]["Returns"][number];

type QueryCall = {
  table: string;
  selectCols: string;
  selectOptions?: { count?: string; head?: boolean };
  filters: Array<[string, string, unknown]>;
};

function createDashboardMockClient(options: {
  organization?: OrgRow | null;
  organizationError?: { message: string } | null;
  customers?: CustomerRow[];
  salesOrders?: SalesOrderRow[];
  warehouses?: WarehouseRow[];
  products?: ProductRow[];
  balances?: BalanceRow[];
  transactions?: InventoryTxRow[];
  workOrders?: WorkOrderRow[];
  auditLogs?: AuditRow[];
  auditError?: { message: string } | null;
}) {
  const calls: QueryCall[] = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];

  const client = {
    from(table: string) {
      let selectCols = "";
      let selectOptions: { count?: string; head?: boolean } | undefined;
      const filters: Array<[string, string, unknown]> = [];
      let limitCount: number | null = null;
      const orders: Array<{ col: string; ascending: boolean }> = [];

      const execute = async () => {
        calls.push({ table, selectCols, selectOptions, filters });

        if (table === "organizations") {
          if (options.organizationError || !options.organization) {
            return {
              data: null,
              error: options.organizationError ?? { message: "not found" },
            };
          }

          return { data: options.organization, error: null };
        }

        if (table === "customers") {
          let rows = [...(options.customers ?? [])];
          for (const [op, col, val] of filters) {
            if (op === "eq" && col === "status") {
              rows = rows.filter((row) => row.status === val);
            }
            if (op === "in" && col === "id" && Array.isArray(val)) {
              rows = rows.filter((row) => val.includes(row.id));
            }
          }
          return {
            data: selectOptions?.head ? null : rows,
            count: rows.length,
            error: null,
          };
        }

        if (table === "sales_orders") {
          let rows = [...(options.salesOrders ?? [])];
          for (const [op, col, val] of filters) {
            if (op === "in" && col === "status" && Array.isArray(val)) {
              rows = rows.filter((row) => val.includes(row.status));
            }
            if (op === "in" && col === "payment_status" && Array.isArray(val)) {
              rows = rows.filter((row) => val.includes(row.payment_status));
            }
            if (op === "gte" && col === "created_at") {
              rows = rows.filter((row) => row.created_at >= String(val));
            }
            if (op === "lt" && col === "created_at") {
              rows = rows.filter((row) => row.created_at < String(val));
            }
          }

          const totalCount = rows.length;
          if (limitCount !== null) {
            rows = rows.slice(0, limitCount);
          }

          return {
            data: selectOptions?.head ? null : rows,
            count: totalCount,
            error: null,
          };
        }

        if (table === "warehouses") {
          return { data: options.warehouses ?? [], error: null };
        }

        if (table === "products") {
          return { data: options.products ?? [], error: null };
        }

        if (table === "inventory_balances") {
          return { data: options.balances ?? [], error: null };
        }

        if (table === "inventory_transactions") {
          const rows = [...(options.transactions ?? [])].sort((a, b) =>
            b.created_at.localeCompare(a.created_at),
          );
          return {
            data: limitCount !== null ? rows.slice(0, limitCount) : rows,
            error: null,
          };
        }

        if (table === "work_orders") {
          let rows = [...(options.workOrders ?? [])];
          for (const [op, col, val] of filters) {
            if (op === "in" && col === "status" && Array.isArray(val)) {
              rows = rows.filter((row) => val.includes(row.status));
            }
          }
          const totalCount = rows.length;
          if (orders.length > 0) {
            rows.sort((a, b) => {
              if (orders[0].col === "updated_at") {
                return b.updated_at.localeCompare(a.updated_at);
              }
              return b.created_at.localeCompare(a.created_at);
            });
          }
          if (limitCount !== null) {
            rows = rows.slice(0, limitCount);
          }
          return {
            data: selectOptions?.head ? null : rows,
            count: totalCount,
            error: null,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      };

      const builder: {
        select: (
          cols: string,
          opts?: { count?: string; head?: boolean },
        ) => typeof builder;
        eq: (col: string, val: unknown) => typeof builder;
        in: (col: string, vals: unknown[]) => typeof builder;
        gte: (col: string, val: unknown) => typeof builder;
        lt: (col: string, val: unknown) => typeof builder;
        order: (col: string, opts?: { ascending?: boolean }) => typeof builder;
        limit: (n: number) => typeof builder;
        single: () => Promise<unknown>;
        then: PromiseLike<unknown>["then"];
      } = {
        select(cols, opts) {
          selectCols = cols;
          selectOptions = opts;
          return builder;
        },
        eq(col, val) {
          filters.push(["eq", col, val]);
          return builder;
        },
        in(col, vals) {
          filters.push(["in", col, vals]);
          return builder;
        },
        gte(col, val) {
          filters.push(["gte", col, val]);
          return builder;
        },
        lt(col, val) {
          filters.push(["lt", col, val]);
          return builder;
        },
        order(col, opts) {
          orders.push({ col, ascending: opts?.ascending ?? true });
          return builder;
        },
        limit(n) {
          limitCount = n;
          return builder;
        },
        single() {
          return execute();
        },
        then(onfulfilled, onrejected) {
          return execute().then(onfulfilled, onrejected);
        },
      };

      return builder;
    },
    rpc(fn: string, args: unknown) {
      rpcCalls.push({ fn, args });
      if (options.auditError) {
        return Promise.resolve({ data: null, error: options.auditError });
      }
      return Promise.resolve({ data: options.auditLogs ?? [], error: null });
    },
  } as unknown as SupabaseClient<Database>;

  return { client, calls, rpcCalls };
}

describe("getDashboardOverview", () => {
  const organization: OrgRow = {
    id: "org-1",
    name: "CoreOps Demo",
    currency_code: "USD",
    timezone: "Asia/Jakarta",
  };

  const sampleCustomers: CustomerRow[] = [
    { id: "cust-1", display_name: "Alpha Studio", status: "active" },
    { id: "cust-2", display_name: "Archived Client", status: "archived" },
  ];

  const sampleWarehouses: WarehouseRow[] = [
    { id: "wh-1", name: "Main Hub", code: "WH-01", is_active: true },
    { id: "wh-off", name: "Closed Hub", code: "WH-99", is_active: false },
  ];

  const sampleProducts: ProductRow[] = [
    {
      id: "p-1",
      name: "Item A",
      sku: "SKU-A",
      unit: "pcs",
      minimum_stock: 10,
      track_inventory: true,
      is_active: true,
      archived_at: null,
    },
    {
      id: "p-2",
      name: "Item B",
      sku: "SKU-B",
      unit: "pcs",
      minimum_stock: 10,
      track_inventory: true,
      is_active: true,
      archived_at: null,
    },
    {
      id: "p-3",
      name: "Item C",
      sku: "SKU-C",
      unit: "pcs",
      minimum_stock: 5,
      track_inventory: true,
      is_active: true,
      archived_at: null,
    },
    {
      id: "p-4",
      name: "Item D",
      sku: "SKU-D",
      unit: "pcs",
      minimum_stock: 8,
      track_inventory: true,
      is_active: true,
      archived_at: null,
    },
    {
      id: "p-5",
      name: "Item E",
      sku: "SKU-E",
      unit: "pcs",
      minimum_stock: 6,
      track_inventory: true,
      is_active: true,
      archived_at: null,
    },
    {
      id: "p-6",
      name: "Item F",
      sku: "SKU-F",
      unit: "pcs",
      minimum_stock: 4,
      track_inventory: true,
      is_active: true,
      archived_at: null,
    },
    {
      id: "p-healthy",
      name: "Healthy Item",
      sku: "SKU-OK",
      unit: "pcs",
      minimum_stock: 5,
      track_inventory: true,
      is_active: true,
      archived_at: null,
    },
    {
      id: "p-archived",
      name: "Archived Item",
      sku: "SKU-ARC",
      unit: "pcs",
      minimum_stock: 10,
      track_inventory: true,
      is_active: false,
      archived_at: "2026-04-01T00:00:00.000Z",
    },
    {
      id: "p-service",
      name: "Consulting",
      sku: "SVC-1",
      unit: "hr",
      minimum_stock: null,
      track_inventory: false,
      is_active: true,
      archived_at: null,
    },
  ];

  const sampleBalances: BalanceRow[] = [
    { warehouse_id: "wh-1", product_id: "p-1", quantity: 10 }, // buffer 0
    { warehouse_id: "wh-1", product_id: "p-2", quantity: 0 }, // buffer -10 (worst)
    { warehouse_id: "wh-1", product_id: "p-3", quantity: 1 }, // buffer -4
    { warehouse_id: "wh-1", product_id: "p-4", quantity: 2 }, // buffer -6
    { warehouse_id: "wh-1", product_id: "p-5", quantity: 3 }, // buffer -3
    { warehouse_id: "wh-1", product_id: "p-6", quantity: 3 }, // buffer -1
    { warehouse_id: "wh-1", product_id: "p-healthy", quantity: 20 }, // not low
    { warehouse_id: "wh-off", product_id: "p-1", quantity: 0 }, // inactive wh ignored
    { warehouse_id: "wh-1", product_id: "p-archived", quantity: 0 }, // archived product ignored
  ];

  const sampleSalesOrders: SalesOrderRow[] = [
    {
      id: "so-1",
      order_number: "SO-2026-0001",
      status: "confirmed",
      payment_status: "partially_paid",
      grand_total: 100.1,
      paid_total: 40.05,
      created_at: "2026-04-30T17:30:00.000Z", // May 1 00:30 in Jakarta!
      updated_at: "2026-04-30T17:35:00.000Z",
    },
    {
      id: "so-2",
      order_number: "SO-2026-0002",
      status: "completed",
      payment_status: "unpaid",
      grand_total: 20.2,
      paid_total: 0,
      created_at: "2026-05-02T10:00:00.000Z",
      updated_at: "2026-05-02T10:00:00.000Z",
    },
    {
      id: "so-prev",
      order_number: "SO-2026-0000",
      status: "completed",
      payment_status: "unpaid",
      grand_total: 50,
      paid_total: 10,
      created_at: "2026-04-30T16:59:59.000Z", // April 30 23:59:59 in Jakarta (previous month)
      updated_at: "2026-04-30T16:59:59.000Z",
    },
    {
      id: "so-draft",
      order_number: "SO-2026-0003",
      status: "draft",
      payment_status: "unpaid",
      grand_total: 500,
      paid_total: 0,
      created_at: "2026-05-03T00:00:00.000Z",
      updated_at: "2026-05-03T00:00:00.000Z",
    },
  ];

  const sampleWorkOrders: WorkOrderRow[] = [
    {
      id: "wo-1",
      work_order_number: "WO-2026-0001",
      customer_id: "cust-1",
      work_type: "installation",
      priority: "high",
      status: "scheduled",
      scheduled_start: "2026-05-04T03:00:00.000Z",
      created_at: "2026-05-01T01:00:00.000Z",
      updated_at: "2026-05-01T02:00:00.000Z",
    },
    {
      id: "wo-done",
      work_order_number: "WO-2026-0000",
      customer_id: "cust-1",
      work_type: "service",
      priority: "normal",
      status: "completed",
      scheduled_start: null,
      created_at: "2026-04-20T01:00:00.000Z",
      updated_at: "2026-04-21T01:00:00.000Z",
    },
  ];

  const sampleAuditLogs: AuditRow[] = [
    {
      id: "aud-1",
      action: "payment.recorded",
      entity_type: "payment",
      entity_id: "pay-1",
      actor_email: "owner@example.test",
      created_at: "2026-05-02T10:05:00.000Z",
    },
    {
      id: "aud-2",
      action: "inventory.stock_adjusted",
      entity_type: "inventory_transaction",
      entity_id: "tx-1",
      actor_email: "admin@example.test",
      created_at: "2026-05-01T08:00:00.000Z",
    },
  ];

  it("loads scoped KPIs, financial totals, low-stock top 5, work orders, and audit logs for owner", async () => {
    const { client, calls, rpcCalls } = createDashboardMockClient({
      organization,
      customers: sampleCustomers,
      warehouses: sampleWarehouses,
      products: sampleProducts,
      balances: sampleBalances,
      salesOrders: sampleSalesOrders,
      workOrders: sampleWorkOrders,
      auditLogs: sampleAuditLogs,
    });

    const result = await getDashboardOverview(client, "org-1", "owner", {
      now: new Date("2026-04-30T18:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.organization).toEqual({
      id: "org-1",
      name: "CoreOps Demo",
      currencyCode: "USD",
      timezone: "Asia/Jakarta",
      resolvedTimezone: "Asia/Jakarta",
    });
    expect(result.data.monthPeriod).toEqual({
      label: "May 2026",
      startIso: "2026-04-30T17:00:00.000Z",
      endIso: "2026-05-31T17:00:00.000Z",
    });

    // 1 active customer (excludes archived)
    expect(result.data.kpis.activeCustomerCount).toBe(1);
    // 2 sales orders in May Jakarta time (100.10 + 20.20 = 120.30)
    expect(result.data.kpis.monthlySalesCount).toBe(2);
    expect(result.data.kpis.monthlySalesTotal).toBe(120.3);
    // 3 unpaid/partial confirmed+completed orders: (100.10 - 40.05) + 20.20 + (50 - 10) = 120.25
    expect(result.data.kpis.outstandingOrdersCount).toBe(3);
    expect(result.data.kpis.outstandingTotal).toBe(120.25);
    // 6 low-stock active tracked items (top 5 sorted by lowest buffer first)
    expect(result.data.kpis.lowStockCount).toBe(6);
    expect(result.data.lowStockItems.map((item) => item.productId)).toEqual([
      "p-2",
      "p-4",
      "p-3",
      "p-5",
      "p-6",
    ]);
    // 1 active work order joined with customer name
    expect(result.data.kpis.activeWorkOrdersCount).toBe(1);
    expect(result.data.activeWorkOrders).toEqual([
      {
        id: "wo-1",
        workOrderNumber: "WO-2026-0001",
        customerName: "Alpha Studio",
        workType: "installation",
        priority: "high",
        status: "scheduled",
        scheduledStart: "2026-05-04T03:00:00.000Z",
        createdAt: "2026-05-01T01:00:00.000Z",
      },
    ]);
    // Audit RPC called for owner
    expect(rpcCalls).toEqual([
      {
        fn: "get_recent_organization_audit_logs",
        args: { target_organization_id: "org-1", p_limit: 8 },
      },
    ]);
    expect(result.data.recentActivity).toEqual([
      {
        id: "audit-aud-1",
        summary: "Recorded a sales payment",
        category: "audit",
        actorLabel: "owner@example.test",
        createdAt: "2026-05-02T10:05:00.000Z",
      },
      {
        id: "audit-aud-2",
        summary: "Adjusted inventory stock",
        category: "audit",
        actorLabel: "admin@example.test",
        createdAt: "2026-05-01T08:00:00.000Z",
      },
    ]);
    expect(result.data.isEmptyOrganization).toBe(false);

    // Every table query is scoped to organization_id = org-1
    for (const call of calls) {
      const hasOrgScope = call.filters.some(
        ([op, col, val]) =>
          op === "eq" &&
          (col === "organization_id" || col === "id") &&
          val === "org-1",
      );
      expect(hasOrgScope).toBe(true);
    }
  });

  it("hides financial totals and audit logs from staff while returning operational activity", async () => {
    const transactions: InventoryTxRow[] = [
      {
        id: "tx-1",
        warehouse_id: "wh-1",
        product_id: "p-1",
        transaction_type: "opening_stock",
        quantity_delta: 10,
        created_at: "2026-05-02T12:00:00.000Z",
      },
    ];

    const { client, calls, rpcCalls } = createDashboardMockClient({
      organization,
      customers: sampleCustomers,
      warehouses: sampleWarehouses,
      products: sampleProducts,
      balances: sampleBalances,
      salesOrders: sampleSalesOrders,
      workOrders: sampleWorkOrders,
      transactions,
    });

    const result = await getDashboardOverview(client, "org-1", "staff", {
      now: new Date("2026-05-03T00:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.kpis.activeCustomerCount).toBe(1);
    expect(result.data.kpis.monthlySalesCount).toBe(2);
    expect(result.data.kpis.monthlySalesTotal).toBeNull();
    expect(result.data.kpis.outstandingOrdersCount).toBe(3);
    expect(result.data.kpis.outstandingTotal).toBeNull();

    // Ensure grand_total and paid_total are never selected for staff
    const salesCalls = calls.filter((call) => call.table === "sales_orders");
    for (const call of salesCalls) {
      expect(call.selectCols).not.toContain("grand_total");
      expect(call.selectCols).not.toContain("paid_total");
    }

    // Ensure audit RPC is never invoked for staff
    expect(rpcCalls).toHaveLength(0);

    // Operational activity includes sales status, inventory tx, and work order updates
    expect(result.data.recentActivity.length).toBeGreaterThan(0);
    expect(
      result.data.recentActivity.every((item) => item.category !== "audit"),
    ).toBe(true);
  });

  it("scopes technician strictly to inventory and work orders without customer or sales queries", async () => {
    const transactions: InventoryTxRow[] = [
      {
        id: "tx-2",
        warehouse_id: "wh-1",
        product_id: "p-2",
        transaction_type: "work_order_out",
        quantity_delta: -2,
        created_at: "2026-05-02T09:00:00.000Z",
      },
    ];

    const { client, calls, rpcCalls } = createDashboardMockClient({
      organization,
      customers: sampleCustomers,
      warehouses: sampleWarehouses,
      products: sampleProducts,
      balances: sampleBalances,
      salesOrders: sampleSalesOrders,
      workOrders: [sampleWorkOrders[0]],
      transactions,
    });

    const result = await getDashboardOverview(client, "org-1", "technician", {
      now: new Date("2026-05-03T00:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.kpis.activeCustomerCount).toBeNull();
    expect(result.data.kpis.monthlySalesCount).toBeNull();
    expect(result.data.kpis.monthlySalesTotal).toBeNull();
    expect(result.data.kpis.outstandingOrdersCount).toBeNull();
    expect(result.data.kpis.outstandingTotal).toBeNull();
    expect(result.data.kpis.lowStockCount).toBe(6);
    expect(result.data.kpis.activeWorkOrdersCount).toBe(1);

    // Technician never queries sales_orders or broad customers count
    expect(calls.some((call) => call.table === "sales_orders")).toBe(false);
    const customerCalls = calls.filter((call) => call.table === "customers");
    expect(customerCalls).toHaveLength(1);
    expect(
      customerCalls[0].filters.some(([op, col]) => op === "in" && col === "id"),
    ).toBe(true);
    expect(rpcCalls).toHaveLength(0);
  });

  it("marks freshly onboarded empty organization with isEmptyOrganization = true", async () => {
    const { client } = createDashboardMockClient({
      organization,
      customers: [],
      warehouses: [],
      products: [],
      balances: [],
      salesOrders: [],
      workOrders: [],
      auditLogs: [],
    });

    const result = await getDashboardOverview(client, "org-1", "owner", {
      now: new Date("2026-05-01T00:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.isEmptyOrganization).toBe(true);
    expect(result.data.kpis).toEqual({
      activeCustomerCount: 0,
      monthlySalesCount: 0,
      monthlySalesTotal: 0,
      outstandingOrdersCount: 0,
      outstandingTotal: 0,
      lowStockCount: 0,
      activeWorkOrdersCount: 0,
    });
    expect(result.data.lowStockItems).toEqual([]);
    expect(result.data.activeWorkOrders).toEqual([]);
    expect(result.data.recentActivity).toEqual([]);
  });

  it("returns safe error when organization lookup or audit RPC fails", async () => {
    const missingOrg = createDashboardMockClient({
      organizationError: { message: "db error details" },
    });

    const missingResult = await getDashboardOverview(
      missingOrg.client,
      "org-1",
      "owner",
    );
    expect(missingResult).toEqual({
      ok: false,
      message: "Unable to load dashboard. Try again.",
    });

    const failedAudit = createDashboardMockClient({
      organization,
      auditError: { message: "permission denied raw sql" },
    });

    const failedAuditResult = await getDashboardOverview(
      failedAudit.client,
      "org-1",
      "owner",
    );
    expect(failedAuditResult).toEqual({
      ok: false,
      message: "Unable to load dashboard. Try again.",
    });
  });
});
