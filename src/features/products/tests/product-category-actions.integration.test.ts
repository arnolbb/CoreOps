import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProductCategoryAction,
  deleteProductCategoryAction,
} from "../actions/product-category-actions";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
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

const VALID_CATEGORY_ID = "11111111-1111-4111-8111-111111111111";

describe("product category server actions", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.requireAuthenticatedUser.mockReset();
    mocks.revalidatePath.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "staff" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
  });

  it("denies viewer from creating or deleting categories", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn() });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "viewer" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });

    expect(await createProductCategoryAction({ name: "Filters" })).toEqual({
      ok: false,
      message: "You do not have access to perform this action.",
    });
    expect(await deleteProductCategoryAction(VALID_CATEGORY_ID)).toEqual({
      ok: false,
      message: "You do not have access to perform this action.",
    });
  });

  it("maps duplicate category name (23505) safely", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue({
      from() {
        return {
          insert() {
            return {
              select() {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "23505", message: "duplicate key" },
                  }),
                };
              },
            };
          },
        };
      },
    });

    const result = await createProductCategoryAction({ name: "Filters" });

    expect(result).toEqual({
      ok: false,
      message: "A category with this name already exists.",
    });
  });

  it("maps foreign-key in-use error (23503) when deleting category used by products", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue({
      from() {
        const chain = {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "23503", message: "fk violation" },
          }),
        };
        return {
          delete: vi.fn().mockReturnValue(chain),
        };
      },
    });

    const result = await deleteProductCategoryAction(VALID_CATEGORY_ID);

    expect(result).toEqual({
      ok: false,
      message:
        "This category is used by one or more products and cannot be deleted.",
    });
  });

  it("rejects invalid category UUID before querying DB", async () => {
    const fromMock = vi.fn();
    mocks.createSupabaseServerClient.mockResolvedValue({ from: fromMock });

    const result = await deleteProductCategoryAction("invalid-uuid");

    expect(result).toEqual({
      ok: false,
      message: "Invalid category identifier.",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });
});
