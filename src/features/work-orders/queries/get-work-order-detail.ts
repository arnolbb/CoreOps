import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/types/database-generated";
import { canManageWorkOrders } from "../services/work-order-permissions";
import type {
  WorkOrderAddressOption,
  WorkOrderAssigneeOption,
  WorkOrderAttachmentView,
  WorkOrderCustomerOption,
  WorkOrderDetailData,
  WorkOrderItemView,
  WorkOrderProductOption,
  WorkOrderWarehouseOption,
} from "../types/work-order";
import {
  toWorkOrderAddressOption,
  toWorkOrderAttachmentType,
  toWorkOrderPriority,
  toWorkOrderStatus,
  toWorkOrderType,
  type CustomerAddressRow,
} from "./work-order-mappers";

const WORK_ORDER_ATTACHMENTS_BUCKET = "work-order-attachments";
const SIGNED_URL_TTL_SECONDS = 900;
const workOrderIdSchema = z.string().uuid();

const WORK_ORDER_NOT_FOUND_ERROR = "Work order not found.";
const SAFE_WORK_ORDER_DETAIL_ERROR =
  "Unable to load work order details. Try again.";

export type WorkOrderDetailResult =
  | {
      ok: true;
      data: WorkOrderDetailData;
    }
  | {
      ok: false;
      message: string;
    };

type WorkOrderRow = Database["public"]["Tables"]["work_orders"]["Row"];
type WorkOrderItemRow = Database["public"]["Tables"]["work_order_items"]["Row"];
type WorkOrderAttachmentRow =
  Database["public"]["Tables"]["work_order_attachments"]["Row"];
type CustomerRow = Pick<
  Database["public"]["Tables"]["customers"]["Row"],
  | "id"
  | "display_name"
  | "company_name"
  | "phone"
  | "email"
  | "status"
  | "archived_at"
>;
type WarehouseRow = Pick<
  Database["public"]["Tables"]["warehouses"]["Row"],
  "id" | "name" | "code" | "is_active"
>;
type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  "id" | "name" | "sku" | "unit"
>;
type AssigneeRow =
  Database["public"]["Functions"]["get_work_order_assignees"]["Returns"][number];

