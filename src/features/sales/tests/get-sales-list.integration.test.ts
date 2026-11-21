import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database-generated";
import {
  SALES_LIST_PAGE_SIZE,
  getSalesOverview,
} from "../queries/get-sales-list";
import { getSalesOrderDetail } from "../queries/get-sales-order-detail";

const ORDER_ID_1 = "11111111-1111-4111-8111-111111111111";
const ORDER_ID_2 = "22222222-2222-4222-8222-222222222222";
const CUSTOMER_ID_1 = "33333333-3333-4333-8333-333333333333";
const WAREHOUSE_ID_1 = "44444444-4444-4444-8444-444444444444";
const PRODUCT_ID_1 = "55555555-5555-4555-8555-555555555555";

class SalesQueryTracker {
  public readonly eqCalls: Record<string, Array<[string, unknown]>> = {
    organizations: [],
    customers: [],
    products: [],
    warehouses: [],
    sales_orders: [],
    sales_order_items: [],
    payments: [],
  };
  public salesOrderOrCall: string | null = null;
  public salesOrderRangeCall: [number, number] | null = null;

  constructor(
    private readonly options: {
      org?: { currency_code: string; timezone: string; name: string };
      customers?: Array<Record<string, unknown>>;
      products?: Array<Record<string, unknown>>;
      warehouses?: Array<Record<string, unknown>>;
      summaryRows?: Array<Record<string, unknown>>;
      orderRows?: Array<Record<string, unknown>>;
      orderCount?: number;
      detailOrder?: Record<string, unknown> | null;
      detailItems?: Array<Record<string, unknown>>;
      detailPayments?: Array<Record<string, unknown>>;
      ordersError?: { message: string } | null;
    } = {},
  ) {}

  createClient() {
    let salesOrderSelectCount = 0;

    return {
      from: (table: string) => {
        if (table === "organizations") {
          const builder = {
            select: () => builder,
            eq: (col: string, val: unknown) => {
              this.eqCalls.organizations.push([col, val]);
              return builder;
            },
            maybeSingle: () =>
              Promise.resolve({
                data: this.options.org ?? {
                  currency_code: "USD",
                  timezone: "UTC",
                  name: "Acme Trading",
                },
                error: null,
              }),
          };
          return builder;
        }

        if (table === "customers") {
          let isSingle = false;
          const builder = {
            select: () => builder,
            eq: (col: string, val: unknown) => {
              this.eqCalls.customers.push([col, val]);
              if (col === "id") isSingle = true;
              return builder;
            },
            is: () => builder,
            order: () =>
              Promise.resolve({
                data: this.options.customers ?? [],
                error: null,
              }),
            maybeSingle: () =>
              Promise.resolve({
                data: isSingle ? (this.options.customers?.[0] ?? null) : null,
                error: null,
              }),
          };
          return builder;
        }

        if (table === "products") {
          const builder = {
            select: () => builder,
            eq: (col: string, val: unknown) => {
              this.eqCalls.products.push([col, val]);
              return builder;
            },
            is: () => builder,
            order: () =>
              Promise.resolve({
                data: this.options.products ?? [],
                error: null,
              }),
          };
          return builder;
        }

        if (table === "warehouses") {
          const builder = {
            select: () => builder,
            eq: (col: string, val: unknown) => {
              this.eqCalls.warehouses.push([col, val]);
              return builder;
            },
            order: () =>
              Promise.resolve({
                data: this.options.warehouses ?? [],
                error: null,
              }),
          };
          return builder;
        }

        if (table === "sales_orders") {
          salesOrderSelectCount += 1;
          const isSummaryCall = salesOrderSelectCount === 1;
          const builder = {
            select: () => builder,
            eq: (col: string, val: unknown) => {
              this.eqCalls.sales_orders.push([col, val]);
              if (isSummaryCall && col === "organization_id") {
                return Object.assign(
                  Promise.resolve({
                    data: this.options.summaryRows ?? [],
                    error: null,
                  }),
                  builder,
                );
              }
              return builder;
            },
            or: (expr: string) => {
              this.salesOrderOrCall = expr;
              return builder;
            },
            order: () => builder,
            range: (from: number, to: number) => {
              this.salesOrderRangeCall = [from, to];
              return Promise.resolve({
                data: this.options.orderRows ?? [],
                error: this.options.ordersError ?? null,
                count: this.options.orderCount ?? 0,
              });
            },
            maybeSingle: () =>
              Promise.resolve({
                data:
                  this.options.detailOrder === undefined
                    ? null
                    : this.options.detailOrder,
                error: this.options.ordersError ?? null,
              }),
          };
          return builder;
        }

        if (table === "sales_order_items") {
          const builder = {
            select: () => builder,
            eq: (col: string, val: unknown) => {
              this.eqCalls.sales_order_items.push([col, val]);
              return builder;
            },
            order: () =>
              Promise.resolve({
                data: this.options.detailItems ?? [],
                error: null,
              }),
          };
          return builder;
        }

        if (table === "payments") {
          const builder = {
            select: () => builder,
            eq: (col: string, val: unknown) => {
              this.eqCalls.payments.push([col, val]);
              return builder;
            },
            order: () => builder,
            then: (
              resolve: (v: {
                data: Array<Record<string, unknown>>;
                error: null;
              }) => unknown,
            ) =>
              Promise.resolve({
                data: this.options.detailPayments ?? [],
                error: null,
              }).then(resolve),
          };
          return builder;
        }

        throw new Error(`Unexpected table ${table}`);
      },
    } as unknown as SupabaseClient<Database>;
  }
}

