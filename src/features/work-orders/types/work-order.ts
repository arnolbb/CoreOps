export const WORK_ORDER_TYPES = [
  "installation",
  "repair",
  "service",
  "maintenance",
  "inspection",
  "delivery_support",
  "general",
] as const;

export type WorkOrderType = (typeof WORK_ORDER_TYPES)[number];

export const WORK_ORDER_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

export const WORK_ORDER_STATUSES = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_ATTACHMENT_TYPES = [
  "photo",
  "document",
  "signature",
  "other",
] as const;

export type WorkOrderAttachmentType =
  (typeof WORK_ORDER_ATTACHMENT_TYPES)[number];

export const WORK_ORDER_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type WorkOrderAllowedMimeType =
  (typeof WORK_ORDER_ALLOWED_MIME_TYPES)[number];

export const WORK_ORDER_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type WorkOrderFilters = {
  search: string;
  status: "all" | WorkOrderStatus;
  priority: "all" | WorkOrderPriority;
  assignedTo: string;
  page: number;
};

export type WorkOrderCustomerOption = {
  id: string;
  displayName: string;
  companyName: string | null;
};

export type WorkOrderAddressOption = {
  id: string;
  customerId: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  isPrimary: boolean;
};

export type WorkOrderAssigneeOption = {
  userId: string;
  email: string;
  role: string;
};

export type WorkOrderWarehouseOption = {
  id: string;
  name: string;
  code: string;
};

export type WorkOrderProductOption = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
};

export type WorkOrderListItem = {
  id: string;
  workOrderNumber: string;
  customerId: string;
  customerName: string;
  customerAddressId: string | null;
  addressSummary: string | null;
  workType: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedTo: string | null;
  assignedToEmail: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkOrderItemView = {
  id: string;
  workOrderId: string;
  productId: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  nameSnapshot: string;
  unitSnapshot: string;
  quantity: number;
  inventoryTransactionId: string | null;
  createdBy: string;
  createdAt: string;
};

export type WorkOrderAttachmentView = {
  id: string;
  workOrderId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  attachmentType: WorkOrderAttachmentType;
  uploadedBy: string;
  createdAt: string;
  signedUrl: string | null;
};

export type WorkOrderDetail = {
  id: string;
  organizationId: string;
  workOrderNumber: string;
  customerId: string;
  customerName: string;
  customerCompanyName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddressId: string | null;
  customerAddress: WorkOrderAddressOption | null;
  workType: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedTo: string | null;
  assignedToEmail: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  description: string;
  completionNotes: string | null;
  cancellationReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: WorkOrderItemView[];
  attachments: WorkOrderAttachmentView[];
};

export type WorkOrderOverviewSummary = {
  totalCount: number;
  inProgressCount: number;
  scheduledCount: number;
};

export type WorkOrderOverviewData = {
  filters: WorkOrderFilters;
  items: WorkOrderListItem[];
  summary: WorkOrderOverviewSummary;
  customers: WorkOrderCustomerOption[];
  addresses: WorkOrderAddressOption[];
  assignees: WorkOrderAssigneeOption[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type WorkOrderDetailData = {
  workOrder: WorkOrderDetail;
  warehouses: WorkOrderWarehouseOption[];
  products: WorkOrderProductOption[];
  customers: WorkOrderCustomerOption[];
  addresses: WorkOrderAddressOption[];
  assignees: WorkOrderAssigneeOption[];
};