export async function getWorkOrderDetail(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  workOrderId: string,
  role: string,
  userEmail?: string,
  userId?: string,
): Promise<WorkOrderDetailResult> {
  if (!workOrderIdSchema.safeParse(workOrderId).success) {
    return {
      ok: false,
      message: WORK_ORDER_NOT_FOUND_ERROR,
    };
  }

  const { data: workOrderData, error: workOrderError } = await supabase
    .from("work_orders")
    .select(
      "id, organization_id, work_order_number, customer_id, customer_address_id, work_type, priority, status, assigned_to, scheduled_start, scheduled_end, description, completion_notes, cancellation_reason, started_at, completed_at, cancelled_at, created_by, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("id", workOrderId)
    .maybeSingle();

  if (workOrderError || !workOrderData) {
    return {
      ok: false,
      message: WORK_ORDER_NOT_FOUND_ERROR,
    };
  }

  const workOrderRow = workOrderData as WorkOrderRow;
  const isTechnician = role === "technician";
  const canManage = canManageWorkOrders(role);

  const [
    customerResult,
    addressResult,
    itemsResult,
    attachmentsResult,
    warehousesResult,
    productsResult,
    assigneesResult,
    activeCustomersResult,
    allAddressesResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, display_name, company_name, phone, email, status, archived_at",
      )
      .eq("organization_id", organizationId)
      .eq("id", workOrderRow.customer_id)
      .maybeSingle(),
    workOrderRow.customer_address_id
      ? supabase
          .from("customer_addresses")
          .select(
            "id, customer_id, label, address_line_1, address_line_2, city, province, postal_code, country_code, is_primary",
          )
          .eq("organization_id", organizationId)
          .eq("id", workOrderRow.customer_address_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("work_order_items")
      .select(
        "id, organization_id, work_order_id, product_id, warehouse_id, name_snapshot, unit_snapshot, quantity, inventory_transaction_id, created_by, created_at",
      )
      .eq("organization_id", organizationId)
      .eq("work_order_id", workOrderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("work_order_attachments")
      .select(
        "id, organization_id, work_order_id, storage_path, file_name, mime_type, size_bytes, attachment_type, uploaded_by, created_at",
      )
      .eq("organization_id", organizationId)
      .eq("work_order_id", workOrderId)
      .order("created_at", { ascending: false }),
    supabase
      .from("warehouses")
      .select("id, name, code, is_active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, sku, unit")
      .eq("organization_id", organizationId)
      .eq("product_type", "goods")
      .eq("track_inventory", true)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("name", { ascending: true }),
    isTechnician
      ? Promise.resolve({ data: [] as AssigneeRow[], error: null })
      : supabase.rpc("get_work_order_assignees", {
          target_organization_id: organizationId,
        }),
    canManage
      ? supabase
          .from("customers")
          .select(
            "id, display_name, company_name, phone, email, status, archived_at",
          )
          .eq("organization_id", organizationId)
          .eq("status", "active")
          .is("archived_at", null)
          .order("display_name", { ascending: true })
      : Promise.resolve({ data: [] as CustomerRow[], error: null }),
    canManage
      ? supabase
          .from("customer_addresses")
          .select(
            "id, customer_id, label, address_line_1, address_line_2, city, province, postal_code, country_code, is_primary",
          )
          .eq("organization_id", organizationId)
          .order("is_primary", { ascending: false })
      : Promise.resolve({ data: [] as CustomerAddressRow[], error: null }),
  ]);

  if (
    customerResult.error ||
    addressResult.error ||
    itemsResult.error ||
    attachmentsResult.error ||
    warehousesResult.error ||
    productsResult.error ||
    assigneesResult.error ||
    activeCustomersResult.error ||
    allAddressesResult.error
  ) {
    return {
      ok: false,
      message: SAFE_WORK_ORDER_DETAIL_ERROR,
    };
  }

  const customerRow = customerResult.data as CustomerRow | null;
  const addressRow = addressResult.data as CustomerAddressRow | null;

  const warehouseRows = (warehousesResult.data ?? []) as WarehouseRow[];
  const warehouseMap = new Map(warehouseRows.map((wh) => [wh.id, wh]));
  const activeWarehouses: WorkOrderWarehouseOption[] = warehouseRows
    .filter((wh) => wh.is_active)
    .map((wh) => ({
      id: wh.id,
      name: wh.name,
      code: wh.code,
    }));

  const products: WorkOrderProductOption[] = (
    (productsResult.data ?? []) as ProductRow[]
  ).map((prod) => ({
    id: prod.id,
    name: prod.name,
    sku: prod.sku,
    unit: prod.unit,
  }));

  const assignees: WorkOrderAssigneeOption[] = (
    (assigneesResult.data ?? []) as AssigneeRow[]
  ).map((row) => ({
    userId: row.user_id,
    email: row.email,
    role: row.role,
  }));

  let assignedToEmail: string | null = null;
  if (workOrderRow.assigned_to) {
    if (!isTechnician) {
      assignedToEmail =
        assignees.find((a) => a.userId === workOrderRow.assigned_to)?.email ??
        null;
    } else if (userEmail) {
      if (!userId || workOrderRow.assigned_to === userId) {
        assignedToEmail = userEmail;
      }
    }
  }

  const items: WorkOrderItemView[] = (
    (itemsResult.data ?? []) as WorkOrderItemRow[]
  ).map((row) => {
    const warehouse = warehouseMap.get(row.warehouse_id);

    return {
      id: row.id,
      workOrderId: row.work_order_id,
      productId: row.product_id,
      warehouseId: row.warehouse_id,
      warehouseName: warehouse?.name ?? "Unknown Warehouse",
      warehouseCode: warehouse?.code ?? "—",
      nameSnapshot: row.name_snapshot,
      unitSnapshot: row.unit_snapshot,
      quantity: Number(row.quantity),
      inventoryTransactionId: row.inventory_transaction_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  });

  const attachmentRows = (attachmentsResult.data ??
    []) as WorkOrderAttachmentRow[];
  const signedUrlMap = new Map<string, string | null>();

  if (attachmentRows.length > 0) {
    const paths = attachmentRows.map((row) => row.storage_path);
    const { data: signedData, error: signedError } = await supabase.storage
      .from(WORK_ORDER_ATTACHMENTS_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    if (!signedError && signedData) {
      signedData.forEach((entry, index) => {
        const key = entry.path ?? paths[index];
        if (key) {
          signedUrlMap.set(key, entry.error ? null : entry.signedUrl);
        }
      });
    }
  }

  const attachments: WorkOrderAttachmentView[] = attachmentRows.map((row) => ({
    id: row.id,
    workOrderId: row.work_order_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    attachmentType: toWorkOrderAttachmentType(row.attachment_type),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    signedUrl: signedUrlMap.get(row.storage_path) ?? null,
  }));

  const activeCustomers: WorkOrderCustomerOption[] = (
    (activeCustomersResult.data ?? []) as CustomerRow[]
  ).map((c) => ({
    id: c.id,
    displayName: c.display_name,
    companyName: c.company_name,
  }));

  const activeCustomerIds = new Set(activeCustomers.map((c) => c.id));
  const addresses: WorkOrderAddressOption[] = (
    (allAddressesResult.data ?? []) as CustomerAddressRow[]
  )
    .filter((addr) => activeCustomerIds.has(addr.customer_id))
    .map(toWorkOrderAddressOption);

  return {
    ok: true,
    data: {
      workOrder: {
        id: workOrderRow.id,
        organizationId: workOrderRow.organization_id,
        workOrderNumber: workOrderRow.work_order_number,
        customerId: workOrderRow.customer_id,
        customerName: customerRow?.display_name ?? "Customer",
        customerCompanyName: customerRow?.company_name ?? null,
        customerPhone: customerRow?.phone ?? null,
        customerEmail: customerRow?.email ?? null,
        customerAddressId: workOrderRow.customer_address_id,
        customerAddress: addressRow
          ? toWorkOrderAddressOption(addressRow)
          : null,
        workType: toWorkOrderType(workOrderRow.work_type),
        priority: toWorkOrderPriority(workOrderRow.priority),
        status: toWorkOrderStatus(workOrderRow.status),
        assignedTo: workOrderRow.assigned_to,
        assignedToEmail,
        scheduledStart: workOrderRow.scheduled_start,
        scheduledEnd: workOrderRow.scheduled_end,
        description: workOrderRow.description,
        completionNotes: workOrderRow.completion_notes,
        cancellationReason: workOrderRow.cancellation_reason,
        startedAt: workOrderRow.started_at,
        completedAt: workOrderRow.completed_at,
        cancelledAt: workOrderRow.cancelled_at,
        createdBy: workOrderRow.created_by,
        createdAt: workOrderRow.created_at,
        updatedAt: workOrderRow.updated_at,
        items,
        attachments,
      },
      warehouses: activeWarehouses,
      products,
      customers: activeCustomers,
      addresses,
      assignees,
    },
  };
}
