"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database-generated";
import { getSalesOrderDetail } from "../queries/get-sales-order-detail";
import {
  cancelSalesOrderSchema,
  confirmSalesOrderSchema,
  salesOrderDraftSchema,
  salesOrderIdSchema,
  updateSalesOrderDraftSchema,
  type CancelSalesOrderValues,
  type ConfirmSalesOrderValues,
  type SalesOrderDraftValues,
  type SalesOrderItemParsed,
  type UpdateSalesOrderDraftValues,
} from "../schemas/sales-order-schema";
import {
  recordSalesPaymentSchema,
  voidSalesPaymentSchema,
  type RecordSalesPaymentValues,
  type VoidSalesPaymentValues,
} from "../schemas/sales-payment-schema";
import { canAdminSales, canManageSales } from "../services/sales-permissions";
import type { SalesOrderDetail } from "../types/sales";

const PERMISSION_DENIED_MESSAGE =
  "You do not have access to perform this action.";

export type SalesOrderMutationResult =
  | {
      ok: true;
      salesOrderId: string;
      orderNumber?: string;
      status?: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type RecordSalesPaymentResult =
  | {
      ok: true;
      paymentId: string;
      salesOrderId: string;
      paidTotal: number;
      paymentStatus: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type VoidSalesPaymentResult =
  | {
      ok: true;
      paymentId: string;
      salesOrderId: string;
      paidTotal: number;
      paymentStatus: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type SalesOrderDetailActionResult =
  | {
      ok: true;
      data: SalesOrderDetail;
    }
  | {
      ok: false;
      message: string;
    };

function mapSalesRpcError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): string {
  if (!error) return fallback;
  if (error.code === "23505") {
    return "An order with this order number already exists.";
  }

  switch (error.message) {
    case "sales authentication required":
    case "sales permission denied":
    case "sales admin permission denied":
      return PERMISSION_DENIED_MESSAGE;
    case "customer_id is required":
      return "Select a valid customer.";
    case "customer not found":
    case "customer not found in organization":
      return "Selected customer was not found.";
    case "cannot create sales order for archived customer":
      return "Cannot create a sales order for an archived customer.";
    case "cannot assign archived customer to sales order":
      return "Cannot assign an archived customer to a sales order.";
    case "warehouse not found in organization":
      return "Selected warehouse was not found.";
    case "cannot assign inactive warehouse to sales order":
      return "Cannot assign an inactive warehouse to a sales order.";
    case "cannot confirm sales order with inactive warehouse":
      return "Cannot confirm a sales order with an inactive warehouse.";
    case "warehouse_id is required to confirm a sales order with tracked goods":
      return "Select an active warehouse to confirm a sales order containing inventory-tracked goods.";
    case "sales order notes exceed maximum length":
      return "Notes exceed the maximum allowed length.";
    case "sales order number exceeds maximum length":
      return "Order number exceeds the maximum allowed length.";
    case "sales order must include at least one item":
      return "Add at least one item to the sales order.";
    case "sales order must include at least one item before confirmation":
      return "Add at least one item before confirming the sales order.";
    case "each sales order item must be a JSON object":
      return "Invalid sales order item data.";
    case "sales order item quantity is required":
      return "Item quantity is required.";
    case "sales order item quantity must be positive":
      return "Item quantity must be greater than zero.";
    case "sales order item discount_amount cannot be negative":
      return "Item discount cannot be negative.";
    case "sales order item tax_amount cannot be negative":
      return "Item tax cannot be negative.";
    case "product not found in organization":
      return "One or more selected products were not found.";
    case "cannot add inactive or archived product to sales order":
      return "Cannot add an inactive or archived product to a sales order.";
    case "cannot confirm sales order with inactive or archived product":
      return "Cannot confirm a sales order that includes an inactive or archived product.";
    case "sales order item item_type does not match product_type":
      return "Item type does not match the selected product.";
    case "non-catalog sales order items must use item_type custom":
      return "Custom line items must use custom item type.";
    case "custom sales order item name_snapshot is required":
      return "Custom item name is required.";
    case "sales order item name_snapshot exceeds maximum length":
      return "Item name exceeds maximum length.";
    case "custom sales order item unit_snapshot cannot be blank":
      return "Custom item unit is required.";
    case "sales order item unit_snapshot exceeds maximum length":
      return "Item unit exceeds maximum length.";
    case "custom sales order item unit_price is required":
      return "Custom item unit price is required.";
    case "sales order item unit_price cannot be negative":
      return "Unit price cannot be negative.";
    case "sales order item discount_amount cannot exceed line subtotal":
      return "Item discount cannot exceed the line subtotal.";
    case "sales_order_id is required":
      return "Invalid sales order identifier.";
    case "sales order not found":
      return "Sales order not found.";
    case "only draft sales orders can be edited":
      return "Only draft sales orders can be edited.";
    case "only draft sales orders can be confirmed":
      return "Only draft sales orders can be confirmed.";
    case "only confirmed sales orders can be completed":
      return "Only confirmed sales orders can be completed.";
    case "only draft or confirmed sales orders can be cancelled":
      return "Only draft or confirmed sales orders can be cancelled.";
    case "insufficient stock balance":
      return "Insufficient stock balance to confirm this sales order.";
    case "payments can only be recorded for confirmed or completed sales orders":
      return "Payments can only be recorded for confirmed or completed sales orders.";
    case "payment amount is required":
      return "Payment amount is required.";
    case "payment amount must be positive":
      return "Payment amount must be greater than zero.";
    case "invalid payment method":
      return "Select a valid payment method.";
    case "payment reference exceeds maximum length":
      return "Payment reference exceeds maximum length.";
    case "payment notes exceed maximum length":
      return "Payment notes exceed maximum length.";
    case "payment exceeds outstanding order balance":
      return "Payment amount exceeds the remaining balance.";
    case "payment_id is required":
      return "Invalid payment identifier.";
    case "payment not found":
      return "Payment not found.";
    case "payment is already voided":
      return "This payment has already been voided.";
    case "void reason is required":
      return "Void reason is required.";
    case "void reason exceeds maximum length":
      return "Void reason exceeds maximum length.";
    case "cancellation reason is required":
      return "Cancellation reason is required.";
    case "cancellation reason exceeds maximum length":
      return "Cancellation reason exceeds maximum length.";
    case "cannot cancel sales order with active completed payments":
      return "Void all active completed payments before cancelling this sales order.";
    default:
      return fallback;
  }
}

function serializeOrderItemsForRpc(items: SalesOrderItemParsed[]): Json {
  return items.map((item) => {
    if (item.productId) {
      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount,
        tax_amount: item.taxAmount,
      };
    }

    return {
      item_type: "custom",
      name_snapshot: item.name,
      sku_snapshot: item.sku,
      unit_snapshot: item.unit,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_amount: item.discountAmount,
      tax_amount: item.taxAmount,
    };
  });
}

function revalidateSalesPaths(salesOrderId?: string, includeInventory = false) {
  revalidatePath("/dashboard/sales");
  if (salesOrderId) {
    revalidatePath(`/dashboard/sales/${salesOrderId}`);
  }
  if (includeInventory) {
    revalidatePath("/dashboard/inventory");
  }
  revalidatePath("/dashboard");
}

export async function createSalesOrderDraftAction(
  values: SalesOrderDraftValues,
): Promise<SalesOrderMutationResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageSales(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = salesOrderDraftSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid sales order data. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const { data: rpcData, error } = await supabase.rpc(
    "create_sales_order_draft",
    {
      p_customer_id: data.customerId,
      p_items: serializeOrderItemsForRpc(data.items),
      p_order_number: data.orderNumber ?? undefined,
      p_warehouse_id: data.warehouseId ?? undefined,
      p_notes: data.notes ?? undefined,
    },
  );

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapSalesRpcError(
        error,
        "Unable to create sales order draft. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateSalesPaths(row.sales_order_id);

  return {
    ok: true,
    salesOrderId: row.sales_order_id,
    orderNumber: row.order_number,
    status: row.status,
    message: "Sales order draft created.",
  };
}

export async function updateSalesOrderDraftAction(
  salesOrderId: string,
  values: UpdateSalesOrderDraftValues,
): Promise<SalesOrderMutationResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageSales(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedOrderId = salesOrderIdSchema.safeParse(salesOrderId);
  if (!parsedOrderId.success) {
    return { ok: false, message: "Invalid sales order identifier." };
  }

  const parsed = updateSalesOrderDraftSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid sales order data. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const { data: rpcData, error } = await supabase.rpc(
    "update_sales_order_draft",
    {
      p_sales_order_id: parsedOrderId.data,
      p_customer_id: data.customerId,
      p_items: serializeOrderItemsForRpc(data.items),
      p_warehouse_id: data.warehouseId ?? undefined,
      p_notes: data.notes ?? undefined,
    },
  );

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapSalesRpcError(
        error,
        "Unable to update sales order draft. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateSalesPaths(row.sales_order_id);

  return {
    ok: true,
    salesOrderId: row.sales_order_id,
    orderNumber: row.order_number,
    status: row.status,
    message: "Sales order draft updated.",
  };
}

export async function confirmSalesOrderAction(
  values: ConfirmSalesOrderValues,
): Promise<SalesOrderMutationResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageSales(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = confirmSalesOrderSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid confirmation input.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const { data: rpcData, error } = await supabase.rpc("confirm_sales_order", {
    p_sales_order_id: data.salesOrderId,
    p_warehouse_id: data.warehouseId ?? undefined,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapSalesRpcError(
        error,
        "Unable to confirm sales order. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateSalesPaths(row.sales_order_id, true);

  return {
    ok: true,
    salesOrderId: row.sales_order_id,
    status: row.status,
    message: "Sales order confirmed.",
  };
}

export async function recordSalesPaymentAction(
  values: RecordSalesPaymentValues,
): Promise<RecordSalesPaymentResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageSales(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = recordSalesPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid payment input.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const { data: rpcData, error } = await supabase.rpc("record_sales_payment", {
    p_sales_order_id: data.salesOrderId,
    p_amount: data.amount,
    p_payment_method: data.paymentMethod,
    p_paid_at: data.paidAt ?? undefined,
    p_reference: data.reference ?? undefined,
    p_notes: data.notes ?? undefined,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapSalesRpcError(error, "Unable to record payment. Try again."),
    };
  }

  const row = rpcData[0];
  revalidateSalesPaths(row.sales_order_id);

  return {
    ok: true,
    paymentId: row.payment_id,
    salesOrderId: row.sales_order_id,
    paidTotal: Number(row.paid_total),
    paymentStatus: row.payment_status,
    message: "Payment recorded.",
  };
}

export async function voidSalesPaymentAction(
  values: VoidSalesPaymentValues,
): Promise<VoidSalesPaymentResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canAdminSales(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = voidSalesPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid void payment input.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const { data: rpcData, error } = await supabase.rpc("void_sales_payment", {
    p_payment_id: data.paymentId,
    p_void_reason: data.voidReason,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapSalesRpcError(error, "Unable to void payment. Try again."),
    };
  }

  const row = rpcData[0];
  revalidateSalesPaths(row.sales_order_id);

  return {
    ok: true,
    paymentId: row.payment_id,
    salesOrderId: row.sales_order_id,
    paidTotal: Number(row.paid_total),
    paymentStatus: row.payment_status,
    message: "Payment voided.",
  };
}

export async function completeSalesOrderAction(
  salesOrderId: string,
): Promise<SalesOrderMutationResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageSales(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedOrderId = salesOrderIdSchema.safeParse(salesOrderId);
  if (!parsedOrderId.success) {
    return { ok: false, message: "Invalid sales order identifier." };
  }

  const { data: rpcData, error } = await supabase.rpc("complete_sales_order", {
    p_sales_order_id: parsedOrderId.data,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapSalesRpcError(
        error,
        "Unable to complete sales order. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateSalesPaths(row.sales_order_id);

  return {
    ok: true,
    salesOrderId: row.sales_order_id,
    status: row.status,
    message: "Sales order completed.",
  };
}

export async function cancelSalesOrderAction(
  values: CancelSalesOrderValues,
): Promise<SalesOrderMutationResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canAdminSales(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = cancelSalesOrderSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid cancellation input.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const { data: rpcData, error } = await supabase.rpc("cancel_sales_order", {
    p_sales_order_id: data.salesOrderId,
    p_reason: data.reason,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapSalesRpcError(
        error,
        "Unable to cancel sales order. Try again.",
      ),
    };
  }

  const row = rpcData[0];
  revalidateSalesPaths(row.sales_order_id, true);

  return {
    ok: true,
    salesOrderId: row.sales_order_id,
    status: row.status,
    message: "Sales order cancelled.",
  };
}

export async function getSalesOrderForEditAction(
  salesOrderId: string,
): Promise<SalesOrderDetailActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageSales(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedOrderId = salesOrderIdSchema.safeParse(salesOrderId);
  if (!parsedOrderId.success) {
    return { ok: false, message: "Invalid sales order identifier." };
  }

  const result = await getSalesOrderDetail(
    supabase,
    organizationState.organization.id,
    parsedOrderId.data,
  );

  if (!result.ok) {
    return result;
  }

  if (result.data.status !== "draft") {
    return { ok: false, message: "Only draft sales orders can be edited." };
  }

  return result;
}