describe("getSalesOverview", () => {
  it("scopes all queries to organization_id, computes summary metrics, and formats list items", async () => {
    const tracker = new SalesQueryTracker({
      org: { currency_code: "IDR", timezone: "Asia/Jakarta", name: "Acme" },
      customers: [
        {
          id: CUSTOMER_ID_1,
          display_name: "Budi Santoso",
          company_name: "PT Maju",
          status: "active",
          archived_at: null,
        },
      ],
      products: [
        {
          id: PRODUCT_ID_1,
          product_type: "goods",
          name: "Steel Valve",
          sku: "VLV-01",
          unit: "pcs",
          selling_price: 100,
          track_inventory: true,
          is_active: true,
          archived_at: null,
        },
      ],
      warehouses: [
        {
          id: WAREHOUSE_ID_1,
          name: "Main Warehouse",
          code: "WH-01",
          is_active: true,
        },
      ],
      summaryRows: [
        { status: "draft", grand_total: 500, paid_total: 0 },
        { status: "confirmed", grand_total: 200, paid_total: 50 },
        { status: "completed", grand_total: 300, paid_total: 300 },
        { status: "cancelled", grand_total: 999, paid_total: 0 },
      ],
      orderRows: [
        {
          id: ORDER_ID_1,
          order_number: "SO-2026-0001",
          customer_id: CUSTOMER_ID_1,
          warehouse_id: WAREHOUSE_ID_1,
          status: "confirmed",
          payment_status: "partially_paid",
          currency_code: "IDR",
          subtotal: 200,
          discount_total: 0,
          tax_total: 0,
          grand_total: 200,
          paid_total: 50,
          created_at: "2026-08-02T00:00:00.000Z",
          updated_at: "2026-08-02T00:00:00.000Z",
          confirmed_at: "2026-08-02T01:00:00.000Z",
          completed_at: null,
          cancelled_at: null,
        },
      ],
      orderCount: 1,
    });

    const result = await getSalesOverview(tracker.createClient(), "org-1", {
      search: "",
      status: "all",
      paymentStatus: "all",
      page: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.currencyCode).toBe("IDR");
      expect(result.data.timezone).toBe("Asia/Jakarta");
      expect(result.data.summary).toEqual({
        totalOrders: 4,
        confirmedRevenue: 500,
        outstandingBalance: 150,
      });
      expect(result.data.items[0]).toMatchObject({
        id: ORDER_ID_1,
        orderNumber: "SO-2026-0001",
        customerName: "Budi Santoso",
        customerCompanyName: "PT Maju",
        warehouseCode: "WH-01",
        outstandingBalance: 150,
      });
    }
    expect(tracker.eqCalls.sales_orders).toEqual([
      ["organization_id", "org-1"],
      ["organization_id", "org-1"],
    ]);
    expect(tracker.salesOrderRangeCall).toEqual([0, SALES_LIST_PAGE_SIZE - 1]);
  });

  it("sanitizes search and matches customer display name or order number", async () => {
    const tracker = new SalesQueryTracker({
      customers: [
        {
          id: CUSTOMER_ID_1,
          display_name: "Budi Santoso",
          company_name: null,
          status: "active",
          archived_at: null,
        },
      ],
      orderRows: [],
      orderCount: 0,
    });

    await getSalesOverview(tracker.createClient(), "org-1", {
      search: "Budi,*(%)",
      status: "confirmed",
      paymentStatus: "unpaid",
      page: 2,
    });

    expect(tracker.eqCalls.sales_orders).toContainEqual([
      "status",
      "confirmed",
    ]);
    expect(tracker.eqCalls.sales_orders).toContainEqual([
      "payment_status",
      "unpaid",
    ]);
    expect(tracker.salesOrderOrCall).toBe(
      `order_number.ilike.*Budi*,customer_id.in.(${CUSTOMER_ID_1})`,
    );
    expect(tracker.salesOrderRangeCall).toEqual([
      SALES_LIST_PAGE_SIZE,
      SALES_LIST_PAGE_SIZE * 2 - 1,
    ]);
  });

  it("masks raw database errors safely", async () => {
    const tracker = new SalesQueryTracker({
      ordersError: { message: "relation public.sales_orders failed" },
    });

    const result = await getSalesOverview(tracker.createClient(), "org-1", {
      search: "",
      status: "all",
      paymentStatus: "all",
      page: 1,
    });

    expect(result).toEqual({
      ok: false,
      message: "Unable to load sales orders. Try again.",
    });
  });
});

