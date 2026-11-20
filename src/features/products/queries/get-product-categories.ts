import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type { ProductCategory } from "../types/product";

export type ProductCategoriesResult =
  | { ok: true; data: ProductCategory[] }
  | { ok: false; message: string };

export async function getProductCategories(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<ProductCategoriesResult> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name, parent_id, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    return {
      ok: false,
      message: "Unable to load product categories. Try again.",
    };
  }

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}
