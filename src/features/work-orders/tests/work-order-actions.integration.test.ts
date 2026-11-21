import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkOrderAction,
  recordWorkOrderItemUsageAction,
  reopenWorkOrderAction,
  transitionWorkOrderStatusAction,
  updateWorkOrderAction,
  uploadWorkOrderAttachmentAction,
} from "../actions/work-order-actions";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  workOrderLookup: vi.fn(),
  storageUpload: vi.fn(),
  storageRemove: vi.fn(),
  attachmentInsert: vi.fn(),
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

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";
const ADDRESS_ID = "33333333-3333-4333-8333-333333333333";
const WORK_ORDER_ID = "44444444-4444-4444-8444-444444444444";
const WAREHOUSE_ID = "55555555-5555-4555-8555-555555555555";
const PRODUCT_ID = "66666666-6666-4666-8666-666666666666";
const USER_ID = "77777777-7777-4777-8777-777777777777";
const OTHER_USER_ID = "88888888-8888-4888-8888-888888888888";

function createMockClient() {
  return {
    rpc: mocks.rpc,
    from(table: string) {
      if (table === "work_orders") {
        const filters: Array<[string, unknown]> = [];
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            filters.push([col, val]);
            return builder;
          },
          maybeSingle: () => mocks.workOrderLookup(filters),
        };
        return builder;
      }

      if (table === "work_order_attachments") {
        return {
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: () => mocks.attachmentInsert(payload),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, file: File, options: Record<string, unknown>) =>
          mocks.storageUpload(bucket, path, file, options),
        remove: (paths: string[]) => mocks.storageRemove(bucket, paths),
      }),
    },
  };
}

