import { z } from "zod";

const MAX_MONETARY_VALUE = 999_999_999_999_999.99;

export const SALES_PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "credit_card",
  "other",
] as const;

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

export const recordSalesPaymentSchema = z.object({
  salesOrderId: z.string().uuid("Invalid sales order identifier"),
  amount: z.preprocess(
    parseNumericInput,
    z
      .number({ message: "Payment amount must be a valid number" })
      .finite("Payment amount must be finite")
      .positive("Payment amount must be greater than zero")
      .max(MAX_MONETARY_VALUE, "Payment amount is too large")
      .refine(
        (val) => hasMaxDecimals(val, 2),
        "Payment amount must have at most 2 decimal places",
      ),
  ),
  paymentMethod: z.enum(SALES_PAYMENT_METHODS, {
    message: "Select a valid payment method",
  }),
  paidAt: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (!val ? null : val))
    .refine(
      (val) => val === null || !Number.isNaN(Date.parse(val)),
      "Invalid payment date",
    ),
  reference: z
    .string()
    .trim()
    .max(100, "Reference must be at most 100 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be at most 2000 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
});

export const voidSalesPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment identifier"),
  voidReason: z
    .string()
    .trim()
    .min(1, "Void reason is required")
    .max(1000, "Void reason must be at most 1000 characters"),
});

export type RecordSalesPaymentValues = z.input<typeof recordSalesPaymentSchema>;
export type VoidSalesPaymentValues = z.input<typeof voidSalesPaymentSchema>;
