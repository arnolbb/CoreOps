import { z } from "zod";
import type { CustomerListFilters } from "../types/customer";

const customerStatusFilterSchema = z
  .enum(["active", "archived", "all"])
  .optional()
  .catch("active")
  .transform((status) => status ?? "active");

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

export const customerListSearchSchema = z.object({
  search: searchSchema,
  status: customerStatusFilterSchema,
  page: pageSchema,
});

export type CustomerListSearchInput = {
  search?: unknown;
  status?: unknown;
  page?: unknown;
};

export function parseCustomerListSearchParams(
  searchParams: CustomerListSearchInput,
): CustomerListFilters {
  const parsed = customerListSearchSchema.parse(searchParams);

  return {
    search: parsed.search,
    status: parsed.status,
    page: parsed.page,
  };
}
