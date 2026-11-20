import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database-generated";
import { getInventoryOverview } from "../queries/get-inventory-overview";

type WarehouseRow = Database["public"]["Tables"]["warehouses"]["Row"];
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
type BalanceRow = Database["public"]["Tables"]["inventory_balances"]["Row"];
type TransactionRow =
  Database["public"]["Tables"]["inventory_transactions"]["Row"];

function createTrackerClient(options: {
  warehouses?: WarehouseRow[];
  products?: ProductRow[];
  balances?: BalanceRow[];
  transactions?: TransactionRow[];
  balancesError?: { message: string } | null;
}) {
  const eqCalls: Record<string, Array<[string, unknown]>> = {
    warehouses: [],
    products: [],
    inventory_balances: [],
    inventory_transactions: [],
  };

  const client = {
    from(table: string) {
      if (table === "warehouses") {
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.warehouses.push([col, val]);
            return builder;
          },
          order: () =>
            Promise.resolve({
              data: options.warehouses ?? [],
              error: null,
            }),
        };
        return builder;
      }

      if (table === "products") {
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.products.push([col, val]);
            return builder;
          },
          order: () =>
            Promise.resolve({
              data: options.products ?? [],
              error: null,
            }),
        };
        return builder;
      }

      if (table === "inventory_balances") {
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.inventory_balances.push([col, val]);
            return builder;
          },
          order: () =>
            Promise.resolve({
              data: options.balances ?? [],
              error: options.balancesError ?? null,
            }),
        };
        return builder;
      }

      if (table === "inventory_transactions") {
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.inventory_transactions.push([col, val]);
            return builder;
          },
          order: () => builder,
          limit: () =>
            Promise.resolve({
              data: options.transactions ?? [],
              error: null,
            }),
        };
        return builder;
      }

      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as SupabaseClient<Database>;

  return { client, eqCalls };
}

describe("getInventoryOverview", () => {
  const warehouses: WarehouseRow[] = [
    {
      id: "wh-1",
      organization_id: "org-1",
      name: "Main Warehouse",
      code: "WH-01",
      address: "Jakarta",
      is_active: true,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "wh-2",
      organization_id: "org-1",
      name: "Old Warehouse",
      code: "WH-OLD",
      address: null,
      is_active: false,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    },
  ];

  const products: ProductRow[] = [
    {
      id: "prod-1",
      name: "Filter Cartridge",
      sku: "CART-01",
      unit: "pcs",
      minimum_stock: 15,
      track_inventory: true,
      is_active: true,
      archived_at: null,
    },
    {
      id: "prod-2",
      name: "Storage Tank",
      sku: "TANK-01",
      unit: "pcs",
      minimum_stock: 5,
      track_inventory: true,
      is_active: true,
      archived_at: null,
    },
    {
      id: "prod-svc",
      name: "Installation Service",
      sku: null,
      unit: "visit",
      minimum_stock: null,
      track_inventory: false,
      is_active: true,
      archived_at: null,
    },
  ];

  const balances: BalanceRow[] = [
    {
      organization_id: "org-1",
      warehouse_id: "wh-1",
      product_id: "prod-1",
      quantity: 10,
      version: 2,
      updated_at: "2026-08-02T00:00:00.000Z",
    },
    {
      organization_id: "org-1",
      warehouse_id: "wh-1",
      product_id: "prod-2",
      quantity: 25,
      version: 1,
      updated_at: "2026-08-02T00:00:00.000Z",
    },
  ];

  const transactions: TransactionRow[] = [
    {
      id: "tx-1",
      organization_id: "org-1",
      warehouse_id: "wh-1",
      product_id: "prod-1",
      transaction_type: "adjustment_out",
      quantity_delta: -5,
      quantity_before: 15,
      quantity_after: 10,
      reference_type: null,
      reference_id: null,
      reason: "Damaged",
      created_by: "user-1",
      created_at: "2026-08-02T00:00:00.000Z",
      idempotency_key: "k-1",
    },
  ];

  it("scopes all queries to organization_id, computes low stock and adjustable options", async () => {
    const { client, eqCalls } = createTrackerClient({
      warehouses,
      products,
      balances,
      transactions,
    });

    const result = await getInventoryOverview(client, "org-1", {
      search: "",
      warehouseId: "",
      stockFilter: "all",
      page: 1,
    });

    expect(eqCalls.warehouses).toEqual([["organization_id", "org-1"]]);
    expect(eqCalls.products).toEqual([["organization_id", "org-1"]]);
    expect(eqCalls.inventory_balances).toEqual([["organization_id", "org-1"]]);
    expect(eqCalls.inventory_transactions).toEqual([
      ["organization_id", "org-1"],
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.summary).toEqual({
        activeWarehouseCount: 1,
        trackedBalanceCount: 2,
        lowStockCount: 1,
      });
      expect(result.data.activeWarehouses.map((w) => w.id)).toEqual(["wh-1"]);
      expect(result.data.adjustableProducts.map((p) => p.id)).toEqual([
        "prod-1",
        "prod-2",
      ]);
      expect(result.data.balances[0]?.isLowStock).toBe(true);
      expect(result.data.balances[1]?.isLowStock).toBe(false);
      expect(result.data.ledger[0]?.reason).toBe("Damaged");
    }
  });

  it("filters by low_stock, search, and warehouseId", async () => {
    const { client, eqCalls } = createTrackerClient({
      warehouses,
      products,
      balances,
      transactions,
    });

    const result = await getInventoryOverview(client, "org-1", {
      search: "cart-01",
      warehouseId: "wh-1",
      stockFilter: "low_stock",
      page: 1,
    });

    expect(eqCalls.inventory_balances).toEqual([
      ["organization_id", "org-1"],
      ["warehouse_id", "wh-1"],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.balances).toHaveLength(1);
      expect(result.data.balances[0]?.productId).toBe("prod-1");
    }
  });

  it("returns safe error when balance query fails", async () => {
    const { client } = createTrackerClient({
      warehouses,
      products,
      balancesError: { message: "raw postgres error" },
    });

    const result = await getInventoryOverview(client, "org-1", {
      search: "",
      warehouseId: "",
      stockFilter: "all",
      page: 1,
    });

    expect(result).toEqual({
      ok: false,
      message: "Unable to load inventory. Try again.",
    });
  });
});
