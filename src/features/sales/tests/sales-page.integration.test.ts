import { beforeEach, describe, expect, it, vi } from "vitest";
import SalesOrderDetailPage from "@/app/(dashboard)/dashboard/sales/[id]/page";
import SalesPage from "@/app/(dashboard)/dashboard/sales/page";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  getSalesOverview: vi.fn(),
  getSalesOrderDetail: vi.fn(),
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

vi.mock("../queries/get-sales-list", () => ({
  getSalesOverview: mocks.getSalesOverview,
}));

vi.mock("../queries/get-sales-order-detail", () => ({
  getSalesOrderDetail: mocks.getSalesOrderDetail,
}));

const VALID_ORDER_ID = "11111111-1111-4111-8111-111111111111";

describe("Sales pages", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.getSalesOverview.mockReset();
    mocks.getSalesOrderDetail.mockReset();
    mocks.requireAuthenticatedUser.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "viewer" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
    mocks.getSalesOverview.mockResolvedValue({
      ok: true,
      data: {
        filters: { search: "", status: "all", paymentStatus: "all", page: 1 },
        items: [],
        summary: {
          totalOrders: 0,
          confirmedRevenue: 0,
          outstandingBalance: 0,
        },
        currencyCode: "USD",
        timezone: "UTC",
        formOptions: { customers: [], products: [], warehouses: [] },
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
      },
    });
    mocks.getSalesOrderDetail.mockResolvedValue({
      ok: false,
      message: "Sales order not found.",
    });
  });

  it("loads sales overview using server-resolved organization and ignores spoofed searchParams", async () => {
    await SalesPage({
      searchParams: Promise.resolve({
        search: "SO-2026",
        status: "confirmed",
        paymentStatus: "paid",
        page: "2",
        organization_id: "attacker-org",
      } as Record<string, string>),
    });

    expect(mocks.getSalesOverview).toHaveBeenCalledWith(
      { client: true },
      "org-1",
      {
        search: "SO-2026",
        status: "confirmed",
        paymentStatus: "paid",
        page: 2,
      },
    );
  });

  it("does not load sales data for technician or non-single org states", async () => {
    mocks.getActiveOrganizationState.mockResolvedValueOnce({
      status: "single",
      membership: { organizationId: "org-1", role: "technician" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
    await SalesPage({ searchParams: Promise.resolve({}) });
    expect(mocks.getSalesOverview).not.toHaveBeenCalled();

    mocks.getActiveOrganizationState.mockResolvedValueOnce({
      status: "multiple",
      memberships: [
        { organizationId: "org-1", role: "owner" },
        { organizationId: "org-2", role: "owner" },
      ],
    });
    await SalesOrderDetailPage({
      params: Promise.resolve({ id: VALID_ORDER_ID }),
    });
    expect(mocks.getSalesOrderDetail).not.toHaveBeenCalled();
  });

  it("loads sales order detail using server-resolved organization", async () => {
    await SalesOrderDetailPage({
      params: Promise.resolve({ id: VALID_ORDER_ID }),
    });

    expect(mocks.getSalesOrderDetail).toHaveBeenCalledWith(
      { client: true },
      "org-1",
      VALID_ORDER_ID,
    );
  });
});