describe("getSalesOrderDetail", () => {
  it("returns not found for invalid UUID or missing/cross-tenant order", async () => {
    const tracker = new SalesQueryTracker({ detailOrder: null });

    expect(
      await getSalesOrderDetail(tracker.createClient(), "org-1", "bad-uuid"),
    ).toEqual({
      ok: false,
      message: "Sales order not found.",
    });

    expect(
      await getSalesOrderDetail(tracker.createClient(), "org-1", ORDER_ID_2),
    ).toEqual({
      ok: false,
      message: "Sales order not found.",
    });
  });

  it("loads draft order with formOptions and tracked-goods flag", async () => {
    const tracker = new SalesQueryTracker({
      org: { currency_code: "USD", timezone: "UTC", name: "Acme" },
      customers: [
        {
          id: CUSTOMER_ID_1,
          display_name: "Alice",
          company_name: null,
          email: "alice@example.test",
          phone: null,
          status: "active",
        },
      ],
      warehouses: [
        {
          id: WAREHOUSE_ID_1,
          name: "Main Warehouse",
          code: "WH-01",
          is_active: true,
        },
      ],
      products: [
        {
          id: PRODUCT_ID_1,
          product_type: "goods",
          name: "Steel Valve",
          sku: "VLV-01",
          unit: "pcs",
          selling_price: 50,
          track_inventory: true,
          is_active: true,
          archived_at: null,
        },
      ],
      detailOrder: {
        id: ORDER_ID_1,
        order_number: "SO-2026-0001",
        customer_id: CUSTOMER_ID_1,
        warehouse_id: null,
        status: "draft",
        payment_status: "unpaid",
        currency_code: "USD",
        subtotal: 100,
        discount_total: 0,
        tax_total: 0,
        grand_total: 100,
        paid_total: 0,
        notes: null,
        cancellation_reason: null,
        confirmed_at: null,
        completed_at: null,
        cancelled_at: null,
        created_at: "2026-08-02T00:00:00.000Z",
        updated_at: "2026-08-02T00:00:00.000Z",
      },
      detailItems: [
        {
          id: "item-1",
          product_id: PRODUCT_ID_1,
          item_type: "goods",
          name_snapshot: "Steel Valve",
          sku_snapshot: "VLV-01",
          unit_snapshot: "pcs",
          quantity: 2,
          unit_price: 50,
          discount_amount: 0,
          tax_amount: 0,
          line_total: 100,
        },
      ],
      detailPayments: [],
    });

    const result = await getSalesOrderDetail(
      tracker.createClient(),
      "org-1",
      ORDER_ID_1,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.hasTrackedGoods).toBe(true);
      expect(result.data.formOptions).not.toBeNull();
      expect(result.data.formOptions?.products).toHaveLength(1);
      expect(result.data.activeWarehouses).toHaveLength(1);
    }
  });

  it("omits editable formOptions when order is confirmed", async () => {
    const tracker = new SalesQueryTracker({
      customers: [
        {
          id: CUSTOMER_ID_1,
          display_name: "Alice",
          company_name: null,
          email: null,
          phone: null,
          status: "active",
        },
      ],
      warehouses: [
        {
          id: WAREHOUSE_ID_1,
          name: "Main Warehouse",
          code: "WH-01",
          is_active: true,
        },
      ],
      detailOrder: {
        id: ORDER_ID_1,
        order_number: "SO-2026-0001",
        customer_id: CUSTOMER_ID_1,
        warehouse_id: WAREHOUSE_ID_1,
        status: "confirmed",
        payment_status: "partially_paid",
        currency_code: "USD",
        subtotal: 100,
        discount_total: 0,
        tax_total: 0,
        grand_total: 100,
        paid_total: 40,
        notes: null,
        cancellation_reason: null,
        confirmed_at: "2026-08-02T01:00:00.000Z",
        completed_at: null,
        cancelled_at: null,
        created_at: "2026-08-02T00:00:00.000Z",
        updated_at: "2026-08-02T01:00:00.000Z",
      },
      detailItems: [],
      detailPayments: [
        {
          id: "pay-1",
          amount: 40,
          payment_method: "cash",
          reference: "RCPT-1",
          status: "completed",
          paid_at: "2026-08-02T02:00:00.000Z",
          notes: null,
          created_at: "2026-08-02T02:00:00.000Z",
          voided_at: null,
          void_reason: null,
        },
      ],
    });

    const result = await getSalesOrderDetail(
      tracker.createClient(),
      "org-1",
      ORDER_ID_1,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.formOptions).toBeNull();
      expect(result.data.outstandingBalance).toBe(60);
      expect(result.data.payments).toHaveLength(1);
    }
  });
});
