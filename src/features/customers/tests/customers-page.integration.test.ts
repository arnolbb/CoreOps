import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomersPage from "@/app/(dashboard)/dashboard/customers/page";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  getCustomerList: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock(
  "@/features/organizations/queries/get-active-organization-memberships",
  () => ({
    getActiveOrganizationState: mocks.getActiveOrganizationState,
  }),
);

vi.mock("../queries/get-customer-list", () => ({
  getCustomerList: mocks.getCustomerList,
}));

describe("CustomersPage", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.getCustomerList.mockReset();
    mocks.requireAuthenticatedUser.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "viewer" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
    mocks.getCustomerList.mockResolvedValue({
      ok: true,
      data: {
        filters: { search: "Acme", status: "all", page: 2 },
        items: [],
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
      },
    });
  });

  it("loads customers using server-resolved organization only", async () => {
    await CustomersPage({
      searchParams: Promise.resolve({
        search: "Acme",
        status: "all",
        page: "2",
        organization_id: "attacker-org",
      }),
    });

    expect(mocks.getCustomerList).toHaveBeenCalledWith(
      { client: true },
      "org-1",
      { search: "Acme", status: "all", page: 2 },
    );
  });

  it("does not query customers for technician broad access", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "technician" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });

    await CustomersPage({ searchParams: Promise.resolve({}) });

    expect(mocks.getCustomerList).not.toHaveBeenCalled();
  });

  it("does not query tenant data without a single active organization", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "multiple",
      memberships: [
        { organizationId: "org-1", role: "owner" },
        { organizationId: "org-2", role: "owner" },
      ],
    });

    await CustomersPage({ searchParams: Promise.resolve({}) });

    expect(mocks.getCustomerList).not.toHaveBeenCalled();
  });
});
