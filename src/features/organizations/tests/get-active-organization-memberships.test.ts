import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database-generated";
import { getActiveOrganizationState } from "../queries/get-active-organization-memberships";

type QueryResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

type MembershipRow = {
  organization_id: string;
  role: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
};

class QueryBuilder<T> {
  constructor(private readonly response: QueryResponse<T>) {}

  select() {
    return this;
  }

  eq() {
    return this;
  }

  limit() {
    return Promise.resolve(this.response);
  }

  single() {
    return Promise.resolve(this.response);
  }
}

function createClient(
  memberships: QueryResponse<MembershipRow[]>,
  organization: QueryResponse<OrganizationRow>,
) {
  return {
    from(table: string) {
      if (table === "organization_memberships") {
        return new QueryBuilder(memberships);
      }

      return new QueryBuilder(organization);
    },
  } as unknown as SupabaseClient<Database>;
}

describe("getActiveOrganizationState", () => {
  it("returns none for a successful zero-membership query", async () => {
    const state = await getActiveOrganizationState(
      createClient({ data: [], error: null }, { data: null, error: null }),
      "user-1",
    );

    expect(state).toEqual({ status: "none" });
  });

  it("returns error for membership query failure", async () => {
    const state = await getActiveOrganizationState(
      createClient(
        { data: null, error: { message: "network failed" } },
        { data: null, error: null },
      ),
      "user-1",
    );

    expect(state.status).toBe("error");
  });

  it("returns single when exactly one active membership exists", async () => {
    const state = await getActiveOrganizationState(
      createClient(
        { data: [{ organization_id: "org-1", role: "owner" }], error: null },
        {
          data: { id: "org-1", name: "Acme", slug: "acme" },
          error: null,
        },
      ),
      "user-1",
    );

    expect(state).toEqual({
      status: "single",
      membership: { organizationId: "org-1", role: "owner" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
  });

  it("returns multiple without choosing one implicitly", async () => {
    const state = await getActiveOrganizationState(
      createClient(
        {
          data: [
            { organization_id: "org-1", role: "owner" },
            { organization_id: "org-2", role: "admin" },
          ],
          error: null,
        },
        { data: null, error: null },
      ),
      "user-1",
    );

    expect(state).toEqual({
      status: "multiple",
      memberships: [
        { organizationId: "org-1", role: "owner" },
        { organizationId: "org-2", role: "admin" },
      ],
    });
  });
});
