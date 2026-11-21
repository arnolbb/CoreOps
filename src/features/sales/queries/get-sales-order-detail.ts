import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import { salesOrderIdSchema } from "../schemas/sales-order-schema";
import type {
  SalesCustomerOption,
  SalesFormOptions,
  SalesOrderDetail,
  SalesOrderItemType,
  SalesOrderItemView,
  SalesOrderStatus,
  SalesPaymentMethod,
  SalesPaymentStatus,
  SalesPaymentView,
  SalesProductOption,
  SalesWarehouseOption,
} from "../types/sales";

const SAFE_SALES_DETAIL_ERROR = "Unable to load sales order. Try again.";

type SalesOrderHeaderRow = Pick<
  Database["public"]["Tables"]["sales_orders"]["Row"],
  | "id"
  | "order_number"
  | "customer_id"
  | "warehouse_id"
  | "status"
  | "payment_status"
  | "currency_code"
  | "subtotal"
  | "discount_total"
  | "tax_total"
  | "grand_total"
  | "paid_total"
  | "notes"
  | "cancellation_reason"
  | "confirmed_at"
  | "completed_at"
  | "cancelled_at"
  | "created_at"
  | "updated_at"
>;

type SalesOrderItemRow = Pick<
  Database["public"]["Tables"]["sales_order_items"]["Row"],
  | "id"
  | "product_id"
  | "item_type"
  | "name_snapshot"
  | "sku_snapshot"
  | "unit_snapshot"
  | "quantity"
  | "unit_price"
  | "discount_amount"
  | "tax_amount"
  | "line_total"
>;

type PaymentRow = Pick<
  Database["public"]["Tables"]["payments"]["Row"],
  | "id"
  | "amount"
  | "payment_method"
  | "reference"
  | "status"
  | "paid_at"
  | "notes"
  | "created_at"
  | "voided_at"
  | "void_reason"
>;

type WarehouseRow = Pick<
  Database["public"]["Tables"]["warehouses"]["Row"],
  "id" | "name" | "code" | "is_active"
>;

type CustomerRow = Pick<
  Database["public"]["Tables"]["customers"]["Row"],
  | "id"
  | "display_name"
  | "company_name"
  | "email"
  | "phone"
  | "status"
  | "archived_at"
>;

type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "product_type"
  | "name"
  | "sku"
  | "unit"
  | "selling_price"
  | "track_inventory"
  | "is_active"
  | "archived_at"
>;

export type SalesOrderDetailResult =
  | {
      ok: true;
      data: SalesOrderDetail;
    }
  | {
      ok: false;
      message: string;
    };

