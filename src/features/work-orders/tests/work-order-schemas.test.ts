import { describe, expect, it } from "vitest";
import {
  reopenWorkOrderSchema,
  sanitizeAttachmentFileName,
  transitionWorkOrderStatusSchema,
  workOrderAttachmentMetaSchema,
  workOrderFormSchema,
  workOrderItemUsageSchema,
} from "../schemas/work-order-schema";
import { parseWorkOrderSearchParams } from "../schemas/work-order-search-schema";

const CUSTOMER_UUID = "11111111-1111-4111-8111-111111111111";
const ADDRESS_UUID = "22222222-2222-4222-8222-222222222222";
const ASSIGNEE_UUID = "33333333-3333-4333-8333-333333333333";
const WORK_ORDER_UUID = "44444444-4444-4444-8444-444444444444";
const WAREHOUSE_UUID = "55555555-5555-4555-8555-555555555555";
const PRODUCT_UUID = "66666666-6666-4666-8666-666666666666";

describe("work-order-search-schema", () => {
  it("returns safe defaults for missing params", () => {
    expect(parseWorkOrderSearchParams({})).toEqual({
      search: "",
      status: "all",
      priority: "all",
      assignedTo: "all",
      page: 1,
    });
  });

  it("parses valid filters and UUID assignee", () => {
    expect(
      parseWorkOrderSearchParams({
        search: "  WO-2026  ",
        status: "in_progress",
        priority: "urgent",
        assignedTo: ASSIGNEE_UUID,
        page: "3",
      }),
    ).toEqual({
      search: "WO-2026",
      status: "in_progress",
      priority: "urgent",
      assignedTo: ASSIGNEE_UUID,
      page: 3,
    });
  });

  it("supports me and unassigned filters and falls back safely on invalid values", () => {
    expect(parseWorkOrderSearchParams({ assignedTo: "me" }).assignedTo).toBe(
      "me",
    );
    expect(
      parseWorkOrderSearchParams({ assignedTo: "unassigned" }).assignedTo,
    ).toBe("unassigned");

    expect(
      parseWorkOrderSearchParams({
        search: "a".repeat(101),
        status: "invalid_status",
        priority: "critical",
        assignedTo: "not-a-uuid",
        page: "0",
      }),
    ).toEqual({
      search: "",
      status: "all",
      priority: "all",
      assignedTo: "all",
      page: 1,
    });
  });
});

describe("work-order-schema", () => {
  it("parses valid work order create/update payload and normalizes blank optional fields", () => {
    const parsed = workOrderFormSchema.safeParse({
      customerId: CUSTOMER_UUID,
      customerAddressId: "",
      workType: "installation",
      priority: "high",
      initialStatus: "draft",
      assignedTo: "",
      scheduledStart: "",
      scheduledEnd: "",
      description: "  Install and test equipment  ",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        customerId: CUSTOMER_UUID,
        customerAddressId: null,
        workType: "installation",
        priority: "high",
        initialStatus: "draft",
        assignedTo: null,
        scheduledStart: null,
        scheduledEnd: null,
        description: "Install and test equipment",
      });
    }
  });

  it("rejects scheduledEnd before scheduledStart", () => {
    const parsed = workOrderFormSchema.safeParse({
      customerId: CUSTOMER_UUID,
      customerAddressId: ADDRESS_UUID,
      workType: "service",
      priority: "normal",
      assignedTo: ASSIGNEE_UUID,
      scheduledStart: "2026-11-21T14:00:00.000Z",
      scheduledEnd: "2026-11-21T12:00:00.000Z",
      description: "Routine visit",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.scheduledEnd).toBeDefined();
    }
  });

  it("requires completionNotes for completed status and cancellationReason for cancelled status", () => {
    const missingNotes = transitionWorkOrderStatusSchema.safeParse({
      workOrderId: WORK_ORDER_UUID,
      targetStatus: "completed",
      completionNotes: "   ",
    });
    expect(missingNotes.success).toBe(false);
    if (!missingNotes.success) {
      expect(
        missingNotes.error.flatten().fieldErrors.completionNotes,
      ).toBeDefined();
    }

    const missingReason = transitionWorkOrderStatusSchema.safeParse({
      workOrderId: WORK_ORDER_UUID,
      targetStatus: "cancelled",
      cancellationReason: "",
    });
    expect(missingReason.success).toBe(false);
    if (!missingReason.success) {
      expect(
        missingReason.error.flatten().fieldErrors.cancellationReason,
      ).toBeDefined();
    }

    const validStart = transitionWorkOrderStatusSchema.safeParse({
      workOrderId: WORK_ORDER_UUID,
      targetStatus: "in_progress",
    });
    expect(validStart.success).toBe(true);
  });

  it("validates reopenWorkOrderSchema and workOrderItemUsageSchema", () => {
    expect(
      reopenWorkOrderSchema.safeParse({
        workOrderId: WORK_ORDER_UUID,
        reason: "   ",
      }).success,
    ).toBe(false);

    expect(
      reopenWorkOrderSchema.safeParse({
        workOrderId: WORK_ORDER_UUID,
        reason: "Need follow-up inspection",
      }).success,
    ).toBe(true);

    expect(
      workOrderItemUsageSchema.safeParse({
        workOrderId: WORK_ORDER_UUID,
        warehouseId: WAREHOUSE_UUID,
        productId: PRODUCT_UUID,
        quantity: 0,
      }).success,
    ).toBe(false);

    expect(
      workOrderItemUsageSchema.safeParse({
        workOrderId: WORK_ORDER_UUID,
        warehouseId: WAREHOUSE_UUID,
        productId: PRODUCT_UUID,
        quantity: 2.5,
        idempotencyKey: "key-1",
      }).success,
    ).toBe(true);
  });

  it("validates attachment allowlist, size bounds, and sanitizes file names", () => {
    expect(
      workOrderAttachmentMetaSchema.safeParse({
        workOrderId: WORK_ORDER_UUID,
        attachmentType: "photo",
        fileName: "site-photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
      }).success,
    ).toBe(true);

    expect(
      workOrderAttachmentMetaSchema.safeParse({
        workOrderId: WORK_ORDER_UUID,
        attachmentType: "document",
        fileName: "payload.html",
        mimeType: "text/html",
        sizeBytes: 512,
      }).success,
    ).toBe(false);

    expect(
      workOrderAttachmentMetaSchema.safeParse({
        workOrderId: WORK_ORDER_UUID,
        attachmentType: "document",
        fileName: "empty.pdf",
        mimeType: "application/pdf",
        sizeBytes: 0,
      }).success,
    ).toBe(false);

    expect(
      workOrderAttachmentMetaSchema.safeParse({
        workOrderId: WORK_ORDER_UUID,
        attachmentType: "document",
        fileName: "huge.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);

    expect(sanitizeAttachmentFileName("../../evil .. file (1).png")).toBe(
      "evil-.-file-1-.png",
    );
    expect(sanitizeAttachmentFileName("///")).toBe("attachment");
  });
});
