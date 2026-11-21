import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelSalesOrderAction,
  completeSalesOrderAction,
  confirmSalesOrderAction,
  createSalesOrderDraftAction,
  getSalesOrderForEditAction,
  recordSalesPaymentAction,
  updateSalesOrderDraftAction,
  voidSalesPaymentAction,
} from "../actions/sales-actions";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  getSalesOrderDetail: vi.fn(),
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

vi.mock("../queries/get-sales-order-detail", () => ({
  getSalesOrderDetail: mocks.getSalesOrderDetail,
}));

const VALID_CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const VALID_WAREHOUSE_ID = "22222222-2222-4222-8222-222222222222";
const VALID_PRODUCT_ID = "33333333-3333-4333-8333-333333333333";
const VALID_ORDER_ID = "44444444-4444-4444-8444-444444444444";
const VALID_PAYMENT_ID = "55555555-5555-4555-8555-555555555555";

const validDraftInput = {
  customerId: VALID_CUSTOMER_ID,
  warehouseId: VALID_WAREHOUSE_ID,
  orderNumber: null,
  notes: "Standard delivery",
  items: [
    {
      productId: VALID_PRODUCT_ID,
      quantity: 2,
      unitPrice: 50,
      discountAmount: 5,
      taxAmount: 9.5,
    },
    {
      productId: null,
      name: "Assembly Fee",
      sku: "SVC-ASM",
      unit: "job",
      quantity: 1,
      unitPrice: 25,
      discountAmount: 0,
      taxAmount: 0,
    },
  ],
};

