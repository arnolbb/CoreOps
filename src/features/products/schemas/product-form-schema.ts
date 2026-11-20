import { z } from "zod";

const MAX_MONETARY_VALUE = 999_999_999_999_999.99;
const MAX_STOCK_VALUE = 999_999_999_999_999.999;

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

function parseNullableNumericInput(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

function hasMaxDecimals(value: number, decimals: number): boolean {
  return Number(value.toFixed(decimals)) === value;
}

const monetarySchema = (label: string) =>
  z.preprocess(
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

export const productFormSchema = z
  .object({
    productType: z.enum(["goods", "service"], {
      message: "Product type must be goods or service",
    }),
    name: z
      .string()
      .trim()
      .min(1, "Product name is required")
      .max(200, "Product name must be at most 200 characters"),
    sku: z
      .string()
      .trim()
      .max(100, "SKU must be at most 100 characters")
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : (val ?? null))),
    categoryId: z
      .union([
        z.literal(""),
        z.null(),
        z.string().uuid("Invalid category selection"),
      ])
      .optional()
      .transform((val) => (!val ? null : val)),
    unit: z
      .string()
      .trim()
      .min(1, "Unit is required")
      .max(30, "Unit must be at most 30 characters"),
    description: z
      .string()
      .trim()
      .max(5000, "Description must be at most 5000 characters")
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : (val ?? null))),
    costPrice: monetarySchema("Cost price").default(0),
    sellingPrice: monetarySchema("Selling price"),
    trackInventory: z.boolean().default(true),
    minimumStock: z.preprocess(
      parseNullableNumericInput,
      z
        .number({ message: "Minimum stock must be a valid number" })
        .finite("Minimum stock must be finite")
        .min(0, "Minimum stock cannot be negative")
        .max(MAX_STOCK_VALUE, "Minimum stock is too large")
        .refine(
          (val) => hasMaxDecimals(val, 3),
          "Minimum stock must have at most 3 decimal places",
        )
        .nullable()
        .default(null),
    ),
  })
  .transform((data) => {
    if (data.productType === "service") {
      return {
        ...data,
        trackInventory: false,
        minimumStock: null,
      };
    }

    if (!data.trackInventory) {
      return {
        ...data,
        minimumStock: null,
      };
    }

    return data;
  });

export type ProductFormValues = z.input<typeof productFormSchema>;
export type ProductFormParsedValues = z.output<typeof productFormSchema>;
