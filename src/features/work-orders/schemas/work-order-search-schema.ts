import { z } from "zod";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrderFilters,
} from "../types/work-order";

const statusFilterSchema = z
  .enum(["all", ...WORK_ORDER_STATUSES])
  .optional()
  .catch("all")
  .transform((value) => value ?? "all");

const priorityFilterSchema = z
  .enum(["all", ...WORK_ORDER_PRIORITIES])
  .optional()
  .catch("all")
  .transform((value) => value ?? "all");

const assignedToFilterSchema = z
  .union([
    z.literal(""),
    z.literal("all"),
    z.literal("unassigned"),
    z.literal("me"),
    z.string().uuid(),
  ])
  .optional()
  .catch("all")
  .transform((value) => (!value ? "all" : value));

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

export const workOrderSearchSchema = z.object({
  search: searchSchema,
  status: statusFilterSchema,
  priority: priorityFilterSchema,
  assignedTo: assignedToFilterSchema,
  page: pageSchema,
});

export type WorkOrderSearchInput = {
  search?: unknown;
  status?: unknown;
  priority?: unknown;
  assignedTo?: unknown;
  page?: unknown;
};

export function parseWorkOrderSearchParams(
  searchParams: WorkOrderSearchInput,
): WorkOrderFilters {
  const parsed = workOrderSearchSchema.parse(searchParams);

  return {
    search: parsed.search,
    status: parsed.status,
    priority: parsed.priority,
    assignedTo: parsed.assignedTo,
    page: parsed.page,
  };
}
