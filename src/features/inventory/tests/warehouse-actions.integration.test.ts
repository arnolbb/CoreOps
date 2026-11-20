import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWarehouseAction,
  setWarehouseActiveAction,
  updateWarehouseAction,
} from "../actions/warehouse-actions";

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

const VALID_WAREHOUSE_ID = "11111111-1111-4111-8111-111111111111";

const validWarehouseInput = {
  name: "Main Warehouse",
  code: "wh-01",
  address: "Jl. Industri 5",
};

describe("warehouse server actions", () => {
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

  describe("createWarehouseAction", () => {
    it.each(["viewer", "technician"])(
      "denies %s from creating a warehouse with a safe message",
      async (role) => {
        const fromMock = vi.fn();
        mocks.createSupabaseServerClient.mockResolvedValue({ from: fromMock });
        mocks.getActiveOrganizationState.mockResolvedValue({
          status: "single",
          membership: { organizationId: "org-1", role },
          organization: { id: "org-1", name: "Acme", slug: "acme" },
        });

        const result = await createWarehouseAction(validWarehouseInput);

        expect(result).toEqual({
          ok: false,
          message: "You do not have access to perform this action.",
        });
        expect(fromMock).not.toHaveBeenCalled();
      },
    );

    it("returns field errors on invalid input without touching DB", async () => {
      const fromMock = vi.fn();
      mocks.createSupabaseServerClient.mockResolvedValue({ from: fromMock });

      const result = await createWarehouseAction({
        name: "  ",
        code: "WH-01",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors?.name).toBeDefined();
      }
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("creates warehouse under server-resolved organization and normalizes code", async () => {
      const insertPayload = vi.fn();
      mocks.createSupabaseServerClient.mockResolvedValue({
        from() {
          return {
            insert(payload: unknown) {
              insertPayload(payload);
              return {
                select() {
                  return {
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: VALID_WAREHOUSE_ID,
                        name: "Main Warehouse",
                        code: "WH-01",
                        address: "Jl. Industri 5",
                        is_active: true,
                        created_at: "2026-08-03T00:00:00.000Z",
                        updated_at: "2026-08-03T00:00:00.000Z",
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        },
      });

      const result = await createWarehouseAction(validWarehouseInput);

      expect(insertPayload).toHaveBeenCalledWith({
        organization_id: "org-1",
        name: "Main Warehouse",
        code: "WH-01",
        address: "Jl. Industri 5",
        is_active: true,
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/inventory");
      expect(result).toEqual({
        ok: true,
        warehouse: {
          id: VALID_WAREHOUSE_ID,
          name: "Main Warehouse",
          code: "WH-01",
          address: "Jl. Industri 5",
          isActive: true,
          createdAt: "2026-08-03T00:00:00.000Z",
          updatedAt: "2026-08-03T00:00:00.000Z",
        },
        message: "Warehouse created.",
      });
    });

    it("maps duplicate warehouse code (23505) safely", async () => {
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

      const result = await createWarehouseAction(validWarehouseInput);

      expect(result).toEqual({
        ok: false,
        message: "A warehouse with this code already exists.",
      });
    });
  });

  describe("updateWarehouseAction", () => {
    it("rejects non-UUID warehouse IDs before querying DB", async () => {
      const fromMock = vi.fn();
      mocks.createSupabaseServerClient.mockResolvedValue({ from: fromMock });

      const result = await updateWarehouseAction("bad-id", validWarehouseInput);

      expect(result).toEqual({
        ok: false,
        message: "Invalid warehouse identifier.",
      });
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("returns not-found when zero rows are updated in the active organization", async () => {
      mocks.createSupabaseServerClient.mockResolvedValue({
        from() {
          const chain = {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
          return { update: vi.fn().mockReturnValue(chain) };
        },
      });

      const result = await updateWarehouseAction(
        VALID_WAREHOUSE_ID,
        validWarehouseInput,
      );

      expect(result).toEqual({
        ok: false,
        message: "Warehouse not found.",
      });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("updates warehouse scoped by organization_id and id", async () => {
      const eqCalls: Array<[string, string]> = [];
      mocks.createSupabaseServerClient.mockResolvedValue({
        from() {
          const chain = {
            eq(col: string, val: string) {
              eqCalls.push([col, val]);
              return chain;
            },
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: VALID_WAREHOUSE_ID,
                name: "Main Warehouse",
                code: "WH-01",
                address: "Jl. Industri 5",
                is_active: true,
                created_at: "2026-08-03T00:00:00.000Z",
                updated_at: "2026-08-03T00:05:00.000Z",
              },
              error: null,
            }),
          };
          return { update: vi.fn().mockReturnValue(chain) };
        },
      });

      const result = await updateWarehouseAction(
        VALID_WAREHOUSE_ID,
        validWarehouseInput,
      );

      expect(eqCalls).toContainEqual(["organization_id", "org-1"]);
      expect(eqCalls).toContainEqual(["id", VALID_WAREHOUSE_ID]);
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/inventory");
      expect(result.ok).toBe(true);
    });
  });

  describe("setWarehouseActiveAction", () => {
    it("denies viewer and validates UUID", async () => {
      const fromMock = vi.fn();
      mocks.createSupabaseServerClient.mockResolvedValue({ from: fromMock });

      expect(await setWarehouseActiveAction("bad-id", false)).toEqual({
        ok: false,
        message: "Invalid warehouse identifier.",
      });

      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "viewer" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });

      expect(await setWarehouseActiveAction(VALID_WAREHOUSE_ID, false)).toEqual(
        {
          ok: false,
          message: "You do not have access to perform this action.",
        },
      );
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("toggles warehouse status scoped by organization_id and revalidates", async () => {
      const eqCalls: Array<[string, string]> = [];
      const updatePayload = vi.fn();
      mocks.createSupabaseServerClient.mockResolvedValue({
        from() {
          const chain = {
            eq(col: string, val: string) {
              eqCalls.push([col, val]);
              return chain;
            },
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: VALID_WAREHOUSE_ID,
                name: "Main Warehouse",
                code: "WH-01",
                address: null,
                is_active: false,
                created_at: "2026-08-03T00:00:00.000Z",
                updated_at: "2026-08-03T00:10:00.000Z",
              },
              error: null,
            }),
          };
          return {
            update(payload: unknown) {
              updatePayload(payload);
              return chain;
            },
          };
        },
      });

      const result = await setWarehouseActiveAction(VALID_WAREHOUSE_ID, false);

      expect(updatePayload).toHaveBeenCalledWith({ is_active: false });
      expect(eqCalls).toContainEqual(["organization_id", "org-1"]);
      expect(eqCalls).toContainEqual(["id", VALID_WAREHOUSE_ID]);
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/inventory");
      expect(result).toEqual({
        ok: true,
        warehouse: {
          id: VALID_WAREHOUSE_ID,
          name: "Main Warehouse",
          code: "WH-01",
          address: null,
          isActive: false,
          createdAt: "2026-08-03T00:00:00.000Z",
          updatedAt: "2026-08-03T00:10:00.000Z",
        },
        message: "Warehouse deactivated.",
      });
    });
  });
});
