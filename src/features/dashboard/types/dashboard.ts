export type DashboardCapabilities = {
  canReadCustomers: boolean;
  canReadSales: boolean;
  canViewFinancialTotals: boolean;
  canReadInventory: boolean;
  canReadWorkOrders: boolean;
  canViewAuditActivity: boolean;
};

export type DashboardLowStockItem = {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  productId: string;
  productName: string;
  productSku: string | null;
  productUnit: string;
  quantity: number;
  minimumStock: number;
  buffer: number;
};

export type DashboardActiveWorkOrderItem = {
  id: string;
  workOrderNumber: string;
  customerName: string;
  workType: string;
  priority: string;
  status: string;
  scheduledStart: string | null;
  createdAt: string;
};

export type DashboardActivityCategory =
  | "audit"
  | "work_order"
  | "inventory"
  | "sales";

export type DashboardActivityItem = {
  id: string;
  summary: string;
  category: DashboardActivityCategory;
  actorLabel: string | null;
  createdAt: string;
};

export type DashboardOverviewData = {
  organization: {
    id: string;
    name: string;
    currencyCode: string;
    timezone: string;
    resolvedTimezone: string;
  };
  role: string;
  capabilities: DashboardCapabilities;
  monthPeriod: {
    label: string;
    startIso: string;
    endIso: string;
  };
  kpis: {
    activeCustomerCount: number | null;
    monthlySalesCount: number | null;
    monthlySalesTotal: number | null;
    outstandingOrdersCount: number | null;
    outstandingTotal: number | null;
    lowStockCount: number | null;
    activeWorkOrdersCount: number | null;
  };
  lowStockItems: DashboardLowStockItem[];
  activeWorkOrders: DashboardActiveWorkOrderItem[];
  recentActivity: DashboardActivityItem[];
  isEmptyOrganization: boolean;
};
