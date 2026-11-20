import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database-generated";
import {
  PRODUCT_LIST_PAGE_SIZE,
  getProductList,
} from "../queries/get-product-list";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CategoryRow = Database["public"]["Tables"]["product_categories"]["Row"];

function createProductRow(overrides: Partial<ProductRow>): ProductRow {
  return {
    id: "prod-1",
    organization_id: "org-1",
    product_type: "goods",
    name: "Filter Cartridge",
    sku: "FLT-001",
    category_id: "cat-1",
    unit: "pcs",
    description: "Standard replacement cartridge",
    cost_price: 15,
    selling_price: 30,
    track_inventory: true,
    minimum_stock: 5,
    is_active: true,
    image_path: null,
    created_by: "user-1",
    created_at: "2026-07-30T00:00:00.000Z",
    updated_at: "2026-07-31T00:00:00.000Z",
    archived_at: null,
    ...overrides,
  };
}

function createCategoryRow(overrides: Partial<CategoryRow>): CategoryRow {
  return {
    id: "cat-1",
    organization_id: "org-1",
    name: "Filters",
    parent_id: null,
    created_at: "2026-07-30T00:00:00.000Z",
    updated_at: "2026-07-30T00:00:00.000Z",
    ...overrides,
  };
}

class ProductQueryTracker {
  public productSelectColumns = "";
  public readonly productEqCalls: Array<[string, unknown]> = [];
  public readonly productIsCalls: Array<[string, unknown]> = [];
  public productOrCall: string | null = null;
  public productRangeCall: [number, number] | null = null;

  constructor(
    private readonly options: {
      currencyCode?: string;
      categories?: CategoryRow[];
      products?: ProductRow[];
      productsError?: { message: string } | null;
      count?: number | null;
    },
  ) {}

  createClient() {
    return {
      from: (table: string) => {
        if (table === "organizations") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      currency_code: this.options.currencyCode ?? "IDR",
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }

        if (table === "product_categories") {
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: this.options.categories ?? [],
                    error: null,
                  }),
              }),
            }),
          };
        }

        if (table === "products") {
          const builder = {
            select: (columns: string) => {
              this.productSelectColumns = columns;
              return builder;
            },
            eq: (column: string, value: unknown) => {
              this.productEqCalls.push([column, value]);
              return builder;
            },
            is: (column: string, value: unknown) => {
              this.productIsCalls.push([column, value]);
              return builder;
            },
            or: (expression: string) => {
              this.productOrCall = expression;
              return builder;
            },
            order: () => builder,
            range: (from: number, to: number) => {
              this.productRangeCall = [from, to];
              return Promise.resolve({
                data: this.options.products ?? [],
                error: this.options.productsError ?? null,
                count: this.options.count ?? 0,
              });
            },
          };

          return builder;
        }

        throw new Error(`Unexpected table ${table}`);
      },
    } as unknown as SupabaseClient<Database>;
  }
}

describe("getProductList", () => {
  it("queries active products for server-resolved organization and includes costPrice when permitted", async () => {
    const tracker = new ProductQueryTracker({
      currencyCode: "IDR",
      categories: [createCategoryRow({ id: "cat-1", name: "Filters" })],
      products: [createProductRow({ id: "prod-1", cost_price: 15 })],
      count: 1,
    });

    const result = await getProductList(
      tracker.createClient(),
      "org-1",
      {
        search: "",
        status: "active",
        productType: "all",
        categoryId: "",
        page: 1,
      },
      { canViewCost: true },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.currencyCode).toBe("IDR");
      expect(result.data.items[0]?.costPrice).toBe(15);
      expect(result.data.items[0]?.categoryName).toBe("Filters");
      expect(result.data.items[0]?.status).toBe("active");
    }
    expect(tracker.productSelectColumns).toContain("cost_price");
    expect(tracker.productEqCalls).toEqual([
      ["organization_id", "org-1"],
      ["is_active", true],
    ]);
    expect(tracker.productIsCalls).toEqual([["archived_at", null]]);
    expect(tracker.productRangeCall).toEqual([0, PRODUCT_LIST_PAGE_SIZE - 1]);
  });

  it("omits cost_price from select and sets costPrice to null when canViewCost is false", async () => {
    const tracker = new ProductQueryTracker({
      products: [createProductRow({ id: "prod-1", cost_price: 99 })],
      count: 1,
    });

    const result = await getProductList(
      tracker.createClient(),
      "org-1",
      {
        search: "FLT,*(001)%",
        status: "all",
        productType: "goods",
        categoryId: "11111111-1111-4111-8111-111111111111",
        page: 2,
      },
      { canViewCost: false },
    );

    expect(tracker.productSelectColumns).not.toContain("cost_price");
    expect(tracker.productEqCalls).toEqual([
      ["organization_id", "org-1"],
      ["product_type", "goods"],
      ["category_id", "11111111-1111-4111-8111-111111111111"],
    ]);
    expect(tracker.productOrCall).toBe(
      "name.ilike.*FLT 001*,sku.ilike.*FLT 001*",
    );
    expect(tracker.productRangeCall).toEqual([
      PRODUCT_LIST_PAGE_SIZE,
      PRODUCT_LIST_PAGE_SIZE * 2 - 1,
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items[0]?.costPrice).toBeNull();
    }
  });

  it("masks raw database errors safely", async () => {
    const tracker = new ProductQueryTracker({
      products: undefined,
      productsError: { message: "relation public.products failed" },
      count: null,
    });

    const result = await getProductList(
      tracker.createClient(),
      "org-1",
      {
        search: "",
        status: "archived",
        productType: "all",
        categoryId: "",
        page: 1,
      },
      { canViewCost: true },
    );

    expect(result).toEqual({
      ok: false,
      message: "Unable to load products. Try again.",
    });
  });
});
