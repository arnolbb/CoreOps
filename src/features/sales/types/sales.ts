export type SalesOrderStatus =
  | "draft"
  | "confirmed"
  | "completed"
  | "cancelled";

export type SalesPaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "refunded";

export type SalesPaymentMethod =
  | "cash"
  | "bank_transfer"
  | "credit_card"
  | "other";

export type SalesOrderItemType = "goods" | "service" | "custom";

export type SalesStatusFilter = "all" | SalesOrderStatus;

export type SalesPaymentStatusFilter =
  | "all"
  | "unpaid"
  | "partially_paid"
  | "paid";

export type SalesFilters = {
  search: string;
  status: SalesStatusFilter;
  paymentStatus: SalesPaymentStatusFilter;
  page: number;
};

export type SalesCustomerOption = {
  id: string;
  displayName: string;
  companyName: string | null;
  status: string;
};

export type SalesProductOption = {
  id: string;
  productType: "goods" | "service";
  name: string;
  sku: string | null;
  unit: string;
  sellingPrice: number;
  trackInventory: boolean;
};

export type SalesWarehouseOption = {
  id: string;
  name: string;
  code: string;
};

export type SalesFormOptions = {
  customers: SalesCustomerOption[];
  products: SalesProductOption[];
  warehouses: SalesWarehouseOption[];
};

export type SalesOrderListItem = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerCompanyName: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  warehouseCode: string | null;
  status: SalesOrderStatus;
  paymentStatus: SalesPaymentStatus;
  currencyCode: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidTotal: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type SalesSummaryMetrics = {
  totalOrders: number;
  confirmedRevenue: number;
  outstandingBalance: number;
};

export type SalesOverviewData = {
  filters: SalesFilters;
  items: SalesOrderListItem[];
  summary: SalesSummaryMetrics;
  currencyCode: string;
  timezone: string;
  formOptions: SalesFormOptions;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type SalesOrderItemView = {
  id: string;
  productId: string | null;
  itemType: SalesOrderItemType;
  nameSnapshot: string;
  skuSnapshot: string | null;
  unitSnapshot: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  trackInventory: boolean;
};

export type SalesPaymentView = {
  id: string;
  amount: number;
  paymentMethod: SalesPaymentMethod;
  reference: string | null;
  status: "completed" | "voided";
  paidAt: string;
  notes: string | null;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
};

export type SalesOrderDetail = {
  id: string;
  orderNumber: string;
  status: SalesOrderStatus;
  paymentStatus: SalesPaymentStatus;
  currencyCode: string;
  organizationName: string;
  organizationTimezone: string;
  customer: {
    id: string;
    displayName: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    status: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  } | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidTotal: number;
  outstandingBalance: number;
  notes: string | null;
  cancellationReason: string | null;
  hasTrackedGoods: boolean;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: SalesOrderItemView[];
  payments: SalesPaymentView[];
  activeWarehouses: SalesWarehouseOption[];
  formOptions: SalesFormOptions | null;
};
