import { z } from "zod";
import type { ProductListFilters } from "../types/product";

const productStatusFilterSchema = z
  .enum(["active", "archived", "all"])
  .optional()
  .catch("active")
  .transform((status) => status ?? "active");

const productTypeFilterSchema = z
  .enum(["all", "goods", "service"])
  .optional()
  .catch("all")
  .transform((productType) => productType ?? "all");

const categoryIdFilterSchema = z
  .union([z.literal(""), z.string().uuid()])
  .optional()
  .catch("")
  .transform((categoryId) => categoryId ?? "");

const pageSchema = z.coerce
  .number()
  .int()
  .min(1)
  .optional()
  .catch(1)
  .transform((page) => page ?? 1);

const searchSchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .catch("")
  .transform((search) => search ?? "");

export const productListSearchSchema = z.object({
  search: searchSchema,
  status: productStatusFilterSchema,
  productType: productTypeFilterSchema,
  categoryId: categoryIdFilterSchema,
  page: pageSchema,
});

export type ProductListSearchInput = {
  search?: unknown;
  status?: unknown;
  productType?: unknown;
  categoryId?: unknown;
  page?: unknown;
};

export function parseProductListSearchParams(
  searchParams: ProductListSearchInput,
): ProductListFilters {
  const parsed = productListSearchSchema.parse(searchParams);

  return {
    search: parsed.search,
    status: parsed.status,
    productType: parsed.productType,
    categoryId: parsed.categoryId,
    page: parsed.page,
  };
}
