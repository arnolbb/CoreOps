import { z } from "zod";

export const warehouseFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Warehouse name is required")
    .max(100, "Warehouse name must be at most 100 characters"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Warehouse code is required")
    .max(30, "Warehouse code must be at most 30 characters"),
  address: z
    .string()
    .trim()
    .max(500, "Address must be at most 500 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
});

export type WarehouseFormValues = z.input<typeof warehouseFormSchema>;
export type WarehouseFormParsedValues = z.output<typeof warehouseFormSchema>;
