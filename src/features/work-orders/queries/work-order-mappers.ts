import type { Database } from "@/types/database-generated";
import {
  WORK_ORDER_ATTACHMENT_TYPES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_TYPES,
  type WorkOrderAddressOption,
  type WorkOrderAttachmentType,
  type WorkOrderPriority,
  type WorkOrderStatus,
  type WorkOrderType,
} from "../types/work-order";

export type CustomerAddressRow = Pick<
  Database["public"]["Tables"]["customer_addresses"]["Row"],
  | "id"
  | "customer_id"
  | "label"
  | "address_line_1"
  | "address_line_2"
  | "city"
  | "province"
  | "postal_code"
  | "country_code"
  | "is_primary"
>;

export function toWorkOrderType(value: string): WorkOrderType {
  return (WORK_ORDER_TYPES as readonly string[]).includes(value)
    ? (value as WorkOrderType)
    : "general";
}

export function toWorkOrderPriority(value: string): WorkOrderPriority {
  return (WORK_ORDER_PRIORITIES as readonly string[]).includes(value)
    ? (value as WorkOrderPriority)
    : "normal";
}

export function toWorkOrderStatus(value: string): WorkOrderStatus {
  return (WORK_ORDER_STATUSES as readonly string[]).includes(value)
    ? (value as WorkOrderStatus)
    : "draft";
}

export function toWorkOrderAttachmentType(
  value: string,
): WorkOrderAttachmentType {
  return (WORK_ORDER_ATTACHMENT_TYPES as readonly string[]).includes(value)
    ? (value as WorkOrderAttachmentType)
    : "other";
}

export function toWorkOrderAddressOption(
  row: CustomerAddressRow,
): WorkOrderAddressOption {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    countryCode: row.country_code,
    isPrimary: row.is_primary,
  };
}

export function formatAddressSummary(
  address: WorkOrderAddressOption | null | undefined,
): string | null {
  if (!address) {
    return null;
  }

  return address.city
    ? `${address.addressLine1}, ${address.city}`
    : address.addressLine1;
}
