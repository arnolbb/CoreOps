import { z } from "zod";

const MAX_MONETARY_VALUE = 999_999_999_999_999.99;
const MAX_QUANTITY_VALUE = 999_999_999_999_999.999;

function parseNumericInput(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

function hasMaxDecimals(value: number, decimals: number): boolean {
  return Number(value.toFixed(decimals)) === value;
}

function optionalUuidSchema(label: string) {
  return z
    .union([z.literal(""), z.null(), z.string().uuid(`Invalid ${label}`)])
    .optional()
    .transform((val) => (!val ? null : val));
}

function nonNegativeMoneySchema(label: string) {
  return z.preprocess(
    parseNumericInput,
    z
      .number({ message: `${label} must be a valid number` })
      .finite(`${label} must be finite`)
      .min(0, `${label} cannot be negative`)
      .max(MAX_MONETARY_VALUE, `${label} is too large`)
      .refine(
        (val) => hasMaxDecimals(val, 2),
        `${label} must have at most 2 decimal places`,
      ),
  );
}

export const salesOrderIdSchema = z
  .string()
  .uuid("Invalid sales order identifier");

export const salesOrderItemSchema = z
  .object({
    productId: optionalUuidSchema("product selection"),
    name: z
      .string()
      .trim()
      .max(200, "Item name must be at most 200 characters")
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : (val ?? null))),
    sku: z
      .string()
      .trim()
      .max(100, "SKU must be at most 100 characters")
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : (val ?? null))),
    unit: z
      .string()
      .trim()
      .max(30, "Unit must be at most 30 characters")
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : (val ?? null))),
    quantity: z.preprocess(
      parseNumericInput,
      z
        .number({ message: "Quantity must be a valid number" })
        .finite("Quantity must be finite")
        .positive("Quantity must be greater than zero")
        .max(MAX_QUANTITY_VALUE, "Quantity is too large")
        .refine(
          (val) => hasMaxDecimals(val, 3),
          "Quantity must have at most 3 decimal places",
        ),
    ),
    unitPrice: nonNegativeMoneySchema("Unit price"),
    discountAmount: nonNegativeMoneySchema("Discount amount").default(0),
    taxAmount: nonNegativeMoneySchema("Tax amount").default(0),
  })
  .superRefine((item, ctx) => {
    if (!item.productId) {
      if (!item.name || item.name.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["name"],
          message: "Custom item name is required",
        });
      }

      if (!item.unit || item.unit.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["unit"],
          message: "Custom item unit is required",
        });
      }
    }

    const lineSubtotal = Number((item.quantity * item.unitPrice).toFixed(2));
    if (item.discountAmount > lineSubtotal) {
      ctx.addIssue({
        code: "custom",
        path: ["discountAmount"],
        message: "Discount cannot exceed line subtotal",
      });
    }
  });

export const salesOrderDraftSchema = z.object({
  customerId: z.string().uuid("Select a valid customer"),
  warehouseId: optionalUuidSchema("warehouse selection"),
  orderNumber: z
    .string()
    .trim()
    .max(50, "Order number must be at most 50 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  notes: z
    .string()
    .trim()
    .max(5000, "Notes must be at most 5000 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  items: z
    .array(salesOrderItemSchema)
    .min(1, "Add at least one line item")
    .max(200, "Sales order cannot exceed 200 items"),
});

export const updateSalesOrderDraftSchema = salesOrderDraftSchema.omit({
  orderNumber: true,
});

export const confirmSalesOrderSchema = z.object({
  salesOrderId: salesOrderIdSchema,
  warehouseId: optionalUuidSchema("warehouse selection"),
});

export const cancelSalesOrderSchema = z.object({
  salesOrderId: salesOrderIdSchema,
  reason: z
    .string()
    .trim()
    .min(1, "Cancellation reason is required")
    .max(1000, "Cancellation reason must be at most 1000 characters"),
});

export type SalesOrderItemInput = z.input<typeof salesOrderItemSchema>;
export type SalesOrderItemParsed = z.output<typeof salesOrderItemSchema>;
export type SalesOrderDraftValues = z.input<typeof salesOrderDraftSchema>;
export type UpdateSalesOrderDraftValues = z.input<
  typeof updateSalesOrderDraftSchema
>;
export type ConfirmSalesOrderValues = z.input<typeof confirmSalesOrderSchema>;
export type CancelSalesOrderValues = z.input<typeof cancelSalesOrderSchema>;
