import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  warehouseId: z.string().uuid("Invalid warehouse selection"),
  productId: z.string().uuid("Invalid product selection"),
  adjustmentType: z.enum(["opening_stock", "adjustment_in", "adjustment_out"], {
    message: "Invalid adjustment type",
  }),
  quantity: z
    .number({ message: "Quantity must be a number" })
    .positive("Quantity must be greater than zero")
    .max(1000000000, "Quantity is too large"),
  reason: z
    .string()
    .trim()
    .max(2000, "Reason must be at most 2000 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  idempotencyKey: z
    .string()
    .trim()
    .max(128, "Idempotency key too long")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
});

export type StockAdjustmentValues = z.input<typeof stockAdjustmentSchema>;
export type StockAdjustmentParsedValues = z.output<
  typeof stockAdjustmentSchema
>;
