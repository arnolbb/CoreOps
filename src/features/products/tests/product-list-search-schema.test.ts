import { describe, expect, it } from "vitest";
import { parseProductListSearchParams } from "../schemas/product-list-search-schema";

describe("parseProductListSearchParams", () => {
  it("returns safe defaults for missing params", () => {
    expect(parseProductListSearchParams({})).toEqual({
      search: "",
      status: "active",
      productType: "all",
      categoryId: "",
      page: 1,
    });
  });

  it("parses valid filters including UUID categoryId", () => {
    const categoryId = "11111111-1111-4111-8111-111111111111";

    expect(
      parseProductListSearchParams({
        search: "  SKU-100  ",
        status: "archived",
        productType: "goods",
        categoryId,
        page: "2",
      }),
    ).toEqual({
      search: "SKU-100",
      status: "archived",
      productType: "goods",
      categoryId,
      page: 2,
    });
  });

  it("falls back safely for invalid status, productType, categoryId, and page", () => {
    expect(
      parseProductListSearchParams({
        search: "x".repeat(101),
        status: "deleted",
        productType: "bundle",
        categoryId: "bad-id",
        page: "-2",
      }),
    ).toEqual({
      search: "",
      status: "active",
      productType: "all",
      categoryId: "",
      page: 1,
    });
  });
});
