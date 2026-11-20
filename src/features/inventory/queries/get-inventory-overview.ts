import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type {
  InventoryBalanceItem,
  InventoryFilters,
  InventoryLedgerItem,
  InventoryOverviewData,
  InventoryProductOption,
  WarehouseItem,
} from "../types/inventory";

export const INVENTORY_PAGE_SIZE = 10;
export const INVENTORY_LEDGER_LIMIT = 20;

const SAFE_INVENTORY_LOAD_ERROR = "Unable to load inventory. Try again.";

export type InventoryOverviewResult =
  | {
      ok: true;
      data: InventoryOverviewData;
    }
  | {
      ok: false;
      message: string;
    };

export async function getInventoryOverview(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  filters: InventoryFilters,
): Promise<InventoryOverviewResult> {
  let balancesQuery = supabase
    .from("inventory_balances")
    .select("warehouse_id, product_id, quantity, updated_at")
    .eq("organization_id", organizationId);

  if (filters.warehouseId) {
    balancesQuery = balancesQuery.eq("warehouse_id", filters.warehouseId);
  }

  let ledgerQuery = supabase
    .from("inventory_transactions")
    .select(
      "id, warehouse_id, product_id, transaction_type, quantity_delta, quantity_before, quantity_after, reason, created_at",
    )
    .eq("organization_id", organizationId);

  if (filters.warehouseId) {
    ledgerQuery = ledgerQuery.eq("warehouse_id", filters.warehouseId);
  }

  const [warehousesResult, productsResult, balancesResult, ledgerResult] =
    await Promise.all([
      supabase
        .from("warehouses")
        .select("id, name, code, address, is_active, created_at, updated_at")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true }),
      supabase
        .from("products")
        .select(
          "id, name, sku, unit, minimum_stock, track_inventory, is_active, archived_at",
        )
        .eq("organization_id", organizationId)
        .order("name", { ascending: true }),
      balancesQuery.order("updated_at", { ascending: false }),
      ledgerQuery
        .order("created_at", { ascending: false })
        .limit(INVENTORY_LEDGER_LIMIT),
    ]);

  if (
    warehousesResult.error ||
    productsResult.error ||
    balancesResult.error ||
    ledgerResult.error
  ) {
    return {
      ok: false,
      message: SAFE_INVENTORY_LOAD_ERROR,
    };
  }

  const warehouses: WarehouseItem[] = (warehousesResult.data ?? []).map(
    (row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      address: row.address,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  );

  const warehouseMap = new Map(warehouses.map((wh) => [wh.id, wh]));

  const products = productsResult.data ?? [];
  const productMap = new Map(products.map((prod) => [prod.id, prod]));

  const adjustableProducts: InventoryProductOption[] = products
    .filter(
      (prod) =>
        prod.is_active && prod.archived_at === null && prod.track_inventory,
    )
    .map((prod) => ({
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      unit: prod.unit,
      minimumStock:
        prod.minimum_stock !== null && prod.minimum_stock !== undefined
          ? Number(prod.minimum_stock)
          : null,
      trackInventory: prod.track_inventory,
      isActive: prod.is_active,
    }));

  const allBalances: InventoryBalanceItem[] = (balancesResult.data ?? []).map(
    (row) => {
      const warehouse = warehouseMap.get(row.warehouse_id);
      const product = productMap.get(row.product_id);
      const quantity = Number(row.quantity);
      const minimumStock =
        product?.minimum_stock !== null && product?.minimum_stock !== undefined
          ? Number(product.minimum_stock)
          : null;
      const isLowStock = minimumStock !== null && quantity <= minimumStock;

      return {
        warehouseId: row.warehouse_id,
        warehouseName: warehouse?.name ?? "Unknown Warehouse",
        warehouseCode: warehouse?.code ?? "—",
        warehouseIsActive: warehouse?.isActive ?? false,
        productId: row.product_id,
        productName: product?.name ?? "Unknown Product",
        productSku: product?.sku ?? null,
        productUnit: product?.unit ?? "unit",
        productIsActive:
          Boolean(product?.is_active) && product?.archived_at === null,
        minimumStock,
        quantity,
        isLowStock,
        updatedAt: row.updated_at,
      };
    },
  );

  const searchTerm = filters.search.trim().toLowerCase();

  const filteredBalances = allBalances.filter((item) => {
    if (filters.stockFilter === "low_stock" && !item.isLowStock) {
      return false;
    }

    if (searchTerm.length > 0) {
      const haystack = [
        item.productName,
        item.productSku ?? "",
        item.warehouseName,
        item.warehouseCode,
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  const totalCount = filteredBalances.length;
  const totalPages = Math.max(Math.ceil(totalCount / INVENTORY_PAGE_SIZE), 1);
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const start = (page - 1) * INVENTORY_PAGE_SIZE;
  const paginatedBalances = filteredBalances.slice(
    start,
    start + INVENTORY_PAGE_SIZE,
  );

  const ledger: InventoryLedgerItem[] = (ledgerResult.data ?? []).map((row) => {
    const warehouse = warehouseMap.get(row.warehouse_id);
    const product = productMap.get(row.product_id);

    return {
      id: row.id,
      warehouseId: row.warehouse_id,
      warehouseName: warehouse?.name ?? "Unknown Warehouse",
      warehouseCode: warehouse?.code ?? "—",
      productId: row.product_id,
      productName: product?.name ?? "Unknown Product",
      productSku: product?.sku ?? null,
      productUnit: product?.unit ?? "unit",
      transactionType: row.transaction_type,
      quantityDelta: Number(row.quantity_delta),
      quantityBefore: Number(row.quantity_before),
      quantityAfter: Number(row.quantity_after),
      reason: row.reason,
      createdAt: row.created_at,
    };
  });

  const activeWarehouses = warehouses.filter((wh) => wh.isActive);

  return {
    ok: true,
    data: {
      filters: { ...filters, page },
      warehouses,
      activeWarehouses,
      adjustableProducts,
      balances: paginatedBalances,
      ledger,
      summary: {
        activeWarehouseCount: activeWarehouses.length,
        trackedBalanceCount: allBalances.length,
        lowStockCount: allBalances.filter((item) => item.isLowStock).length,
      },
      pageSize: INVENTORY_PAGE_SIZE,
      totalCount,
      totalPages,
    },
  };
}