function normalizeOrderStatus(value: string): SalesOrderStatus {
  if (
    value === "draft" ||
    value === "confirmed" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "draft";
}

function normalizePaymentStatus(value: string): SalesPaymentStatus {
  if (
    value === "unpaid" ||
    value === "partially_paid" ||
    value === "paid" ||
    value === "refunded"
  ) {
    return value;
  }
  return "unpaid";
}

function normalizeItemType(value: string): SalesOrderItemType {
  if (value === "goods" || value === "service") {
    return value;
  }
  return "custom";
}

function normalizePaymentMethod(value: string): SalesPaymentMethod {
  if (
    value === "cash" ||
    value === "bank_transfer" ||
    value === "credit_card"
  ) {
    return value;
  }
  return "other";
}

export async function getSalesOrderDetail(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  salesOrderId: string,
): Promise<SalesOrderDetailResult> {
  const parsedId = salesOrderIdSchema.safeParse(salesOrderId);
  if (!parsedId.success) {
    return { ok: false, message: "Sales order not found." };
  }

  const { data: orderData, error: orderError } = await supabase
    .from("sales_orders")
    .select(
      "id, order_number, customer_id, warehouse_id, status, payment_status, currency_code, subtotal, discount_total, tax_total, grand_total, paid_total, notes, cancellation_reason, confirmed_at, completed_at, cancelled_at, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("id", parsedId.data)
    .maybeSingle();

  if (orderError) {
    return { ok: false, message: SAFE_SALES_DETAIL_ERROR };
  }

  if (!orderData) {
    return { ok: false, message: "Sales order not found." };
  }

  const order = orderData as SalesOrderHeaderRow;
  const isDraft = order.status === "draft";

  const [
    orgResult,
    customerResult,
    warehousesResult,
    itemsResult,
    paymentsResult,
    draftCustomersResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, currency_code, timezone")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id, display_name, company_name, email, phone, status")
      .eq("organization_id", organizationId)
      .eq("id", order.customer_id)
      .maybeSingle(),
    supabase
      .from("warehouses")
      .select("id, name, code, is_active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("sales_order_items")
      .select(
        "id, product_id, item_type, name_snapshot, sku_snapshot, unit_snapshot, quantity, unit_price, discount_amount, tax_amount, line_total",
      )
      .eq("organization_id", organizationId)
      .eq("sales_order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select(
        "id, amount, payment_method, reference, status, paid_at, notes, created_at, voided_at, void_reason",
      )
      .eq("organization_id", organizationId)
      .eq("sales_order_id", order.id)
      .order("paid_at", { ascending: false })
      .order("created_at", { ascending: false }),
    isDraft
      ? supabase
          .from("customers")
          .select("id, display_name, company_name, status, archived_at")
          .eq("organization_id", organizationId)
          .eq("status", "active")
          .is("archived_at", null)
          .order("display_name", { ascending: true })
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("products")
      .select(
        "id, product_type, name, sku, unit, selling_price, track_inventory, is_active, archived_at",
      )
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
  ]);

  if (
    orgResult.error ||
    customerResult.error ||
    warehousesResult.error ||
    itemsResult.error ||
    paymentsResult.error ||
    draftCustomersResult.error ||
    productsResult.error
  ) {
    return { ok: false, message: SAFE_SALES_DETAIL_ERROR };
  }

  const warehouseRows = (warehousesResult.data ?? []) as WarehouseRow[];
  const warehouseMap = new Map(warehouseRows.map((w) => [w.id, w]));
  const activeWarehouses: SalesWarehouseOption[] = warehouseRows
    .filter((w) => w.is_active)
    .map((w) => ({
      id: w.id,
      name: w.name,
      code: w.code,
    }));

  const assignedWarehouse = order.warehouse_id
    ? (warehouseMap.get(order.warehouse_id) ?? null)
    : null;

  const productRows = (productsResult.data ?? []) as ProductRow[];
  const productTrackMap = new Map(
    productRows.map((p) => [p.id, p.track_inventory]),
  );

  const itemRows = (itemsResult.data ?? []) as SalesOrderItemRow[];
  const items: SalesOrderItemView[] = itemRows.map((row) => {
    const itemType = normalizeItemType(row.item_type);
    const trackInventory =
      itemType === "goods" && row.product_id
        ? (productTrackMap.get(row.product_id) ?? false)
        : false;

    return {
      id: row.id,
      productId: row.product_id,
      itemType,
      nameSnapshot: row.name_snapshot,
      skuSnapshot: row.sku_snapshot,
      unitSnapshot: row.unit_snapshot,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      discountAmount: Number(row.discount_amount),
      taxAmount: Number(row.tax_amount),
      lineTotal: Number(row.line_total),
      trackInventory,
    };
  });

  const paymentRows = (paymentsResult.data ?? []) as PaymentRow[];
  const payments: SalesPaymentView[] = paymentRows.map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    paymentMethod: normalizePaymentMethod(row.payment_method),
    reference: row.reference,
    status: row.status === "voided" ? "voided" : "completed",
    paidAt: row.paid_at,
    notes: row.notes,
    createdAt: row.created_at,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
  }));

  let formOptions: SalesFormOptions | null = null;
  if (isDraft) {
    const draftCustomerRows = (draftCustomersResult.data ?? []) as Pick<
      CustomerRow,
      "id" | "display_name" | "company_name" | "status"
    >[];
    const customers: SalesCustomerOption[] = draftCustomerRows.map((c) => ({
      id: c.id,
      displayName: c.display_name,
      companyName: c.company_name,
      status: c.status,
    }));

    const products: SalesProductOption[] = productRows
      .filter((p) => p.is_active && p.archived_at === null)
      .map((p) => ({
        id: p.id,
        productType: p.product_type === "service" ? "service" : "goods",
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        sellingPrice: Number(p.selling_price),
        trackInventory: p.track_inventory,
      }));

    formOptions = {
      customers,
      products,
      warehouses: activeWarehouses,
    };
  }

  const grandTotal = Number(order.grand_total);
  const paidTotal = Number(order.paid_total);
  const outstandingBalance = Math.max(
    Number((grandTotal - paidTotal).toFixed(2)),
    0,
  );

  return {
    ok: true,
    data: {
      id: order.id,
      orderNumber: order.order_number,
      status: normalizeOrderStatus(order.status),
      paymentStatus: normalizePaymentStatus(order.payment_status),
      currencyCode:
        order.currency_code ?? orgResult.data?.currency_code ?? "USD",
      organizationName: orgResult.data?.name ?? "Organization",
      organizationTimezone: orgResult.data?.timezone ?? "UTC",
      customer: {
        id: customerResult.data?.id ?? order.customer_id,
        displayName: customerResult.data?.display_name ?? "Unknown Customer",
        companyName: customerResult.data?.company_name ?? null,
        email: customerResult.data?.email ?? null,
        phone: customerResult.data?.phone ?? null,
        status: customerResult.data?.status ?? "active",
      },
      warehouse: assignedWarehouse
        ? {
            id: assignedWarehouse.id,
            name: assignedWarehouse.name,
            code: assignedWarehouse.code,
            isActive: assignedWarehouse.is_active,
          }
        : null,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discount_total),
      taxTotal: Number(order.tax_total),
      grandTotal,
      paidTotal,
      outstandingBalance,
      notes: order.notes,
      cancellationReason: order.cancellation_reason,
      hasTrackedGoods: items.some(
        (item) => item.itemType === "goods" && item.trackInventory,
      ),
      confirmedAt: order.confirmed_at,
      completedAt: order.completed_at,
      cancelledAt: order.cancelled_at,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items,
      payments,
      activeWarehouses,
      formOptions,
    },
  };
}
