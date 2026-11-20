import { z } from "zod";

export const productCategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name must be at most 100 characters"),
});

export type ProductCategoryFormValues = z.input<
  typeof productCategoryFormSchema
>;
