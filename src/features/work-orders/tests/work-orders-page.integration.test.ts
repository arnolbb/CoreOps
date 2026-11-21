import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkOrderDetailPage from "@/app/(dashboard)/dashboard/work-orders/[id]/page";
import WorkOrdersPage from "@/app/(dashboard)/dashboard/work-orders/page";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  getWorkOrdersOverview: vi.fn(),
  getWorkOrderDetail: vi.fn(),
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

vi.mock("../queries/get-work-orders", () => ({
  getWorkOrdersOverview: mocks.getWorkOrdersOverview,
}));

vi.mock("../queries/get-work-order-detail", () => ({
  getWorkOrderDetail: mocks.getWorkOrderDetail,
}));

describe("WorkOrdersPage and WorkOrderDetailPage", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.getWorkOrdersOverview.mockReset();
    mocks.getWorkOrderDetail.mockReset();
    mocks.requireAuthenticatedUser.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({
      id: "user-1",
      email: "staff@acme.test",
    });
    mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "staff" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
    mocks.getWorkOrdersOverview.mockResolvedValue({
      ok: true,
      data: {
        filters: {
          search: "WO-2026",
          status: "in_progress",
          priority: "high",
          assignedTo: "me",
          page: 2,
        },
        items: [],
        summary: {
          totalCount: 0,
          inProgressCount: 0,
          scheduledCount: 0,
        },
        customers: [],
        addresses: [],
        assignees: [],
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
      },
    });
  });

  it("loads work orders using server-resolved organization only", async () => {
    await WorkOrdersPage({
      searchParams: Promise.resolve({
        search: "WO-2026",
        status: "in_progress",
        priority: "high",
        assignedTo: "me",
        page: "2",
        organization_id: "attacker-org",
      } as Record<string, string>),
    });

    expect(mocks.getWorkOrdersOverview).toHaveBeenCalledWith(
      { client: true },
      "org-1",
      "staff",
      {
        search: "WO-2026",
        status: "in_progress",
        priority: "high",
        assignedTo: "me",
        page: 2,
      },
      { userId: "user-1", userEmail: "staff@acme.test" },
    );
  });

  it("does not query work orders when role lacks read access or org is not single", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "unknown" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });

    await WorkOrdersPage({ searchParams: Promise.resolve({}) });
    await WorkOrderDetailPage({
      params: Promise.resolve({
        id: "11111111-1111-4111-8111-111111111111",
      }),
    });

    expect(mocks.getWorkOrdersOverview).not.toHaveBeenCalled();
    expect(mocks.getWorkOrderDetail).not.toHaveBeenCalled();

    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "multiple",
      memberships: [
        { organizationId: "org-1", role: "owner" },
        { organizationId: "org-2", role: "owner" },
      ],
    });

    await WorkOrdersPage({ searchParams: Promise.resolve({}) });
    await WorkOrderDetailPage({
      params: Promise.resolve({
        id: "11111111-1111-4111-8111-111111111111",
      }),
    });

    expect(mocks.getWorkOrdersOverview).not.toHaveBeenCalled();
    expect(mocks.getWorkOrderDetail).not.toHaveBeenCalled();
  });

  it("loads work order detail using server-resolved organization and user", async () => {
    mocks.getWorkOrderDetail.mockResolvedValue({
      ok: false,
      message: "Work order not found.",
    });

    await WorkOrderDetailPage({
      params: Promise.resolve({
        id: "11111111-1111-4111-8111-111111111111",
      }),
    });

    expect(mocks.getWorkOrderDetail).toHaveBeenCalledWith(
      { client: true },
      "org-1",
      "11111111-1111-4111-8111-111111111111",
      "staff",
      "staff@acme.test",
      "user-1",
    );
  });
});
