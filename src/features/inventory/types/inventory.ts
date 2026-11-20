export type InventoryStockFilter = "all" | "low_stock";

export type WarehouseItem = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryProductOption = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  minimumStock: number | null;
  trackInventory: boolean;
  isActive: boolean;
};

export type InventoryBalanceItem = {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  warehouseIsActive: boolean;
  productId: string;
  productName: string;
  productSku: string | null;
  productUnit: string;
  productIsActive: boolean;
  minimumStock: number | null;
  quantity: number;
  isLowStock: boolean;
  updatedAt: string;
};

export type InventoryLedgerItem = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  productId: string;
  productName: string;
  productSku: string | null;
  productUnit: string;
  transactionType: string;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string | null;
  createdAt: string;
};

export type InventoryFilters = {
  search: string;
  warehouseId: string;
  stockFilter: InventoryStockFilter;
  page: number;
};

export type InventoryOverviewData = {
  filters: InventoryFilters;
  warehouses: WarehouseItem[];
  activeWarehouses: WarehouseItem[];
  adjustableProducts: InventoryProductOption[];
  balances: InventoryBalanceItem[];
  ledger: InventoryLedgerItem[];
  summary: {
    activeWarehouseCount: number;
    trackedBalanceCount: number;
    lowStockCount: number;
  };
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