describe("sales server actions", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.getSalesOrderDetail.mockReset();
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

  describe("organization and role checks", () => {
    it("denies mutation when organization state is not single", async () => {
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "multiple",
        memberships: [
          { organizationId: "org-1", role: "owner" },
          { organizationId: "org-2", role: "owner" },
        ],
      });

      const result = await createSalesOrderDraftAction(validDraftInput);

      expect(result).toEqual({
        ok: false,
        message: "Active organization required.",
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it.each(["viewer", "technician", "manager"])(
      "denies manage sales actions for %s role with safe message",
      async (role) => {
        mocks.getActiveOrganizationState.mockResolvedValue({
          status: "single",
          membership: { organizationId: "org-1", role },
          organization: { id: "org-1", name: "Acme", slug: "acme" },
        });

        const draftRes = await createSalesOrderDraftAction(validDraftInput);
        const updateRes = await updateSalesOrderDraftAction(
          VALID_ORDER_ID,
          validDraftInput,
        );
        const confirmRes = await confirmSalesOrderAction({
          salesOrderId: VALID_ORDER_ID,
          warehouseId: VALID_WAREHOUSE_ID,
        });
        const payRes = await recordSalesPaymentAction({
          salesOrderId: VALID_ORDER_ID,
          amount: 50,
          paymentMethod: "cash",
        });
        const completeRes = await completeSalesOrderAction(VALID_ORDER_ID);

        for (const res of [
          draftRes,
          updateRes,
          confirmRes,
          payRes,
          completeRes,
        ]) {
          expect(res).toEqual({
            ok: false,
            message: "You do not have access to perform this action.",
          });
        }
        expect(mocks.rpc).not.toHaveBeenCalled();
      },
    );

    it.each(["staff", "viewer", "technician"])(
      "denies admin sales actions (void payment, cancel order) for %s role",
      async (role) => {
        mocks.getActiveOrganizationState.mockResolvedValue({
          status: "single",
          membership: { organizationId: "org-1", role },
          organization: { id: "org-1", name: "Acme", slug: "acme" },
        });

        const voidRes = await voidSalesPaymentAction({
          paymentId: VALID_PAYMENT_ID,
          voidReason: "Bounced payment",
        });
        const cancelRes = await cancelSalesOrderAction({
          salesOrderId: VALID_ORDER_ID,
          reason: "Customer cancelled",
        });

        expect(voidRes).toEqual({
          ok: false,
          message: "You do not have access to perform this action.",
        });
        expect(cancelRes).toEqual({
          ok: false,
          message: "You do not have access to perform this action.",
        });
        expect(mocks.rpc).not.toHaveBeenCalled();
      },
    );
  });

  describe("createSalesOrderDraftAction & updateSalesOrderDraftAction", () => {
    it("returns field errors for invalid draft payload before calling RPC", async () => {
      const result = await createSalesOrderDraftAction({
        customerId: "bad-uuid",
        items: [],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors?.customerId).toBeDefined();
        expect(result.fieldErrors?.items).toBeDefined();
      }
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it("calls create_sales_order_draft RPC with serialized catalog and custom items", async () => {
      mocks.rpc.mockResolvedValue({
        data: [
          {
            sales_order_id: VALID_ORDER_ID,
            order_number: "SO-2026-0001",
            status: "draft",
          },
        ],
        error: null,
      });

      const result = await createSalesOrderDraftAction(validDraftInput);

      expect(mocks.rpc).toHaveBeenCalledWith("create_sales_order_draft", {
        p_customer_id: VALID_CUSTOMER_ID,
        p_items: [
          {
            product_id: VALID_PRODUCT_ID,
            quantity: 2,
            unit_price: 50,
            discount_amount: 5,
            tax_amount: 9.5,
          },
          {
            item_type: "custom",
            name_snapshot: "Assembly Fee",
            sku_snapshot: "SVC-ASM",
            unit_snapshot: "job",
            quantity: 1,
            unit_price: 25,
            discount_amount: 0,
            tax_amount: 0,
          },
        ],
        p_order_number: undefined,
        p_warehouse_id: VALID_WAREHOUSE_ID,
        p_notes: "Standard delivery",
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/sales");
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        `/dashboard/sales/${VALID_ORDER_ID}`,
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(result).toEqual({
        ok: true,
        salesOrderId: VALID_ORDER_ID,
        orderNumber: "SO-2026-0001",
        status: "draft",
        message: "Sales order draft created.",
      });
    });

    it("maps duplicate order number (23505) and non-draft edit errors safely", async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      });

      const dupResult = await createSalesOrderDraftAction(validDraftInput);
      expect(dupResult).toEqual({
        ok: false,
        message: "An order with this order number already exists.",
      });

      mocks.rpc.mockResolvedValue({
        data: null,
        error: {
          code: "P0001",
          message: "only draft sales orders can be edited",
        },
      });

      const nonDraftResult = await updateSalesOrderDraftAction(
        VALID_ORDER_ID,
        validDraftInput,
      );
      expect(nonDraftResult).toEqual({
        ok: false,
        message: "Only draft sales orders can be edited.",
      });
    });

    it("rejects non-UUID salesOrderId in updateSalesOrderDraftAction", async () => {
      const result = await updateSalesOrderDraftAction(
        "not-a-uuid",
        validDraftInput,
      );
      expect(result).toEqual({
        ok: false,
        message: "Invalid sales order identifier.",
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
  });

  describe("confirmSalesOrderAction", () => {
    it("maps insufficient stock and missing warehouse errors safely", async () => {
      mocks.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: "P0001",
          message:
            "warehouse_id is required to confirm a sales order with tracked goods",
        },
      });
      const whResult = await confirmSalesOrderAction({
        salesOrderId: VALID_ORDER_ID,
        warehouseId: null,
      });
      expect(whResult).toEqual({
        ok: false,
        message:
          "Select an active warehouse to confirm a sales order containing inventory-tracked goods.",
      });

      mocks.rpc.mockResolvedValueOnce({
        data: null,
        error: { code: "22003", message: "insufficient stock balance" },
      });
      const stockResult = await confirmSalesOrderAction({
        salesOrderId: VALID_ORDER_ID,
        warehouseId: VALID_WAREHOUSE_ID,
      });
      expect(stockResult).toEqual({
        ok: false,
        message: "Insufficient stock balance to confirm this sales order.",
      });
    });

    it("revalidates sales, inventory, and dashboard paths on confirmation", async () => {
      mocks.rpc.mockResolvedValue({
        data: [{ sales_order_id: VALID_ORDER_ID, status: "confirmed" }],
        error: null,
      });

      const result = await confirmSalesOrderAction({
        salesOrderId: VALID_ORDER_ID,
        warehouseId: VALID_WAREHOUSE_ID,
      });

      expect(mocks.rpc).toHaveBeenCalledWith("confirm_sales_order", {
        p_sales_order_id: VALID_ORDER_ID,
        p_warehouse_id: VALID_WAREHOUSE_ID,
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/sales");
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        `/dashboard/sales/${VALID_ORDER_ID}`,
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/inventory");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(result).toEqual({
        ok: true,
        salesOrderId: VALID_ORDER_ID,
        status: "confirmed",
        message: "Sales order confirmed.",
      });
    });
  });

  describe("recordSalesPaymentAction & voidSalesPaymentAction", () => {
    it("maps payment exceeds outstanding order balance safely", async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: {
          code: "22003",
          message: "payment exceeds outstanding order balance",
        },
      });

      const result = await recordSalesPaymentAction({
        salesOrderId: VALID_ORDER_ID,
        amount: 999,
        paymentMethod: "cash",
      });

      expect(result).toEqual({
        ok: false,
        message: "Payment amount exceeds the remaining balance.",
      });
    });

    it("records payment cleanly and masks unexpected raw DB errors", async () => {
      mocks.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: "42702",
          message: 'column reference "sales_order_id" in public.payments',
        },
      });
      const masked = await recordSalesPaymentAction({
        salesOrderId: VALID_ORDER_ID,
        amount: 50,
        paymentMethod: "cash",
      });
      expect(masked).toEqual({
        ok: false,
        message: "Unable to record payment. Try again.",
      });

      mocks.rpc.mockResolvedValueOnce({
        data: [
          {
            payment_id: VALID_PAYMENT_ID,
            sales_order_id: VALID_ORDER_ID,
            paid_total: "50.00",
            payment_status: "partially_paid",
          },
        ],
        error: null,
      });
      const success = await recordSalesPaymentAction({
        salesOrderId: VALID_ORDER_ID,
        amount: 50,
        paymentMethod: "bank_transfer",
        reference: "TRF-100",
      });

      expect(mocks.rpc).toHaveBeenLastCalledWith("record_sales_payment", {
        p_sales_order_id: VALID_ORDER_ID,
        p_amount: 50,
        p_payment_method: "bank_transfer",
        p_paid_at: undefined,
        p_reference: "TRF-100",
        p_notes: undefined,
      });
      expect(success).toEqual({
        ok: true,
        paymentId: VALID_PAYMENT_ID,
        salesOrderId: VALID_ORDER_ID,
        paidTotal: 50,
        paymentStatus: "partially_paid",
        message: "Payment recorded.",
      });
    });

    it("voids payment for admin/owner and validates blank void reason", async () => {
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "admin" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });

      const invalid = await voidSalesPaymentAction({
        paymentId: VALID_PAYMENT_ID,
        voidReason: "   ",
      });
      expect(invalid.ok).toBe(false);
      expect(mocks.rpc).not.toHaveBeenCalled();

      mocks.rpc.mockResolvedValue({
        data: [
          {
            payment_id: VALID_PAYMENT_ID,
            sales_order_id: VALID_ORDER_ID,
            paid_total: "0.00",
            payment_status: "unpaid",
          },
        ],
        error: null,
      });

      const valid = await voidSalesPaymentAction({
        paymentId: VALID_PAYMENT_ID,
        voidReason: "Duplicate entry",
      });

      expect(mocks.rpc).toHaveBeenCalledWith("void_sales_payment", {
        p_payment_id: VALID_PAYMENT_ID,
        p_void_reason: "Duplicate entry",
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        `/dashboard/sales/${VALID_ORDER_ID}`,
      );
      expect(valid).toEqual({
        ok: true,
        paymentId: VALID_PAYMENT_ID,
        salesOrderId: VALID_ORDER_ID,
        paidTotal: 0,
        paymentStatus: "unpaid",
        message: "Payment voided.",
      });
    });
  });

  describe("completeSalesOrderAction & cancelSalesOrderAction", () => {
    it("completes confirmed sales order", async () => {
      mocks.rpc.mockResolvedValue({
        data: [{ sales_order_id: VALID_ORDER_ID, status: "completed" }],
        error: null,
      });

      const result = await completeSalesOrderAction(VALID_ORDER_ID);

      expect(mocks.rpc).toHaveBeenCalledWith("complete_sales_order", {
        p_sales_order_id: VALID_ORDER_ID,
      });
      expect(result).toEqual({
        ok: true,
        salesOrderId: VALID_ORDER_ID,
        status: "completed",
        message: "Sales order completed.",
      });
    });

    it("blocks cancel with active completed payments safely and succeeds when cleared", async () => {
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: "org-1", role: "owner" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
      });

      mocks.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: "P0001",
          message: "cannot cancel sales order with active completed payments",
        },
      });
      const blocked = await cancelSalesOrderAction({
        salesOrderId: VALID_ORDER_ID,
        reason: "Customer changed mind",
      });
      expect(blocked).toEqual({
        ok: false,
        message:
          "Void all active completed payments before cancelling this sales order.",
      });

      mocks.rpc.mockResolvedValueOnce({
        data: [{ sales_order_id: VALID_ORDER_ID, status: "cancelled" }],
        error: null,
      });
      const cancelled = await cancelSalesOrderAction({
        salesOrderId: VALID_ORDER_ID,
        reason: "Customer changed mind",
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/inventory");
      expect(cancelled).toEqual({
        ok: true,
        salesOrderId: VALID_ORDER_ID,
        status: "cancelled",
        message: "Sales order cancelled.",
      });
    });
  });

  describe("getSalesOrderForEditAction", () => {
    it("rejects non-draft orders when fetching for edit", async () => {
      mocks.getSalesOrderDetail.mockResolvedValue({
        ok: true,
        data: { id: VALID_ORDER_ID, status: "confirmed" },
      });

      const result = await getSalesOrderForEditAction(VALID_ORDER_ID);
      expect(result).toEqual({
        ok: false,
        message: "Only draft sales orders can be edited.",
      });
    });
  });
});
