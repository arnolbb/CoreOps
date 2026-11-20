import { beforeEach, describe, expect, it, vi } from "vitest";
import InventoryPage from "@/app/(dashboard)/dashboard/inventory/page";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  getInventoryOverview: vi.fn(),
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

vi.mock("../queries/get-inventory-overview", () => ({
  getInventoryOverview: mocks.getInventoryOverview,
}));

describe("InventoryPage", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.getInventoryOverview.mockReset();
    mocks.requireAuthenticatedUser.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "staff" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
    mocks.getInventoryOverview.mockResolvedValue({
      ok: true,
      data: {
        filters: {
          search: "Cart",
          warehouseId: "",
          stockFilter: "low_stock",
          page: 2,
        },
        warehouses: [],
        activeWarehouses: [],
        adjustableProducts: [],
        balances: [],
        ledger: [],
        summary: {
          activeWarehouseCount: 0,
          trackedBalanceCount: 0,
          lowStockCount: 0,
        },
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
      },
    });
  });

  it("loads inventory using server-resolved organization only", async () => {
    await InventoryPage({
      searchParams: Promise.resolve({
        search: "Cart",
        stockFilter: "low_stock",
        page: "2",
        organization_id: "attacker-org",
      }),
    });

    expect(mocks.getInventoryOverview).toHaveBeenCalledWith(
      { client: true },
      "org-1",
      {
        search: "Cart",
        warehouseId: "",
        stockFilter: "low_stock",
        page: 2,
      },
    );
  });

  it("does not query inventory when role lacks read access", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "unknown" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });

    await InventoryPage({ searchParams: Promise.resolve({}) });

    expect(mocks.getInventoryOverview).not.toHaveBeenCalled();
  });

  it("does not query tenant data without a single active organization", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "multiple",
      memberships: [
        { organizationId: "org-1", role: "owner" },
        { organizationId: "org-2", role: "owner" },
      ],
    });

    await InventoryPage({ searchParams: Promise.resolve({}) });

    expect(mocks.getInventoryOverview).not.toHaveBeenCalled();
  });
});
