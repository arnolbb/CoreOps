import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import { getProductCategories } from "./get-product-categories";
import type {
  ProductListData,
  ProductListFilters,
  ProductListItem,
  ProductType,
} from "../types/product";

export const PRODUCT_LIST_PAGE_SIZE = 10;

const safeProductListError = "Unable to load products. Try again.";

const BASE_PRODUCT_COLUMNS =
  "id, product_type, name, sku, category_id, unit, selling_price, track_inventory, minimum_stock, is_active, created_at, updated_at, archived_at";

const WITH_COST_PRODUCT_COLUMNS = `${BASE_PRODUCT_COLUMNS}, cost_price`;

type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "product_type"
  | "name"
  | "sku"
  | "category_id"
  | "unit"
  | "selling_price"
  | "track_inventory"
  | "minimum_stock"
  | "is_active"
  | "created_at"
  | "updated_at"
  | "archived_at"
> & {
  cost_price?: number | null;
};

export type ProductListResult =
  | {
      ok: true;
      data: ProductListData;
    }
  | {
      ok: false;
      message: string;
    };

function sanitizePostgrestSearch(value: string) {
  return value
    .replace(/[%*,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toProductListItem(
  row: ProductRow,
  categoryMap: Map<string, string>,
  canViewCost: boolean,
): ProductListItem {
  const isArchived = !row.is_active || row.archived_at !== null;
  const productType: ProductType =
    row.product_type === "service" ? "service" : "goods";

  return {
    id: row.id,
    productType,
    name: row.name,
    sku: row.sku,
    categoryId: row.category_id,
    categoryName: row.category_id
      ? (categoryMap.get(row.category_id) ?? null)
      : null,
    unit: row.unit,
    costPrice:
      canViewCost && row.cost_price !== undefined && row.cost_price !== null
        ? Number(row.cost_price)
        : null,
    sellingPrice: Number(row.selling_price),
    trackInventory: row.track_inventory,
    minimumStock:
      row.minimum_stock !== null && row.minimum_stock !== undefined
        ? Number(row.minimum_stock)
        : null,
    isActive: row.is_active,
    status: isArchived ? "archived" : "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export async function getProductList(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  filters: ProductListFilters,
  options: { canViewCost: boolean },
): Promise<ProductListResult> {
  const page = Math.max(filters.page, 1);
  const from = (page - 1) * PRODUCT_LIST_PAGE_SIZE;
  const to = from + PRODUCT_LIST_PAGE_SIZE - 1;
  const search = sanitizePostgrestSearch(filters.search);

  const [orgResult, categoriesResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("currency_code")
      .eq("id", organizationId)
      .maybeSingle(),
    getProductCategories(supabase, organizationId),
  ]);

  const categories = categoriesResult.ok ? categoriesResult.data : [];
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));
  const currencyCode = orgResult.data?.currency_code ?? "USD";

  const selectColumns = options.canViewCost
    ? WITH_COST_PRODUCT_COLUMNS
    : BASE_PRODUCT_COLUMNS;

  let query = supabase
    .from("products")
    .select(selectColumns, { count: "exact" })
    .eq("organization_id", organizationId);

  if (filters.status === "active") {
    query = query.eq("is_active", true).is("archived_at", null);
  } else if (filters.status === "archived") {
    query = query.or("is_active.eq.false,archived_at.not.is.null");
  }

  if (filters.productType !== "all") {
    query = query.eq("product_type", filters.productType);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (search.length > 0) {
    const searchPattern = `*${search}*`;
    query = query.or(
      [`name.ilike.${searchPattern}`, `sku.ilike.${searchPattern}`].join(","),
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { ok: false, message: safeProductListError };
  }

  const rows = (data ?? []) as unknown as ProductRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(
    Math.ceil(totalCount / PRODUCT_LIST_PAGE_SIZE),
    1,
  );

  return {
    ok: true,
    data: {
      filters: { ...filters, page },
      items: rows.map((row) =>
        toProductListItem(row, categoryMap, options.canViewCost),
      ),
      categories,
      currencyCode,
      pageSize: PRODUCT_LIST_PAGE_SIZE,
      totalCount,
      totalPages,
    },
  };
}
