import { z } from "zod";
import type { SalesFilters } from "../types/sales";

const salesStatusFilterSchema = z
  .enum(["all", "draft", "confirmed", "completed", "cancelled"])
  .optional()
  .catch("all")
  .transform((value) => value ?? "all");

const salesPaymentStatusFilterSchema = z
  .enum(["all", "unpaid", "partially_paid", "paid"])
  .optional()
  .catch("all")
  .transform((value) => value ?? "all");

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

export const salesSearchSchema = z.object({
  search: searchSchema,
  status: salesStatusFilterSchema,
  paymentStatus: salesPaymentStatusFilterSchema,
  page: pageSchema,
});

export type SalesSearchInput = {
  search?: unknown;
  status?: unknown;
  paymentStatus?: unknown;
  page?: unknown;
};

export function parseSalesSearchParams(
  searchParams: SalesSearchInput,
): SalesFilters {
  const parsed = salesSearchSchema.parse(searchParams);

  return {
    search: parsed.search,
    status: parsed.status,
    paymentStatus: parsed.paymentStatus,
    page: parsed.page,
  };
}
