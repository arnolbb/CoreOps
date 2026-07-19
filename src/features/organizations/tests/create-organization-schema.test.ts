import { describe, expect, it } from "vitest";
import {
  createOrganizationSchema,
  generateOrganizationSlug,
} from "../schemas/create-organization-schema";

describe("createOrganizationSchema", () => {
  it("generates deterministic slugs", () => {
    expect(generateOrganizationSlug(" Acme Operations, Inc. ")).toBe(
      "acme-operations-inc",
    );
  });

  it("validates a complete organization payload", () => {
    const parsed = createOrganizationSchema.parse({
      name: "Acme Operations",
      slug: "acme-operations",
      businessType: "general",
      timezone: "UTC",
      currencyCode: "usd",
    });

    expect(parsed).toEqual({
      name: "Acme Operations",
      slug: "acme-operations",
      businessType: "general",
      timezone: "UTC",
      currencyCode: "USD",
    });
  });

  it("rejects invalid slugs", () => {
    const parsed = createOrganizationSchema.safeParse({
      name: "Acme Operations",
      slug: "-bad slug-",
      businessType: "general",
      timezone: "UTC",
      currencyCode: "USD",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid timezone", () => {
    const parsed = createOrganizationSchema.safeParse({
      name: "Acme Operations",
      slug: "acme-operations",
      businessType: "general",
      timezone: "Not/AZone",
      currencyCode: "USD",
    });

    expect(parsed.success).toBe(false);
  });
});
