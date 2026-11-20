import { z } from "zod";
import type { InventoryFilters } from "../types/inventory";

const stockFilterSchema = z
  .enum(["all", "low_stock"])
  .optional()
  .catch("all")
  .transform((value) => value ?? "all");

const warehouseIdFilterSchema = z
  .union([z.literal(""), z.string().uuid()])
  .optional()
  .catch("")
  .transform((value) => value ?? "");

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

export const inventorySearchSchema = z.object({
  search: searchSchema,
  warehouseId: warehouseIdFilterSchema,
  stockFilter: stockFilterSchema,
  page: pageSchema,
});

export type InventorySearchInput = {
  search?: unknown;
  warehouseId?: unknown;
  stockFilter?: unknown;
  page?: unknown;
};

export function parseInventorySearchParams(
  searchParams: InventorySearchInput,
): InventoryFilters {
  const parsed = inventorySearchSchema.parse(searchParams);

  return {
    search: parsed.search,
    warehouseId: parsed.warehouseId,
    stockFilter: parsed.stockFilter,
    page: parsed.page,
  };
}
