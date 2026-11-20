import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type { ProductDetail, ProductType } from "../types/product";

const BASE_DETAIL_COLUMNS =
  "id, product_type, name, sku, category_id, unit, description, selling_price, track_inventory, minimum_stock, is_active, created_at, updated_at, archived_at";

const WITH_COST_DETAIL_COLUMNS = `${BASE_DETAIL_COLUMNS}, cost_price`;

type ProductDetailRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "product_type"
  | "name"
  | "sku"
  | "category_id"
  | "unit"
  | "description"
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

export async function getProductDetail(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  productId: string,
  options: { canViewCost: boolean },
): Promise<{ ok: true; data: ProductDetail } | { ok: false; message: string }> {
  const selectColumns = options.canViewCost
    ? WITH_COST_DETAIL_COLUMNS
    : BASE_DETAIL_COLUMNS;

  const { data, error } = await supabase
    .from("products")
    .select(selectColumns)
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .maybeSingle();

  const row = data as unknown as ProductDetailRow | null;

  if (error || !row) {
    return { ok: false, message: "Product not found." };
  }

  let categoryName: string | null = null;
  if (row.category_id) {
    const { data: cat } = await supabase
      .from("product_categories")
      .select("name")
      .eq("organization_id", organizationId)
      .eq("id", row.category_id)
      .maybeSingle();
    categoryName = cat?.name ?? null;
  }

  const isArchived = !row.is_active || row.archived_at !== null;
  const productType: ProductType =
    row.product_type === "service" ? "service" : "goods";

  return {
    ok: true,
    data: {
      id: row.id,
      productType,
      name: row.name,
      sku: row.sku,
      categoryId: row.category_id,
      categoryName,
      unit: row.unit,
      description: row.description,
      costPrice:
        options.canViewCost &&
        row.cost_price !== undefined &&
        row.cost_price !== null
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
    },
  };
}
