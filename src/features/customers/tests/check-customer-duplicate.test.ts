import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database-generated";
import { checkCustomerDuplicate } from "../queries/check-customer-duplicate";

type FilterCall = {
  op: "eq" | "neq" | "limit";
  args: unknown[];
};

function createQueryTracker(
  responses: Array<{ data: Array<{ id: string }> | null; error: unknown }>,
) {
  const queries: FilterCall[][] = [];

  const supabase = {
    from(table: string) {
      if (table !== "customers") {
        throw new Error(`Unexpected table ${table}`);
      }

      const calls: FilterCall[] = [];
      queries.push(calls);
      const response = responses.shift() ?? { data: [], error: null };

      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          calls.push({ op: "eq", args: [column, value] });
          return builder;
        },
        neq(column: string, value: unknown) {
          calls.push({ op: "neq", args: [column, value] });
          return builder;
        },
        limit(count: number) {
          calls.push({ op: "limit", args: [count] });
          return Promise.resolve(response);
        },
        or() {
          throw new Error("Unsafe PostgREST .or() interpolation is forbidden");
        },
      };

      return builder;
    },
  } as unknown as SupabaseClient<Database>;

  return { supabase, queries };
}

describe("checkCustomerDuplicate", () => {
  it("returns no duplicate when email and phone are empty", async () => {
    const { supabase, queries } = createQueryTracker([]);

    const result = await checkCustomerDuplicate(supabase, "org-1", "   ", "");

    expect(result).toEqual({
      hasDuplicate: false,
      duplicateEmail: false,
      duplicatePhone: false,
    });
    expect(queries).toHaveLength(0);
  });

  it("checks email via parameterized eq without raw PostgREST or interpolation", async () => {
    const { supabase, queries } = createQueryTracker([
      { data: [{ id: "cust-1" }], error: null },
    ]);

    const result = await checkCustomerDuplicate(
      supabase,
      "org-1",
      "user,test(1)%@example.test",
      null,
      "cust-self",
    );

    expect(result).toEqual({
      hasDuplicate: true,
      duplicateEmail: true,
      duplicatePhone: false,
    });
    expect(queries).toEqual([
      [
        { op: "eq", args: ["organization_id", "org-1"] },
        { op: "eq", args: ["status", "active"] },
        { op: "eq", args: ["email", "user,test(1)%@example.test"] },
        { op: "neq", args: ["id", "cust-self"] },
        { op: "limit", args: [1] },
      ],
    ]);
  });

  it("checks both email and phone independently and detects both duplicates", async () => {
    const { supabase, queries } = createQueryTracker([
      { data: [{ id: "cust-1" }], error: null },
      { data: [{ id: "cust-2" }], error: null },
    ]);

    const result = await checkCustomerDuplicate(
      supabase,
      "org-1",
      "dup@example.test",
      "+62-812-0000",
    );

    expect(result).toEqual({
      hasDuplicate: true,
      duplicateEmail: true,
      duplicatePhone: true,
    });
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContainEqual({
      op: "eq",
      args: ["email", "dup@example.test"],
    });
    expect(queries[1]).toContainEqual({
      op: "eq",
      args: ["phone", "+62-812-0000"],
    });
  });

  it("returns false safely when duplicate lookup encounters a database error", async () => {
    const { supabase } = createQueryTracker([
      { data: null, error: { message: "transient failure" } },
    ]);

    const result = await checkCustomerDuplicate(
      supabase,
      "org-1",
      "dup@example.test",
      null,
    );

    expect(result).toEqual({
      hasDuplicate: false,
      duplicateEmail: false,
      duplicatePhone: false,
    });
  });
});
