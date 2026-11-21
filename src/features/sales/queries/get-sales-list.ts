import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type {
  SalesCustomerOption,
  SalesFilters,
  SalesOrderListItem,
  SalesOrderStatus,
  SalesOverviewData,
  SalesPaymentStatus,
  SalesProductOption,
  SalesWarehouseOption,
} from "../types/sales";

export const SALES_LIST_PAGE_SIZE = 10;

const SAFE_SALES_LIST_ERROR = "Unable to load sales orders. Try again.";

type CustomerLookupRow = Pick<
  Database["public"]["Tables"]["customers"]["Row"],
  "id" | "display_name" | "company_name" | "status" | "archived_at"
>;

type ProductOptionRow = Pick<
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

type WarehouseLookupRow = Pick<
  Database["public"]["Tables"]["warehouses"]["Row"],
  "id" | "name" | "code" | "is_active"
>;

type SalesOrderSummaryRow = Pick<
  Database["public"]["Tables"]["sales_orders"]["Row"],
  "status" | "grand_total" | "paid_total"
>;

type SalesOrderRow = Pick<
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
  | "created_at"
  | "updated_at"
  | "confirmed_at"
  | "completed_at"
  | "cancelled_at"
>;

export type SalesOverviewResult =
  | {
      ok: true;
      data: SalesOverviewData;
    }
  | {
      ok: false;
      message: string;
    };

