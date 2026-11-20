import { describe, expect, it } from "vitest";
import { parseInventorySearchParams } from "../schemas/inventory-search-schema";

describe("parseInventorySearchParams", () => {
  it("returns safe defaults for missing params", () => {
    expect(parseInventorySearchParams({})).toEqual({
      search: "",
      warehouseId: "",
      stockFilter: "all",
      page: 1,
    });
  });

  it("parses valid filters including UUID warehouseId and low_stock filter", () => {
    const warehouseId = "11111111-1111-4111-8111-111111111111";

    expect(
      parseInventorySearchParams({
        search: "  CART-01  ",
        warehouseId,
        stockFilter: "low_stock",
        page: "2",
      }),
    ).toEqual({
      search: "CART-01",
      warehouseId,
      stockFilter: "low_stock",
      page: 2,
    });
  });

  it("falls back safely for invalid warehouseId, stockFilter, page, and overlong search", () => {
    expect(
      parseInventorySearchParams({
        search: "x".repeat(101),
        warehouseId: "not-a-uuid",
        stockFilter: "weird",
        page: "0",
      }),
    ).toEqual({
      search: "",
      warehouseId: "",
      stockFilter: "all",
      page: 1,
    });
  });
});
