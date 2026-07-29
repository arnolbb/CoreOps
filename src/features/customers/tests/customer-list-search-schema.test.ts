import { describe, expect, it } from "vitest";
import { parseCustomerListSearchParams } from "../schemas/customer-list-search-schema";

interface Params {
  search?: string;
  status?: string;
  page?: string;
}

describe("parseCustomerListSearchParams", () => {
  it("returns safe defaults for missing params", () => {
    expect(parseCustomerListSearchParams({})).toEqual({
      search: "",
      status: "active",
      page: 1,
    });
  });

  it("trims search and parses allowed filters", () => {
    expect(
      parseCustomerListSearchParams({
        search: "  acme  ",
        status: "archived",
        page: "3",
      }),
    ).toEqual({
      search: "acme",
      status: "archived",
      page: 3,
    });
  });

  it("falls back when status or page is unsafe", () => {
    const params: Params = {
      search: "Beta",
      status: "deleted",
      page: "0",
    };

    expect(parseCustomerListSearchParams(params)).toEqual({
      search: "Beta",
      status: "active",
      page: 1,
    });
  });

  it("caps overlong searches without throwing", () => {
    expect(
      parseCustomerListSearchParams({ search: "x".repeat(101), status: "all" }),
    ).toEqual({
      search: "",
      status: "all",
      page: 1,
    });
  });
});
