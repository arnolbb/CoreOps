import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveProductAction,
  createProductAction,
  getProductForEditAction,
  updateProductAction,
} from "../actions/product-actions";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  getProductDetail: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  revalidatePath: vi.fn(),
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

vi.mock("../queries/get-product-detail", () => ({
  getProductDetail: mocks.getProductDetail,
}));

const VALID_PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const VALID_CATEGORY_ID = "22222222-2222-4222-8222-222222222222";

const validProductInput = {
  productType: "goods" as const,
  name: "Filter Unit",
  sku: "UNIT-100",
  categoryId: VALID_CATEGORY_ID,
  unit: "pcs",
  description: "Main unit",
  costPrice: 80,
  sellingPrice: 150,
  trackInventory: true,
  minimumStock: 5,
};

describe("product server actions", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.getProductDetail.mockReset();
    mocks.requireAuthenticatedUser.mockReset();
    mocks.revalidatePath.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "owner" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
  });

  describe("createProductAction", () => {
    it.each(["viewer", "technician"])(
      "denies %s from creating a product with a safe message",
      async (role) => {
        mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn() });
        mocks.getActiveOrganizationState.mockResolvedValue({
          status: "single",
          membership: { organizationId: "org-1", role },
          organization: { id: "org-1", name: "Acme", slug: "acme" },
        });

        const result = await createProductAction(validProductInput);

        expect(result).toEqual({
          ok: false,
          message: "You do not have access to perform this action.",
        });
      },
    );

    it("forces cost_price to 0 when staff creates a product", async () => {
      const insertPayload = vi.fn();
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "staff" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });
      mocks.createSupabaseServerClient.mockResolvedValue({
        from() {
          return {
            insert(payload: unknown) {
              insertPayload(payload);
              return {
                select() {
                  return {
                    single: vi.fn().mockResolvedValue({
                      data: { id: VALID_PRODUCT_ID },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        },
      });

      const result = await createProductAction(validProductInput);

      expect(insertPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: "org-1",
          created_by: "user-1",
          cost_price: 0,
          selling_price: 150,
        }),
      );
      expect(result).toEqual({
        ok: true,
        productId: VALID_PRODUCT_ID,
        message: "Product created.",
      });
    });

    it("maps duplicate SKU (23505) to a safe message", async () => {
      mocks.createSupabaseServerClient.mockResolvedValue({
        from() {
          return {
            insert() {
              return {
                select() {
                  return {
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { code: "23505", message: "duplicate key value" },
                    }),
                  };
                },
              };
            },
          };
        },
      });

      const result = await createProductAction(validProductInput);

      expect(result).toEqual({
        ok: false,
        message: "A product with this SKU already exists.",
      });
    });
  });

  describe("updateProductAction", () => {
    it("rejects non-UUID identifiers before touching the database", async () => {
      const fromMock = vi.fn();
      mocks.createSupabaseServerClient.mockResolvedValue({ from: fromMock });

      const result = await updateProductAction("bad-id", validProductInput);

      expect(result).toEqual({
        ok: false,
        message: "Invalid product identifier.",
      });
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("omits cost_price from update payload when role is staff", async () => {
      const updatePayload = vi.fn();
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "staff" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });
      mocks.createSupabaseServerClient.mockResolvedValue({
        from() {
          const chain = {
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: VALID_PRODUCT_ID },
              error: null,
            }),
          };
          return {
            update(payload: Record<string, unknown>) {
              updatePayload(payload);
              return chain;
            },
          };
        },
      });

      const result = await updateProductAction(
        VALID_PRODUCT_ID,
        validProductInput,
      );

      expect(result.ok).toBe(true);
      expect(updatePayload).toHaveBeenCalledTimes(1);
      expect(updatePayload.mock.calls[0]?.[0]).not.toHaveProperty("cost_price");
    });

    it("returns not-found message when update affects zero active rows", async () => {
      mocks.createSupabaseServerClient.mockResolvedValue({
        from() {
          const chain = {
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
          return {
            update: vi.fn().mockReturnValue(chain),
          };
        },
      });

      const result = await updateProductAction(
        VALID_PRODUCT_ID,
        validProductInput,
      );

      expect(result).toEqual({
        ok: false,
        message: "Product not found or cannot be edited.",
      });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("archiveProductAction", () => {
    it("denies staff from archiving a product", async () => {
      const rpcMock = vi.fn();
      mocks.createSupabaseServerClient.mockResolvedValue({ rpc: rpcMock });
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "staff" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });

      const result = await archiveProductAction(VALID_PRODUCT_ID);

      expect(result).toEqual({
        ok: false,
        message: "You do not have access to perform this action.",
      });
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("calls archive_product RPC for owner and masks unexpected DB errors", async () => {
      const rpcMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "internal relation error", code: "42P01" },
      });
      mocks.createSupabaseServerClient.mockResolvedValue({ rpc: rpcMock });

      const failedResult = await archiveProductAction(VALID_PRODUCT_ID);
      expect(failedResult).toEqual({
        ok: false,
        message: "Unable to archive product. Try again.",
      });

      rpcMock.mockResolvedValue({
        data: [{ product_id: VALID_PRODUCT_ID }],
        error: null,
      });

      const successResult = await archiveProductAction(VALID_PRODUCT_ID);
      expect(rpcMock).toHaveBeenCalledWith("archive_product", {
        target_product_id: VALID_PRODUCT_ID,
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/products");
      expect(successResult).toEqual({
        ok: true,
        productId: VALID_PRODUCT_ID,
        message: "Product archived.",
      });
    });
  });

  describe("getProductForEditAction", () => {
    it("passes canViewCost=false for staff when loading product detail", async () => {
      const supabaseClient = { client: true };
      mocks.createSupabaseServerClient.mockResolvedValue(supabaseClient);
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "staff" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });
      mocks.getProductDetail.mockResolvedValue({
        ok: true,
        data: { id: VALID_PRODUCT_ID, costPrice: null },
      });

      const result = await getProductForEditAction(VALID_PRODUCT_ID);

      expect(mocks.getProductDetail).toHaveBeenCalledWith(
        supabaseClient,
        "org-1",
        VALID_PRODUCT_ID,
        { canViewCost: false },
      );
      expect(result.ok).toBe(true);
    });
  });
});
