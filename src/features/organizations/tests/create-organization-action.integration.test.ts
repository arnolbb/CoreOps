import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOrganizationAction } from "../actions/create-organization";

const mocks = vi.hoisted(() => ({
  createOrganization: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect(path: string) {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("../queries/get-active-organization-memberships", () => ({
  getActiveOrganizationState: mocks.getActiveOrganizationState,
}));

vi.mock("../services/create-organization", () => ({
  createOrganization: mocks.createOrganization,
}));

function validFormData() {
  const formData = new FormData();
  formData.set("name", "Acme Operations");
  formData.set("slug", "acme-operations");
  formData.set("businessType", "general");
  formData.set("timezone", "UTC");
  formData.set("currencyCode", "USD");
  formData.set("user_id", "malicious-user-id");
  formData.set("organization_id", "malicious-org-id");
  return formData;
}

describe("createOrganizationAction", () => {
  beforeEach(() => {
    mocks.requireAuthenticatedUser.mockReset();
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.createOrganization.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
    mocks.getActiveOrganizationState.mockResolvedValue({ status: "none" });
  });

  it("does not create an organization when membership query fails", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "error",
      message: "Unable to load organization access. Try again.",
    });

    const result = await createOrganizationAction(
      { status: "idle" },
      validFormData(),
    );

    expect(result).toEqual({
      status: "error",
      message: "Unable to load organization access. Try again.",
    });
    expect(mocks.createOrganization).not.toHaveBeenCalled();
  });

  it("redirects instead of creating when an active membership already exists", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "owner" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });

    await expect(
      createOrganizationAction({ status: "idle" }, validFormData()),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(mocks.createOrganization).not.toHaveBeenCalled();
  });

  it("creates organization from validated fields and ignores browser ownership fields", async () => {
    mocks.createOrganization.mockResolvedValue({
      ok: true,
      organization: { id: "org-1" },
    });

    await expect(
      createOrganizationAction({ status: "idle" }, validFormData()),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(mocks.createOrganization).toHaveBeenCalledWith(
      { client: true },
      {
        name: "Acme Operations",
        slug: "acme-operations",
        businessType: "general",
        timezone: "UTC",
        currencyCode: "USD",
      },
    );
  });

  it("maps duplicate slug safely", async () => {
    mocks.createOrganization.mockResolvedValue({
      ok: false,
      code: "DUPLICATE_SLUG",
      message: "This organization address is unavailable.",
    });

    const result = await createOrganizationAction(
      { status: "idle" },
      validFormData(),
    );

    expect(result).toEqual({
      status: "error",
      message: "This organization address is unavailable.",
    });
  });
});
