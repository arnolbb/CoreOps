import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database-generated";
import {
  CUSTOMER_LIST_PAGE_SIZE,
  getCustomerList,
} from "../queries/get-customer-list";

type CustomerRow = Pick<
  Database["public"]["Tables"]["customers"]["Row"],
  | "id"
  | "display_name"
  | "customer_type"
  | "company_name"
  | "phone"
  | "email"
  | "status"
  | "created_at"
  | "updated_at"
  | "archived_at"
>;

type QueryResponse = {
  data: CustomerRow[] | null;
  error: { message: string } | null;
  count: number | null;
};

class CustomerQueryBuilder {
  public readonly eqCalls: Array<[string, string]> = [];
  public orCall: string | null = null;
  public rangeCall: [number, number] | null = null;
  public orderCall: [string, { ascending: boolean }] | null = null;
  public selectCall: [string, { count: "exact" }] | null = null;

  constructor(private readonly response: QueryResponse) {}

  select(columns: string, options: { count: "exact" }) {
    this.selectCall = [columns, options];
    return this;
  }

  eq(column: string, value: string) {
    this.eqCalls.push([column, value]);
    return this;
  }

  or(expression: string) {
    this.orCall = expression;
    return this;
  }

  order(column: string, options: { ascending: boolean }) {
    this.orderCall = [column, options];
    return this;
  }

  range(from: number, to: number) {
    this.rangeCall = [from, to];
    return Promise.resolve(this.response);
  }
}

function createCustomerRow(overrides: Partial<CustomerRow>): CustomerRow {
  return {
    id: "customer-1",
    display_name: "Acme Retail",
    customer_type: "business",
    company_name: "Acme Co",
    phone: "+620000000001",
    email: "buyer@example.test",
    status: "active",
    created_at: "2026-07-20T00:00:00.000Z",
    updated_at: "2026-07-21T00:00:00.000Z",
    archived_at: null,
    ...overrides,
  };
}

function createClient(response: QueryResponse) {
  const builder = new CustomerQueryBuilder(response);

  const client = {
    from(table: string) {
      if (table !== "customers") {
        throw new Error(`Unexpected table ${table}`);
      }

      return builder;
    },
  } as unknown as SupabaseClient<Database>;

  return { client, builder };
}

describe("getCustomerList", () => {
  it("queries server-resolved organization with active default pagination", async () => {
    const { client, builder } = createClient({
      data: [createCustomerRow({ id: "customer-1" })],
      error: null,
      count: 1,
    });

    const result = await getCustomerList(client, "org-1", {
      search: "",
      status: "active",
      page: 1,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        filters: { search: "", status: "active", page: 1 },
        items: [
          {
            id: "customer-1",
            displayName: "Acme Retail",
            customerType: "business",
            companyName: "Acme Co",
            phone: "+620000000001",
            email: "buyer@example.test",
            status: "active",
            createdAt: "2026-07-20T00:00:00.000Z",
            updatedAt: "2026-07-21T00:00:00.000Z",
            archivedAt: null,
          },
        ],
        pageSize: CUSTOMER_LIST_PAGE_SIZE,
        totalCount: 1,
        totalPages: 1,
      },
    });
    expect(builder.eqCalls).toEqual([
      ["organization_id", "org-1"],
      ["status", "active"],
    ]);
    expect(builder.rangeCall).toEqual([0, CUSTOMER_LIST_PAGE_SIZE - 1]);
  });

  it("searches allowlisted customer fields and supports all statuses", async () => {
    const { client, builder } = createClient({
      data: [],
      error: null,
      count: 0,
    });

    await getCustomerList(client, "org-1", {
      search: "Acme,*(Retail)%",
      status: "all",
      page: 2,
    });

    expect(builder.eqCalls).toEqual([["organization_id", "org-1"]]);
    expect(builder.orCall).toBe(
      "display_name.ilike.*Acme Retail*,company_name.ilike.*Acme Retail*,email.ilike.*Acme Retail*,phone.ilike.*Acme Retail*",
    );
    expect(builder.rangeCall).toEqual([
      CUSTOMER_LIST_PAGE_SIZE,
      CUSTOMER_LIST_PAGE_SIZE * 2 - 1,
    ]);
  });

  it("maps archived status and returns safe load errors", async () => {
    const archived = createClient({
      data: [
        createCustomerRow({
          id: "customer-2",
          status: "archived",
          archived_at: "2026-07-22T00:00:00.000Z",
        }),
      ],
      error: null,
      count: 11,
    });

    const archivedResult = await getCustomerList(archived.client, "org-1", {
      search: "buyer@example.test",
      status: "archived",
      page: 1,
    });

    expect(archivedResult.ok).toBe(true);
    if (archivedResult.ok) {
      expect(archivedResult.data.items[0]?.status).toBe("archived");
      expect(archivedResult.data.totalPages).toBe(2);
    }

    const failing = createClient({
      data: null,
      error: { message: "raw database error" },
      count: null,
    });

    await expect(
      getCustomerList(failing.client, "org-1", {
        search: "",
        status: "active",
        page: 1,
      }),
    ).resolves.toEqual({
      ok: false,
      message: "Unable to load customers. Try again.",
    });
  });
});
