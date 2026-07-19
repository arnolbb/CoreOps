import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database-generated";
import type { CreateOrganizationInput } from "../schemas/create-organization-schema";
import { createOrganization } from "../services/create-organization";

function createClient(response: unknown) {
  return {
    rpc() {
      return Promise.resolve(response);
    },
  } as unknown as SupabaseClient<Database>;
}

const input: CreateOrganizationInput = {
  name: "Acme Operations",
  slug: "acme-operations",
  businessType: "general",
  timezone: "UTC",
  currencyCode: "USD",
};

describe("createOrganization", () => {
  it("calls atomic RPC and maps created organization", async () => {
    const result = await createOrganization(
      createClient({
        data: {
          id: "org-1",
          name: "Acme Operations",
          slug: "acme-operations",
          business_type: "general",
          timezone: "UTC",
          currency_code: "USD",
        },
        error: null,
      }),
      input,
    );

    expect(result).toEqual({
      ok: true,
      organization: {
        id: "org-1",
        name: "Acme Operations",
        slug: "acme-operations",
        businessType: "general",
        timezone: "UTC",
        currencyCode: "USD",
      },
    });
  });

  it("maps duplicate slug safely", async () => {
    const result = await createOrganization(
      createClient({ data: null, error: { code: "23505" } }),
      input,
    );

    expect(result).toEqual({
      ok: false,
      code: "DUPLICATE_SLUG",
      message: "This organization address is unavailable.",
    });
  });

  it("hides unexpected database errors", async () => {
    const result = await createOrganization(
      createClient({ data: null, error: { code: "XX000", message: "raw db" } }),
      input,
    );

    expect(result).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: "Something went wrong. Try again.",
    });
  });
});
