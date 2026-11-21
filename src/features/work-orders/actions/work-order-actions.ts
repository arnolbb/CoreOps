"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  reopenWorkOrderSchema,
  sanitizeAttachmentFileName,
  transitionWorkOrderStatusSchema,
  workOrderAttachmentMetaSchema,
  workOrderFormSchema,
  workOrderItemUsageSchema,
  type ReopenWorkOrderValues,
  type TransitionWorkOrderStatusValues,
  type WorkOrderFormValues,
  type WorkOrderItemUsageValues,
} from "../schemas/work-order-schema";
import {
  canManageWorkOrders,
  canOperateWorkOrder,
  canReopenWorkOrders,
} from "../services/work-order-permissions";
import type { WorkOrderStatus } from "../types/work-order";

const WORK_ORDER_ATTACHMENTS_BUCKET = "work-order-attachments";
const PERMISSION_DENIED_MESSAGE =
  "You do not have access to perform this action.";
const ACTIVE_ORG_REQUIRED_MESSAGE = "Active organization required.";

const workOrderIdSchema = z.string().uuid("Invalid work order identifier");

export type WorkOrderActionResult =
  | {
      ok: true;
      workOrderId: string;
      workOrderNumber?: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type WorkOrderItemUsageActionResult =
  | {
      ok: true;
      itemId: string;
      quantityBefore: number;
      quantityAfter: number;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type WorkOrderAttachmentActionResult =
  | {
      ok: true;
      attachmentId: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

function mapWorkOrderRpcError(
  message: string | null | undefined,
  fallback: string,
): string {
  switch (message) {
    case "work order authentication required":
    case "work order permission denied":
    case "work order reopen permission denied":
    case "work order item permission denied":
      return PERMISSION_DENIED_MESSAGE;
    case "work order organization unavailable":
      return ACTIVE_ORG_REQUIRED_MESSAGE;
    case "invalid work order type":
      return "Select a valid work type.";
    case "invalid work order priority":
      return "Select a valid priority.";
    case "invalid initial work order status":
      return "Invalid initial work order status.";
    case "work order description is required":
      return "Description is required.";
    case "work order description exceeds maximum length":
      return "Description must be at most 5000 characters.";
    case "scheduled end cannot be before scheduled start":
      return "Scheduled end cannot be before scheduled start.";
    case "customer not found in organization":
      return "Selected customer was not found.";
    case "cannot create work order for archived customer":
      return "Cannot create a work order for an archived customer.";
    case "cannot assign work order to archived customer":
      return "Cannot assign a work order to an archived customer.";
    case "customer address not found for customer":
      return "Selected customer address was not found for this customer.";
    case "assignee must be an active member of organization":
      return "Selected assignee must be an active organization member.";
    case "work order not found":
      return "Work order not found.";
    case "cannot update completed or cancelled work order":
      return "Completed or cancelled work orders cannot be edited.";
    case "invalid work order target status":
      return "Invalid target work order status.";
    case "work order status transition not allowed":
      return "This status transition is not allowed.";
    case "completion notes are required to complete a work order":
      return "Completion notes are required to complete a work order.";
    case "completion notes exceed maximum length":
      return "Completion notes must be at most 5000 characters.";
    case "cancellation reason is required to cancel a work order":
      return "Cancellation reason is required to cancel a work order.";
    case "cancellation reason exceeds maximum length":
      return "Cancellation reason must be at most 2000 characters.";
    case "only completed work orders can be reopened":
      return "Only completed work orders can be reopened.";
    case "reopen reason is required":
      return "Reopen reason is required.";
    case "reopen reason exceeds maximum length":
      return "Reopen reason must be at most 2000 characters.";
    case "usage quantity must be positive":
      return "Quantity must be greater than zero.";
    case "idempotency key exceeds maximum length":
      return "Idempotency key is too long.";
    case "cannot record item usage on completed or cancelled work order":
      return "Cannot record item usage on a completed or cancelled work order.";
    case "work order must be in progress to record item usage":
      return "Work order must be in progress to record item usage.";
    case "warehouse not found in work order organization":
      return "Selected warehouse was not found.";
    case "cannot use stock from inactive warehouse":
      return "Cannot use stock from an inactive warehouse.";
    case "product not found in work order organization":
      return "Selected product was not found.";
    case "cannot record inactive or archived product on work order":
      return "Cannot use an inactive or archived product.";
    case "only tracked goods products can be consumed from inventory":
      return "Only inventory-tracked goods products can be consumed.";
    case "idempotency key already used for a different operation":
      return "This submission conflicts with a previous request. Refresh and try again.";
    case "insufficient stock balance":
      return "Insufficient stock balance in the selected warehouse.";
    default:
      return fallback;
  }
}

function getTransitionSuccessMessage(targetStatus: WorkOrderStatus): string {
  switch (targetStatus) {
    case "scheduled":
      return "Work order scheduled.";
    case "in_progress":
      return "Work order started.";
    case "completed":
      return "Work order completed.";
    case "cancelled":
      return "Work order cancelled.";
    case "draft":
      return "Work order moved to draft.";
  }
}

function revalidateWorkOrderPaths(workOrderId?: string) {
  revalidatePath("/dashboard/work-orders");
  if (workOrderId) {
    revalidatePath(`/dashboard/work-orders/${workOrderId}`);
  }
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard");
}

export async function createWorkOrderAction(
  values: WorkOrderFormValues,
): Promise<WorkOrderActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: ACTIVE_ORG_REQUIRED_MESSAGE };
  }

  if (!canManageWorkOrders(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = workOrderFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid work order data. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const initialStatus =
    data.initialStatus === "scheduled" || Boolean(data.scheduledStart)
      ? "scheduled"
      : "draft";

  const { data: rpcData, error } = await supabase.rpc("create_work_order", {
    p_organization_id: organizationState.organization.id,
    p_customer_id: data.customerId,
    p_work_type: data.workType,
    p_description: data.description,
    p_priority: data.priority,
    p_status: initialStatus,
    p_customer_address_id: data.customerAddressId ?? undefined,
    p_assigned_to: data.assignedTo ?? undefined,
    p_scheduled_start: data.scheduledStart ?? undefined,
    p_scheduled_end: data.scheduledEnd ?? undefined,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapWorkOrderRpcError(
        error?.message,
        "Unable to create work order. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateWorkOrderPaths(row.work_order_id);

  return {
    ok: true,
    workOrderId: row.work_order_id,
    workOrderNumber: row.work_order_number,
    message: "Work order created.",
  };
}

export async function updateWorkOrderAction(
  workOrderId: string,
  values: WorkOrderFormValues,
): Promise<WorkOrderActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: ACTIVE_ORG_REQUIRED_MESSAGE };
  }

  if (!canManageWorkOrders(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedId = workOrderIdSchema.safeParse(workOrderId);
  if (!parsedId.success) {
    return { ok: false, message: "Invalid work order identifier." };
  }

  const parsed = workOrderFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid work order data. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  const { data: rpcData, error } = await supabase.rpc("update_work_order", {
    p_work_order_id: parsedId.data,
    p_customer_id: data.customerId,
    p_work_type: data.workType,
    p_priority: data.priority,
    p_description: data.description,
    p_customer_address_id: data.customerAddressId ?? undefined,
    p_assigned_to: data.assignedTo ?? undefined,
    p_scheduled_start: data.scheduledStart ?? undefined,
    p_scheduled_end: data.scheduledEnd ?? undefined,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapWorkOrderRpcError(
        error?.message,
        "Unable to update work order. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateWorkOrderPaths(row.work_order_id);

  return {
    ok: true,
    workOrderId: row.work_order_id,
    workOrderNumber: row.work_order_number,
    message: "Work order updated.",
  };
}

export async function transitionWorkOrderStatusAction(
  values: TransitionWorkOrderStatusValues,
): Promise<WorkOrderActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: ACTIVE_ORG_REQUIRED_MESSAGE };
  }

  const role = organizationState.membership.role;
  const isManager = canManageWorkOrders(role);

  if (!isManager && role !== "technician") {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = transitionWorkOrderStatusSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid status transition input.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  if (!isManager) {
    if (
      data.targetStatus !== "in_progress" &&
      data.targetStatus !== "completed"
    ) {
      return { ok: false, message: PERMISSION_DENIED_MESSAGE };
    }

    const { data: workOrder, error: lookupError } = await supabase
      .from("work_orders")
      .select("id, assigned_to")
      .eq("organization_id", organizationState.organization.id)
      .eq("id", data.workOrderId)
      .maybeSingle();

    if (lookupError) {
      return {
        ok: false,
        message: "Unable to update work order status. Try again.",
      };
    }

    if (!workOrder) {
      return { ok: false, message: "Work order not found." };
    }

    if (!canOperateWorkOrder(role, workOrder.assigned_to, user.id)) {
      return { ok: false, message: PERMISSION_DENIED_MESSAGE };
    }
  }

  const { data: rpcData, error } = await supabase.rpc(
    "transition_work_order_status",
    {
      p_work_order_id: data.workOrderId,
      p_target_status: data.targetStatus,
      p_completion_notes: data.completionNotes ?? undefined,
      p_cancellation_reason: data.cancellationReason ?? undefined,
    },
  );

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapWorkOrderRpcError(
        error?.message,
        "Unable to update work order status. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateWorkOrderPaths(row.work_order_id);

  return {
    ok: true,
    workOrderId: row.work_order_id,
    workOrderNumber: row.work_order_number,
    message: getTransitionSuccessMessage(data.targetStatus),
  };
}

export async function reopenWorkOrderAction(
  values: ReopenWorkOrderValues,
): Promise<WorkOrderActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: ACTIVE_ORG_REQUIRED_MESSAGE };
  }

  if (!canReopenWorkOrders(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = reopenWorkOrderSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Reopen reason is required.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  const { data: rpcData, error } = await supabase.rpc("reopen_work_order", {
    p_work_order_id: data.workOrderId,
    p_reason: data.reason,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapWorkOrderRpcError(
        error?.message,
        "Unable to reopen work order. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateWorkOrderPaths(row.work_order_id);

  return {
    ok: true,
    workOrderId: row.work_order_id,
    workOrderNumber: row.work_order_number,
    message: "Work order reopened.",
  };
}

export async function recordWorkOrderItemUsageAction(
  values: WorkOrderItemUsageValues,
): Promise<WorkOrderItemUsageActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: ACTIVE_ORG_REQUIRED_MESSAGE };
  }

  const role = organizationState.membership.role;
  const isManager = canManageWorkOrders(role);

  if (!isManager && role !== "technician") {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = workOrderItemUsageSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid item usage input.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  if (!isManager) {
    const { data: workOrder, error: lookupError } = await supabase
      .from("work_orders")
      .select("id, assigned_to")
      .eq("organization_id", organizationState.organization.id)
      .eq("id", data.workOrderId)
      .maybeSingle();

    if (lookupError) {
      return {
        ok: false,
        message: "Unable to record item usage. Try again.",
      };
    }

    if (!workOrder) {
      return { ok: false, message: "Work order not found." };
    }

    if (!canOperateWorkOrder(role, workOrder.assigned_to, user.id)) {
      return { ok: false, message: PERMISSION_DENIED_MESSAGE };
    }
  }

  const { data: rpcData, error } = await supabase.rpc(
    "record_work_order_item_usage",
    {
      p_work_order_id: data.workOrderId,
      p_warehouse_id: data.warehouseId,
      p_product_id: data.productId,
      p_quantity: data.quantity,
      p_idempotency_key: data.idempotencyKey ?? undefined,
    },
  );

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapWorkOrderRpcError(
        error?.message,
        "Unable to record item usage. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateWorkOrderPaths(row.work_order_id);

  return {
    ok: true,
    itemId: row.work_order_item_id,
    quantityBefore: Number(row.quantity_before),
    quantityAfter: Number(row.quantity_after),
    message: "Item usage recorded.",
  };
}

export async function uploadWorkOrderAttachmentAction(
  formData: FormData,
): Promise<WorkOrderAttachmentActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: ACTIVE_ORG_REQUIRED_MESSAGE };
  }

  const role = organizationState.membership.role;
  if (!canManageWorkOrders(role) && role !== "technician") {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const rawWorkOrderId = formData.get("workOrderId");
  const rawAttachmentType = formData.get("attachmentType");
  const rawFile = formData.get("file");

  const parsedWorkOrderId = workOrderIdSchema.safeParse(
    typeof rawWorkOrderId === "string" ? rawWorkOrderId : "",
  );
  if (!parsedWorkOrderId.success) {
    return { ok: false, message: "Invalid work order identifier." };
  }

  if (!(rawFile instanceof File)) {
    return {
      ok: false,
      message: "Select a file to upload.",
      fieldErrors: { file: ["Select a file to upload."] },
    };
  }

  const parsedMeta = workOrderAttachmentMetaSchema.safeParse({
    workOrderId: parsedWorkOrderId.data,
    attachmentType:
      typeof rawAttachmentType === "string" ? rawAttachmentType : "",
    fileName: rawFile.name,
    mimeType: rawFile.type,
    sizeBytes: rawFile.size,
  });

  if (!parsedMeta.success) {
    const fieldErrors = parsedMeta.error.flatten().fieldErrors;
    const firstMessage =
      fieldErrors.mimeType?.[0] ??
      fieldErrors.sizeBytes?.[0] ??
      fieldErrors.attachmentType?.[0] ??
      fieldErrors.fileName?.[0] ??
      "Invalid attachment file.";

    return {
      ok: false,
      message: firstMessage,
      fieldErrors,
    };
  }

  const organizationId = organizationState.organization.id;
  const workOrderId = parsedMeta.data.workOrderId;

  const { data: workOrder, error: workOrderError } = await supabase
    .from("work_orders")
    .select("id, organization_id, status, assigned_to")
    .eq("organization_id", organizationId)
    .eq("id", workOrderId)
    .maybeSingle();

  if (workOrderError) {
    return { ok: false, message: "Unable to upload attachment. Try again." };
  }

  if (!workOrder) {
    return { ok: false, message: "Work order not found." };
  }

  if (!canOperateWorkOrder(role, workOrder.assigned_to, user.id)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  if (
    workOrder.status !== "draft" &&
    workOrder.status !== "scheduled" &&
    workOrder.status !== "in_progress"
  ) {
    return {
      ok: false,
      message:
        "Attachments cannot be uploaded to completed or cancelled work orders.",
    };
  }

  const safeName = sanitizeAttachmentFileName(parsedMeta.data.fileName);
  const displayFileName =
    (parsedMeta.data.fileName.split(/[\\/]/).pop() ?? "")
      .trim()
      .slice(0, 255) || safeName;
  const storagePath = `${organizationId}/${workOrderId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(WORK_ORDER_ATTACHMENTS_BUCKET)
    .upload(storagePath, rawFile, {
      contentType: parsedMeta.data.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, message: "Unable to upload attachment. Try again." };
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("work_order_attachments")
    .insert({
      organization_id: organizationId,
      work_order_id: workOrderId,
      storage_path: storagePath,
      file_name: displayFileName,
      mime_type: parsedMeta.data.mimeType,
      size_bytes: parsedMeta.data.sizeBytes,
      attachment_type: parsedMeta.data.attachmentType,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !insertedRow) {
    try {
      await supabase.storage
        .from(WORK_ORDER_ATTACHMENTS_BUCKET)
        .remove([storagePath]);
    } catch {
      // Ignore cleanup failure so the safe action error is still returned.
    }

    return {
      ok: false,
      message: "Unable to save attachment record. Try again.",
    };
  }

  revalidateWorkOrderPaths(workOrderId);

  return {
    ok: true,
    attachmentId: insertedRow.id,
    message: "Attachment uploaded.",
  };
}
