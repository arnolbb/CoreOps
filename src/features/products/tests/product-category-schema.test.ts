import { describe, expect, it } from "vitest";
import { productCategoryFormSchema } from "../schemas/product-category-schema";

describe("productCategoryFormSchema", () => {
  it("trims valid category name", () => {
    const result = productCategoryFormSchema.safeParse({
      name: "  Spare Parts  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Spare Parts");
    }
  });

  it("rejects blank or overlong category names", () => {
    expect(productCategoryFormSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
    expect(
      productCategoryFormSchema.safeParse({ name: "a".repeat(101) }).success,
    ).toBe(false);
  });
});