function sanitizePostgrestSearch(value: string): string {
  return value
    .replace(/[%*,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function toSalesOrderListItem(
  row: SalesOrderRow,
  customerMap: Map<string, CustomerLookupRow>,
  warehouseMap: Map<string, WarehouseLookupRow>,
): SalesOrderListItem {
  const customer = customerMap.get(row.customer_id);
  const warehouse = row.warehouse_id
    ? warehouseMap.get(row.warehouse_id)
    : undefined;
  const grandTotal = Number(row.grand_total);
  const paidTotal = Number(row.paid_total);

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerName: customer?.display_name ?? "Unknown Customer",
    customerCompanyName: customer?.company_name ?? null,
    warehouseId: row.warehouse_id,
    warehouseName: warehouse?.name ?? null,
    warehouseCode: warehouse?.code ?? null,
    status: normalizeOrderStatus(row.status),
    paymentStatus: normalizePaymentStatus(row.payment_status),
    currencyCode: row.currency_code,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    taxTotal: Number(row.tax_total),
    grandTotal,
    paidTotal,
    outstandingBalance: Math.max(roundMoney(grandTotal - paidTotal), 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  };
}

export async function getSalesOverview(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  filters: SalesFilters,
): Promise<SalesOverviewResult> {
  const page = Math.max(filters.page, 1);
  const from = (page - 1) * SALES_LIST_PAGE_SIZE;
  const to = from + SALES_LIST_PAGE_SIZE - 1;
  const search = sanitizePostgrestSearch(filters.search);

  const [
    orgResult,
    customersResult,
    productsResult,
    warehousesResult,
    summaryResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("currency_code, timezone, name")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id, display_name, company_name, status, archived_at")
      .eq("organization_id", organizationId)
      .order("display_name", { ascending: true }),
    supabase
      .from("products")
      .select(
        "id, product_type, name, sku, unit, selling_price, track_inventory, is_active, archived_at",
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("warehouses")
      .select("id, name, code, is_active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("sales_orders")
      .select("status, grand_total, paid_total")
      .eq("organization_id", organizationId),
  ]);

  if (
    orgResult.error ||
    customersResult.error ||
    productsResult.error ||
    warehousesResult.error ||
    summaryResult.error
  ) {
    return { ok: false, message: SAFE_SALES_LIST_ERROR };
  }

  const currencyCode = orgResult.data?.currency_code ?? "USD";
  const timezone = orgResult.data?.timezone ?? "UTC";

  const customerRows = (customersResult.data ?? []) as CustomerLookupRow[];
  const customerMap = new Map(customerRows.map((row) => [row.id, row]));

  const customerOptions: SalesCustomerOption[] = customerRows
    .filter((row) => row.status === "active" && row.archived_at === null)
    .map((row) => ({
      id: row.id,
      displayName: row.display_name,
      companyName: row.company_name,
      status: row.status,
    }));

  const productRows = (productsResult.data ?? []) as ProductOptionRow[];
  const productOptions: SalesProductOption[] = productRows.map((row) => ({
    id: row.id,
    productType: row.product_type === "service" ? "service" : "goods",
    name: row.name,
    sku: row.sku,
    unit: row.unit,
    sellingPrice: Number(row.selling_price),
    trackInventory: row.track_inventory,
  }));

  const warehouseRows = (warehousesResult.data ?? []) as WarehouseLookupRow[];
  const warehouseMap = new Map(warehouseRows.map((row) => [row.id, row]));
  const warehouseOptions: SalesWarehouseOption[] = warehouseRows
    .filter((row) => row.is_active)
    .map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
    }));

  const summaryRows = (summaryResult.data ?? []) as SalesOrderSummaryRow[];
  let confirmedRevenue = 0;
  let outstandingBalance = 0;
  for (const row of summaryRows) {
    if (row.status === "confirmed" || row.status === "completed") {
      const grandTotal = Number(row.grand_total);
      const paidTotal = Number(row.paid_total);
      confirmedRevenue += grandTotal;
      outstandingBalance += Math.max(grandTotal - paidTotal, 0);
    }
  }

  const lowerSearch = search.toLowerCase();
  const matchingCustomerIds =
    search.length > 0
      ? customerRows
          .filter((row) => {
            const display = row.display_name.toLowerCase();
            const company = (row.company_name ?? "").toLowerCase();
            return (
              display.includes(lowerSearch) || company.includes(lowerSearch)
            );
          })
          .map((row) => row.id)
      : [];

  let ordersQuery = supabase
    .from("sales_orders")
    .select(
      "id, order_number, customer_id, warehouse_id, status, payment_status, currency_code, subtotal, discount_total, tax_total, grand_total, paid_total, created_at, updated_at, confirmed_at, completed_at, cancelled_at",
      { count: "exact" },
    )
    .eq("organization_id", organizationId);

  if (filters.status !== "all") {
    ordersQuery = ordersQuery.eq("status", filters.status);
  }

  if (filters.paymentStatus !== "all") {
    ordersQuery = ordersQuery.eq("payment_status", filters.paymentStatus);
  }

  const useInMemorySearchFilter =
    search.length > 0 && matchingCustomerIds.length > 100;

  if (search.length > 0 && !useInMemorySearchFilter) {
    const searchPattern = `*${search}*`;
    const orClauses = [`order_number.ilike.${searchPattern}`];
    if (matchingCustomerIds.length > 0) {
      orClauses.push(`customer_id.in.(${matchingCustomerIds.join(",")})`);
    }
    ordersQuery = ordersQuery.or(orClauses.join(","));
  }

  let orderRows: SalesOrderRow[] = [];
  let totalCount = 0;

  if (useInMemorySearchFilter) {
    const { data, error } = await ordersQuery.order("created_at", {
      ascending: false,
    });

    if (error) {
      return { ok: false, message: SAFE_SALES_LIST_ERROR };
    }

    const matchingCustomerSet = new Set(matchingCustomerIds);
    const filtered = ((data ?? []) as SalesOrderRow[]).filter(
      (row) =>
        row.order_number.toLowerCase().includes(lowerSearch) ||
        matchingCustomerSet.has(row.customer_id),
    );
    totalCount = filtered.length;
    orderRows = filtered.slice(from, to + 1);
  } else {
    const { data, error, count } = await ordersQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return { ok: false, message: SAFE_SALES_LIST_ERROR };
    }

    orderRows = (data ?? []) as SalesOrderRow[];
    totalCount = count ?? 0;
  }

  const totalPages = Math.max(Math.ceil(totalCount / SALES_LIST_PAGE_SIZE), 1);

  return {
    ok: true,
    data: {
      filters: { ...filters, page },
      items: orderRows.map((row) =>
        toSalesOrderListItem(row, customerMap, warehouseMap),
      ),
      summary: {
        totalOrders: summaryRows.length,
        confirmedRevenue: roundMoney(confirmedRevenue),
        outstandingBalance: roundMoney(outstandingBalance),
      },
      currencyCode,
      timezone,
      formOptions: {
        customers: customerOptions,
        products: productOptions,
        warehouses: warehouseOptions,
      },
      pageSize: SALES_LIST_PAGE_SIZE,
      totalCount,
      totalPages,
    },
  };
}
