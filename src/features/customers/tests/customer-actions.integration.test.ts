import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkCustomerDuplicateAction,
  createCustomerAction,
  getCustomerForEditAction,
  updateCustomerAction,
} from "../actions/customer-actions";

const mocks = vi.hoisted(() => ({
  checkCustomerDuplicate: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  getCustomerDetail: vi.fn(),
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

vi.mock("../queries/check-customer-duplicate", () => ({
  checkCustomerDuplicate: mocks.checkCustomerDuplicate,
}));

vi.mock("../queries/get-customer-detail", () => ({
  getCustomerDetail: mocks.getCustomerDetail,
}));

const VALID_CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";

const validCustomerInput = {
  customerType: "business" as const,
  displayName: "Acme Retail",
  companyName: "Acme Corp",
  phone: "+628123456789",
  email: "buyer@example.test",
  notes: "Preferred delivery in the morning",
  addressLine1: "Jl. Merdeka 10",
  addressLine2: "Floor 2",
  city: "Jakarta",
  province: "DKI Jakarta",
  postalCode: "10110",
  countryCode: "ID",
  addressLabel: "Headquarters",
};

describe("customer server actions", () => {
  beforeEach(() => {
    mocks.checkCustomerDuplicate.mockReset();
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.getCustomerDetail.mockReset();
    mocks.requireAuthenticatedUser.mockReset();
    mocks.revalidatePath.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "staff" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
  });

  describe("createCustomerAction", () => {
    it("denies viewer and technician roles with a safe error message", async () => {
      mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn() });
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "viewer" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });

      const result = await createCustomerAction(validCustomerInput);

      expect(result).toEqual({
        ok: false,
        message: "You do not have access to perform this action.",
      });
    });

    it("returns validation errors without calling database", async () => {
      const fromMock = vi.fn();
      mocks.createSupabaseServerClient.mockResolvedValue({ from: fromMock });

      const result = await createCustomerAction({
        ...validCustomerInput,
        displayName: "   ",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors?.displayName).toBeDefined();
      }
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("creates customer and primary address under server-resolved organization", async () => {
      const customerInsertPayload = vi.fn();
      const addressInsertPayload = vi.fn();

      mocks.createSupabaseServerClient.mockResolvedValue({
        from(table: string) {
          if (table === "customers") {
            return {
              insert(payload: unknown) {
                customerInsertPayload(payload);
                return {
                  select() {
                    return {
                      single: vi.fn().mockResolvedValue({
                        data: { id: VALID_CUSTOMER_ID },
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          }
          if (table === "customer_addresses") {
            return {
              insert(payload: unknown) {
                addressInsertPayload(payload);
                return Promise.resolve({ error: null });
              },
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      });

      const result = await createCustomerAction(validCustomerInput);

      expect(customerInsertPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: "org-1",
          created_by: "user-1",
          display_name: "Acme Retail",
          status: "active",
        }),
      );
      expect(addressInsertPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: "org-1",
          customer_id: VALID_CUSTOMER_ID,
          address_line_1: "Jl. Merdeka 10",
          is_primary: true,
        }),
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/customers");
      expect(result).toEqual({
        ok: true,
        customerId: VALID_CUSTOMER_ID,
        message: "Customer created.",
      });
    });

    it("surfaces a safe error when primary address insert fails", async () => {
      mocks.createSupabaseServerClient.mockResolvedValue({
        from(table: string) {
          if (table === "customers") {
            return {
              insert() {
                return {
                  select() {
                    return {
                      single: vi.fn().mockResolvedValue({
                        data: { id: VALID_CUSTOMER_ID },
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          }
          if (table === "customer_addresses") {
            return {
              insert: vi.fn().mockResolvedValue({
                error: { message: "constraint failed" },
              }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      });

      const result = await createCustomerAction(validCustomerInput);

      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/customers");
      expect(result).toEqual({
        ok: false,
        message:
          "Customer was created, but the primary address could not be saved. Edit the customer to try again.",
      });
    });
  });

  describe("updateCustomerAction", () => {
    it("rejects non-UUID customer identifiers before querying database", async () => {
      const fromMock = vi.fn();
      mocks.createSupabaseServerClient.mockResolvedValue({ from: fromMock });

      const result = await updateCustomerAction(
        "not-a-uuid",
        validCustomerInput,
      );

      expect(result).toEqual({
        ok: false,
        message: "Invalid customer identifier.",
      });
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("returns not-found error when update affects zero active rows in the organization", async () => {
      mocks.createSupabaseServerClient.mockResolvedValue({
        from(table: string) {
          if (table !== "customers") {
            throw new Error(`Unexpected table ${table}`);
          }
          const chain = {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
          return {
            update: vi.fn().mockReturnValue(chain),
          };
        },
      });

      const result = await updateCustomerAction(
        VALID_CUSTOMER_ID,
        validCustomerInput,
      );

      expect(result).toEqual({
        ok: false,
        message: "Customer not found or cannot be edited.",
      });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("updates active customer and scopes primary address update by organization", async () => {
      const addressUpdateEqCalls: Array<[string, string]> = [];

      mocks.createSupabaseServerClient.mockResolvedValue({
        from(table: string) {
          if (table === "customers") {
            const chain = {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: VALID_CUSTOMER_ID },
                error: null,
              }),
            };
            return {
              update: vi.fn().mockReturnValue(chain),
            };
          }
          if (table === "customer_addresses") {
            return {
              select() {
                const chain = {
                  eq: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: "addr-1" }],
                    error: null,
                  }),
                };
                return chain;
              },
              update() {
                const chain = {
                  eq(column: string, value: string) {
                    addressUpdateEqCalls.push([column, value]);
                    if (addressUpdateEqCalls.length === 2) {
                      return Promise.resolve({ error: null });
                    }
                    return chain;
                  },
                };
                return chain;
              },
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      });

      const result = await updateCustomerAction(
        VALID_CUSTOMER_ID,
        validCustomerInput,
      );

      expect(addressUpdateEqCalls).toContainEqual(["organization_id", "org-1"]);
      expect(addressUpdateEqCalls).toContainEqual(["id", "addr-1"]);
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/customers");
      expect(result).toEqual({
        ok: true,
        customerId: VALID_CUSTOMER_ID,
        message: "Customer updated.",
      });
    });

    it("surfaces a safe error if primary address update fails", async () => {
      mocks.createSupabaseServerClient.mockResolvedValue({
        from(table: string) {
          if (table === "customers") {
            const chain = {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: VALID_CUSTOMER_ID },
                error: null,
              }),
            };
            return {
              update: vi.fn().mockReturnValue(chain),
            };
          }
          if (table === "customer_addresses") {
            return {
              select() {
                return {
                  eq: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: "addr-1" }],
                    error: null,
                  }),
                };
              },
              update() {
                let count = 0;
                const chain = {
                  eq() {
                    count += 1;
                    if (count === 2) {
                      return Promise.resolve({
                        error: { message: "raw db error" },
                      });
                    }
                    return chain;
                  },
                };
                return chain;
              },
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      });

      const result = await updateCustomerAction(
        VALID_CUSTOMER_ID,
        validCustomerInput,
      );

      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/customers");
      expect(result).toEqual({
        ok: false,
        message:
          "Customer details were saved, but the primary address could not be updated.",
      });
    });
  });

  describe("getCustomerForEditAction", () => {
    it("denies viewer from loading customer edit data", async () => {
      mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "viewer" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });

      const result = await getCustomerForEditAction(VALID_CUSTOMER_ID);

      expect(result).toEqual({
        ok: false,
        message: "You do not have access to perform this action.",
      });
      expect(mocks.getCustomerDetail).not.toHaveBeenCalled();
    });

    it("loads customer detail using server-resolved organization", async () => {
      const supabaseClient = { client: true };
      mocks.createSupabaseServerClient.mockResolvedValue(supabaseClient);
      mocks.getCustomerDetail.mockResolvedValue({
        ok: true,
        data: { id: VALID_CUSTOMER_ID, displayName: "Acme Retail" },
      });

      const result = await getCustomerForEditAction(VALID_CUSTOMER_ID);

      expect(mocks.getCustomerDetail).toHaveBeenCalledWith(
        supabaseClient,
        "org-1",
        VALID_CUSTOMER_ID,
      );
      expect(result).toEqual({
        ok: true,
        data: { id: VALID_CUSTOMER_ID, displayName: "Acme Retail" },
      });
    });
  });

  describe("checkCustomerDuplicateAction", () => {
    it("denies technician from running duplicate check", async () => {
      mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "technician" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });

      const result = await checkCustomerDuplicateAction(
        "dup@example.test",
        "+628123",
      );

      expect(result).toEqual({
        hasDuplicate: false,
        duplicateEmail: false,
        duplicatePhone: false,
      });
      expect(mocks.checkCustomerDuplicate).not.toHaveBeenCalled();
    });

    it("checks duplicates using server-resolved organization", async () => {
      const supabaseClient = { client: true };
      mocks.createSupabaseServerClient.mockResolvedValue(supabaseClient);
      mocks.checkCustomerDuplicate.mockResolvedValue({
        hasDuplicate: true,
        duplicateEmail: true,
        duplicatePhone: false,
      });

      const result = await checkCustomerDuplicateAction(
        "dup@example.test",
        null,
        VALID_CUSTOMER_ID,
      );

      expect(mocks.checkCustomerDuplicate).toHaveBeenCalledWith(
        supabaseClient,
        "org-1",
        "dup@example.test",
        null,
        VALID_CUSTOMER_ID,
      );
      expect(result).toEqual({
        hasDuplicate: true,
        duplicateEmail: true,
        duplicatePhone: false,
      });
    });
  });
});
