import { z } from "zod";

export const customerFormSchema = z.object({
  customerType: z.enum(["individual", "business"], {
    message: "Customer type must be individual or business",
  }),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(200, "Display name must be at most 200 characters"),
  companyName: z
    .string()
    .trim()
    .max(200, "Company name must be at most 200 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  phone: z
    .string()
    .trim()
    .max(40, "Phone number must be at most 40 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  email: z
    .string()
    .trim()
    .max(320, "Email must be at most 320 characters")
    .refine(
      (val) => val === "" || z.string().email().safeParse(val).success,
      "Invalid email address",
    )
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
  addressLine1: z
    .string()
    .trim()
    .max(300, "Address line 1 must be at most 300 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  addressLine2: z
    .string()
    .trim()
    .max(300, "Address line 2 must be at most 300 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  city: z
    .string()
    .trim()
    .max(120, "City must be at most 120 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  province: z
    .string()
    .trim()
    .max(120, "Province must be at most 120 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  postalCode: z
    .string()
    .trim()
    .max(30, "Postal code must be at most 30 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null))),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Country code must be 2 uppercase letters")
    .default("ID"),
  addressLabel: z
    .string()
    .trim()
    .max(80, "Address label must be at most 80 characters")
    .default("Primary"),
});

export type CustomerFormValues = z.input<typeof customerFormSchema>;
export type CustomerFormParsedValues = z.output<typeof customerFormSchema>;
