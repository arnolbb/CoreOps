import { beforeEach, describe, expect, it, vi } from "vitest";
import { adjustStockAction } from "../actions/adjust-stock";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
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

const validInput = {
  warehouseId: "11111111-1111-4111-8111-111111111111",
  productId: "22222222-2222-4222-8222-222222222222",
  adjustmentType: "adjustment_out" as const,
  quantity: 5,
  reason: "Damaged units",
  idempotencyKey: "adj-key-1",
};

describe("adjustStockAction", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.requireAuthenticatedUser.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.rpc.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.createSupabaseServerClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "staff" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
  });

  it("denies stock adjustment when user does not have a single active organization", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "multiple",
      memberships: [
        { organizationId: "org-1", role: "owner" },
        { organizationId: "org-2", role: "owner" },
      ],
    });

    const result = await adjustStockAction(validInput);

    expect(result).toEqual({
      ok: false,
      message: "Active organization required.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each(["viewer", "technician", "manager"])(
    "denies stock adjustment for %s role with a safe message",
    async (role) => {
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });

      const result = await adjustStockAction(validInput);

      expect(result).toEqual({
        ok: false,
        message: "You do not have access to perform this action.",
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("returns field errors for invalid adjustment input", async () => {
    const result = await adjustStockAction({
      ...validInput,
      quantity: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.quantity).toBeDefined();
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("maps known RPC domain errors to safe user-facing messages", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "insufficient stock balance", code: "22003" },
    });

    const result = await adjustStockAction(validInput);

    expect(result).toEqual({
      ok: false,
      message: "Insufficient stock balance for this adjustment.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("masks unexpected raw database errors", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        message:
          'column reference "organization_id" is ambiguous in public.inventory_balances',
        code: "42702",
      },
    });

    const result = await adjustStockAction(validInput);

    expect(result).toEqual({
      ok: false,
      message: "Unable to perform stock adjustment. Try again.",
    });
  });

  it("calls perform_stock_adjustment and returns updated balance on success", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          transaction_id: "33333333-3333-4333-8333-333333333333",
          quantity_before: "25.000",
          quantity_after: "20.000",
        },
      ],
      error: null,
    });

    const result = await adjustStockAction(validInput);

    expect(mocks.rpc).toHaveBeenCalledWith("perform_stock_adjustment", {
      p_warehouse_id: validInput.warehouseId,
      p_product_id: validInput.productId,
      p_adjustment_type: validInput.adjustmentType,
      p_quantity: validInput.quantity,
      p_reason: validInput.reason,
      p_idempotency_key: validInput.idempotencyKey,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/inventory");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/products");
    expect(result).toEqual({
      ok: true,
      transactionId: "33333333-3333-4333-8333-333333333333",
      quantityBefore: 25,
      quantityAfter: 20,
      message: "Stock adjustment applied.",
    });
  });
});
