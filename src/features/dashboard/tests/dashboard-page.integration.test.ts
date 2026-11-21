import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  getDashboardOverview: vi.fn(),
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

vi.mock("@/features/dashboard/queries/get-dashboard-overview", () => ({
  getDashboardOverview: mocks.getDashboardOverview,
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.getDashboardOverview.mockReset();
    mocks.requireAuthenticatedUser.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "owner" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
    mocks.getDashboardOverview.mockResolvedValue({
      ok: true,
      data: {
        organization: {
          id: "org-1",
          name: "Acme",
          currencyCode: "USD",
          timezone: "Asia/Jakarta",
          resolvedTimezone: "Asia/Jakarta",
        },
        role: "owner",
        capabilities: {
          canReadCustomers: true,
          canReadSales: true,
          canViewFinancialTotals: true,
          canReadInventory: true,
          canReadWorkOrders: true,
          canViewAuditActivity: true,
        },
        monthPeriod: {
          label: "May 2026",
          startIso: "2026-04-30T17:00:00.000Z",
          endIso: "2026-05-31T17:00:00.000Z",
        },
        kpis: {
          activeCustomerCount: 0,
          monthlySalesCount: 0,
          monthlySalesTotal: 0,
          outstandingOrdersCount: 0,
          outstandingTotal: 0,
          lowStockCount: 0,
          activeWorkOrdersCount: 0,
        },
        lowStockItems: [],
        activeWorkOrders: [],
        recentActivity: [],
        isEmptyOrganization: true,
      },
    });
  });

  it("loads overview using server-resolved organization and renders onboarding guidance when empty", async () => {
    const element = await DashboardPage();
    const html = renderToStaticMarkup(element);

    expect(mocks.getDashboardOverview).toHaveBeenCalledWith(
      { client: true },
      "org-1",
      "owner",
    );
    expect(html).toContain(">Dashboard</h1>");
    expect(html).toContain("Organization setup is complete.");
    expect(html).toContain('href="/dashboard/customers"');
    expect(html).toContain('href="/dashboard/products"');
    expect(html).toContain('href="/dashboard/inventory"');
    expect(html).toContain('href="/dashboard/sales"');
    expect(html).toContain('href="/dashboard/work-orders"');
  });

  it("does not query dashboard overview without a single active organization", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "multiple",
      memberships: [
        { organizationId: "org-1", role: "owner" },
        { organizationId: "org-2", role: "owner" },
      ],
    });

    await DashboardPage();

    expect(mocks.getDashboardOverview).not.toHaveBeenCalled();
  });

  it("does not query dashboard overview when role lacks access", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "unknown" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });

    await DashboardPage();

    expect(mocks.getDashboardOverview).not.toHaveBeenCalled();
  });

  it("renders restricted state without monetary figures for staff", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "staff" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
    mocks.getDashboardOverview.mockResolvedValue({
      ok: true,
      data: {
        organization: {
          id: "org-1",
          name: "Acme",
          currencyCode: "USD",
          timezone: "UTC",
          resolvedTimezone: "UTC",
        },
        role: "staff",
        capabilities: {
          canReadCustomers: true,
          canReadSales: true,
          canViewFinancialTotals: false,
          canReadInventory: true,
          canReadWorkOrders: true,
          canViewAuditActivity: false,
        },
        monthPeriod: {
          label: "May 2026",
          startIso: "2026-05-01T00:00:00.000Z",
          endIso: "2026-06-01T00:00:00.000Z",
        },
        kpis: {
          activeCustomerCount: 2,
          monthlySalesCount: 3,
          monthlySalesTotal: null,
          outstandingOrdersCount: 1,
          outstandingTotal: null,
          lowStockCount: 1,
          activeWorkOrdersCount: 2,
        },
        lowStockItems: [],
        activeWorkOrders: [],
        recentActivity: [],
        isEmptyOrganization: false,
      },
    });

    const element = await DashboardPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Restricted");
    expect(html).toContain("3 orders");
    expect(html).toContain("1 open order");
    expect(html).not.toContain("$");
  });
});