describe("work-order-actions", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.requireAuthenticatedUser.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.rpc.mockReset();
    mocks.workOrderLookup.mockReset();
    mocks.storageUpload.mockReset();
    mocks.storageRemove.mockReset();
    mocks.attachmentInsert.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "staff@example.test",
    });
    mocks.createSupabaseServerClient.mockResolvedValue(createMockClient());
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: ORG_ID, role: "staff" },
      organization: { id: ORG_ID, name: "Acme Ops", slug: "acme-ops" },
    });
  });

  describe("createWorkOrderAction", () => {
    const validCreate = {
      customerId: CUSTOMER_ID,
      customerAddressId: ADDRESS_ID,
      workType: "service" as const,
      priority: "high" as const,
      initialStatus: "draft" as const,
      assignedTo: USER_ID,
      description: "Inspect equipment and calibrate settings",
    };

    it("denies creation when active organization is not single", async () => {
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "multiple",
        memberships: [],
      });

      const result = await createWorkOrderAction(validCreate);
      expect(result).toEqual({
        ok: false,
        message: "Active organization required.",
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it.each(["viewer", "technician", "unknown"])(
      "denies creation for %s role with safe message",
      async (role) => {
        mocks.getActiveOrganizationState.mockResolvedValue({
          status: "single",
          membership: { organizationId: ORG_ID, role },
          organization: { id: ORG_ID, name: "Acme Ops", slug: "acme-ops" },
        });

        const result = await createWorkOrderAction(validCreate);
        expect(result).toEqual({
          ok: false,
          message: "You do not have access to perform this action.",
        });
        expect(mocks.rpc).not.toHaveBeenCalled();
      },
    );

    it("calls create_work_order RPC with scheduled status when scheduledStart is provided", async () => {
      mocks.rpc.mockResolvedValue({
        data: [
          {
            work_order_id: WORK_ORDER_ID,
            work_order_number: "WO-2026-0001",
          },
        ],
        error: null,
      });

      const result = await createWorkOrderAction({
        ...validCreate,
        scheduledStart: "2026-11-22T09:00:00.000Z",
        scheduledEnd: "2026-11-22T11:00:00.000Z",
      });

      expect(mocks.rpc).toHaveBeenCalledWith("create_work_order", {
        p_organization_id: ORG_ID,
        p_customer_id: CUSTOMER_ID,
        p_work_type: "service",
        p_description: "Inspect equipment and calibrate settings",
        p_priority: "high",
        p_status: "scheduled",
        p_customer_address_id: ADDRESS_ID,
        p_assigned_to: USER_ID,
        p_scheduled_start: "2026-11-22T09:00:00.000Z",
        p_scheduled_end: "2026-11-22T11:00:00.000Z",
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        "/dashboard/work-orders",
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        `/dashboard/work-orders/${WORK_ORDER_ID}`,
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/inventory");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(result).toEqual({
        ok: true,
        workOrderId: WORK_ORDER_ID,
        workOrderNumber: "WO-2026-0001",
        message: "Work order created.",
      });
    });

    it("masks raw database error messages", async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { message: 'relation "public.work_orders" deadlock detected' },
      });

      const result = await createWorkOrderAction(validCreate);
      expect(result).toEqual({
        ok: false,
        message: "Unable to create work order. Try again.",
      });
    });
  });

  describe("updateWorkOrderAction", () => {
    it("calls update_work_order RPC and maps locked error safely", async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: {
          message: "cannot update completed or cancelled work order",
        },
      });

      const result = await updateWorkOrderAction(WORK_ORDER_ID, {
        customerId: CUSTOMER_ID,
        workType: "repair",
        priority: "urgent",
        description: "Updated scope",
      });

      expect(mocks.rpc).toHaveBeenCalledWith("update_work_order", {
        p_work_order_id: WORK_ORDER_ID,
        p_customer_id: CUSTOMER_ID,
        p_work_type: "repair",
        p_priority: "urgent",
        p_description: "Updated scope",
        p_customer_address_id: undefined,
        p_assigned_to: undefined,
        p_scheduled_start: undefined,
        p_scheduled_end: undefined,
      });
      expect(result).toEqual({
        ok: false,
        message: "Completed or cancelled work orders cannot be edited.",
      });
    });
  });

  describe("transitionWorkOrderStatusAction", () => {
    it("allows assigned technician to start and complete work order", async () => {
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: ORG_ID, role: "technician" },
        organization: { id: ORG_ID, name: "Acme Ops", slug: "acme-ops" },
      });
      mocks.workOrderLookup.mockResolvedValue({
        data: { id: WORK_ORDER_ID, assigned_to: USER_ID },
        error: null,
      });
      mocks.rpc.mockResolvedValue({
        data: [
          {
            work_order_id: WORK_ORDER_ID,
            work_order_number: "WO-2026-0001",
            status: "completed",
          },
        ],
        error: null,
      });

      const result = await transitionWorkOrderStatusAction({
        workOrderId: WORK_ORDER_ID,
        targetStatus: "completed",
        completionNotes: "Completed all checks",
      });

      expect(mocks.workOrderLookup).toHaveBeenCalledWith([
        ["organization_id", ORG_ID],
        ["id", WORK_ORDER_ID],
      ]);
      expect(mocks.rpc).toHaveBeenCalledWith("transition_work_order_status", {
        p_work_order_id: WORK_ORDER_ID,
        p_target_status: "completed",
        p_completion_notes: "Completed all checks",
        p_cancellation_reason: undefined,
      });
      expect(result).toEqual({
        ok: true,
        workOrderId: WORK_ORDER_ID,
        workOrderNumber: "WO-2026-0001",
        message: "Work order completed.",
      });
    });

    it("denies technician cancelling or operating unassigned work order", async () => {
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: ORG_ID, role: "technician" },
        organization: { id: ORG_ID, name: "Acme Ops", slug: "acme-ops" },
      });

      const cancelResult = await transitionWorkOrderStatusAction({
        workOrderId: WORK_ORDER_ID,
        targetStatus: "cancelled",
        cancellationReason: "Customer postponed",
      });
      expect(cancelResult).toEqual({
        ok: false,
        message: "You do not have access to perform this action.",
      });
      expect(mocks.rpc).not.toHaveBeenCalled();

      mocks.workOrderLookup.mockResolvedValue({
        data: { id: WORK_ORDER_ID, assigned_to: OTHER_USER_ID },
        error: null,
      });

      const startOtherResult = await transitionWorkOrderStatusAction({
        workOrderId: WORK_ORDER_ID,
        targetStatus: "in_progress",
      });
      expect(startOtherResult).toEqual({
        ok: false,
        message: "You do not have access to perform this action.",
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
  });

  describe("reopenWorkOrderAction", () => {
    it.each(["staff", "viewer", "technician"])(
      "denies reopening for %s without calling RPC",
      async (role) => {
        mocks.getActiveOrganizationState.mockResolvedValue({
          status: "single",
          membership: { organizationId: ORG_ID, role },
          organization: { id: ORG_ID, name: "Acme Ops", slug: "acme-ops" },
        });

        const result = await reopenWorkOrderAction({
          workOrderId: WORK_ORDER_ID,
          reason: "Re-test required",
        });

        expect(result).toEqual({
          ok: false,
          message: "You do not have access to perform this action.",
        });
        expect(mocks.rpc).not.toHaveBeenCalled();
      },
    );

    it("allows owner/admin to reopen completed work order", async () => {
      mocks.getActiveOrganizationState.mockResolvedValue({
        status: "single",
        membership: { organizationId: ORG_ID, role: "admin" },
        organization: { id: ORG_ID, name: "Acme Ops", slug: "acme-ops" },
      });
      mocks.rpc.mockResolvedValue({
        data: [
          {
            work_order_id: WORK_ORDER_ID,
            work_order_number: "WO-2026-0001",
            status: "in_progress",
          },
        ],
        error: null,
      });

      const result = await reopenWorkOrderAction({
        workOrderId: WORK_ORDER_ID,
        reason: "Follow-up adjustment",
      });

      expect(mocks.rpc).toHaveBeenCalledWith("reopen_work_order", {
        p_work_order_id: WORK_ORDER_ID,
        p_reason: "Follow-up adjustment",
      });
      expect(result).toEqual({
        ok: true,
        workOrderId: WORK_ORDER_ID,
        workOrderNumber: "WO-2026-0001",
        message: "Work order reopened.",
      });
    });
  });

  describe("recordWorkOrderItemUsageAction", () => {
    it("maps insufficient stock balance error safely", async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { message: "insufficient stock balance", code: "22003" },
      });

      const result = await recordWorkOrderItemUsageAction({
        workOrderId: WORK_ORDER_ID,
        warehouseId: WAREHOUSE_ID,
        productId: PRODUCT_ID,
        quantity: 5,
        idempotencyKey: "usage-1",
      });

      expect(mocks.rpc).toHaveBeenCalledWith("record_work_order_item_usage", {
        p_work_order_id: WORK_ORDER_ID,
        p_warehouse_id: WAREHOUSE_ID,
        p_product_id: PRODUCT_ID,
        p_quantity: 5,
        p_idempotency_key: "usage-1",
      });
      expect(result).toEqual({
        ok: false,
        message: "Insufficient stock balance in the selected warehouse.",
      });
    });

    it("returns updated balance when item usage succeeds", async () => {
      mocks.rpc.mockResolvedValue({
        data: [
          {
            work_order_item_id: "99999999-9999-4999-8999-999999999999",
            quantity_before: "20.000",
            quantity_after: "17.000",
          },
        ],
        error: null,
      });

      const result = await recordWorkOrderItemUsageAction({
        workOrderId: WORK_ORDER_ID,
        warehouseId: WAREHOUSE_ID,
        productId: PRODUCT_ID,
        quantity: 3,
      });

      expect(result).toEqual({
        ok: true,
        itemId: "99999999-9999-4999-8999-999999999999",
        quantityBefore: 20,
        quantityAfter: 17,
        message: "Item usage recorded.",
      });
    });
  });

  describe("uploadWorkOrderAttachmentAction", () => {
    function buildUploadFormData(file: File, attachmentType = "photo") {
      const formData = new FormData();
      formData.set("workOrderId", WORK_ORDER_ID);
      formData.set("attachmentType", attachmentType);
      formData.set("file", file);
      return formData;
    }

    it("rejects disallowed MIME types before touching storage", async () => {
      const file = new File(["<script>alert(1)</script>"], "evil.html", {
        type: "text/html",
      });

      const result = await uploadWorkOrderAttachmentAction(
        buildUploadFormData(file),
      );

      expect(result.ok).toBe(false);
      expect(mocks.storageUpload).not.toHaveBeenCalled();
    });

    it("rejects uploads on completed work orders", async () => {
      mocks.workOrderLookup.mockResolvedValue({
        data: {
          id: WORK_ORDER_ID,
          organization_id: ORG_ID,
          status: "completed",
          assigned_to: USER_ID,
        },
        error: null,
      });

      const file = new File(["png-bytes"], "photo.png", { type: "image/png" });
      const result = await uploadWorkOrderAttachmentAction(
        buildUploadFormData(file),
      );

      expect(result).toEqual({
        ok: false,
        message:
          "Attachments cannot be uploaded to completed or cancelled work orders.",
      });
      expect(mocks.storageUpload).not.toHaveBeenCalled();
    });

    it("uploads to private bucket and removes storage object if DB insert fails", async () => {
      mocks.workOrderLookup.mockResolvedValue({
        data: {
          id: WORK_ORDER_ID,
          organization_id: ORG_ID,
          status: "in_progress",
          assigned_to: USER_ID,
        },
        error: null,
      });
      mocks.storageUpload.mockResolvedValue({ error: null });
      mocks.attachmentInsert.mockResolvedValue({
        data: null,
        error: { message: "db constraint violation" },
      });
      mocks.storageRemove.mockResolvedValue({ error: null });

      const file = new File(["img"], "../../site photo.png", {
        type: "image/png",
      });
      const result = await uploadWorkOrderAttachmentAction(
        buildUploadFormData(file),
      );

      expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
      const [bucket, storagePath] = mocks.storageUpload.mock.calls[0] as [
        string,
        string,
      ];
      expect(bucket).toBe("work-order-attachments");
      expect(storagePath).toMatch(
        new RegExp(`^${ORG_ID}/${WORK_ORDER_ID}/[0-9a-f-]+-site-photo\\.png$`),
      );
      expect(mocks.storageRemove).toHaveBeenCalledWith(
        "work-order-attachments",
        [storagePath],
      );
      expect(result).toEqual({
        ok: false,
        message: "Unable to save attachment record. Try again.",
      });
    });

    it("inserts attachment row and revalidates paths on success", async () => {
      mocks.workOrderLookup.mockResolvedValue({
        data: {
          id: WORK_ORDER_ID,
          organization_id: ORG_ID,
          status: "in_progress",
          assigned_to: USER_ID,
        },
        error: null,
      });
      mocks.storageUpload.mockResolvedValue({ error: null });
      mocks.attachmentInsert.mockResolvedValue({
        data: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        error: null,
      });

      const file = new File(["pdf"], "signed.pdf", {
        type: "application/pdf",
      });
      const result = await uploadWorkOrderAttachmentAction(
        buildUploadFormData(file, "document"),
      );

      expect(mocks.storageRemove).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        `/dashboard/work-orders/${WORK_ORDER_ID}`,
      );
      expect(result).toEqual({
        ok: true,
        attachmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        message: "Attachment uploaded.",
      });
    });
  });
});
