import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductsPage from "@/app/(dashboard)/dashboard/products/page";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  getProductList: vi.fn(),
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

vi.mock("../queries/get-product-list", () => ({
  getProductList: mocks.getProductList,
}));

describe("ProductsPage", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.getProductList.mockReset();
    mocks.requireAuthenticatedUser.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "staff" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
    mocks.getProductList.mockResolvedValue({
      ok: true,
      data: {
        filters: {
          search: "Filter",
          status: "all",
          productType: "goods",
          categoryId: "",
          page: 2,
        },
        items: [],
        categories: [],
        currencyCode: "USD",
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
      },
    });
  });

  it("loads products using server-resolved organization and hides cost for staff", async () => {
    await ProductsPage({
      searchParams: Promise.resolve({
        search: "Filter",
        status: "all",
        productType: "goods",
        page: "2",
        organization_id: "attacker-org",
      }),
    });

    expect(mocks.getProductList).toHaveBeenCalledWith(
      { client: true },
      "org-1",
      {
        search: "Filter",
        status: "all",
        productType: "goods",
        categoryId: "",
        page: 2,
      },
      { canViewCost: false },
    );
  });

  it("passes canViewCost=true for owner", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "owner" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });

    await ProductsPage({ searchParams: Promise.resolve({}) });

    expect(mocks.getProductList).toHaveBeenCalledWith(
      { client: true },
      "org-1",
      {
        search: "",
        status: "active",
        productType: "all",
        categoryId: "",
        page: 1,
      },
      { canViewCost: true },
    );
  });

  it("does not query tenant data without a single active organization", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "multiple",
      memberships: [
        { organizationId: "org-1", role: "owner" },
        { organizationId: "org-2", role: "owner" },
      ],
    });

    await ProductsPage({ searchParams: Promise.resolve({}) });

    expect(mocks.getProductList).not.toHaveBeenCalled();
  });
});
