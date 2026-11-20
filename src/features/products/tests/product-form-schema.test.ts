import { describe, expect, it } from "vitest";
import { productFormSchema } from "../schemas/product-form-schema";

describe("productFormSchema", () => {
  it("parses valid goods product and normalizes optional blank fields to null", () => {
    const result = productFormSchema.safeParse({
      productType: "goods",
      name: "  Filter Cartridge  ",
      sku: "   ",
      categoryId: "",
      unit: " pcs ",
      description: "",
      costPrice: "12.50",
      sellingPrice: "25",
      trackInventory: true,
      minimumStock: "5.25",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        productType: "goods",
        name: "Filter Cartridge",
        sku: null,
        categoryId: null,
        unit: "pcs",
        description: null,
        costPrice: 12.5,
        sellingPrice: 25,
        trackInventory: true,
        minimumStock: 5.25,
      });
    }
  });

  it("forces trackInventory=false and minimumStock=null for service items", () => {
    const result = productFormSchema.safeParse({
      productType: "service",
      name: "Annual Maintenance",
      unit: "visit",
      costPrice: 0,
      sellingPrice: 50,
      trackInventory: true,
      minimumStock: 10,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trackInventory).toBe(false);
      expect(result.data.minimumStock).toBeNull();
    }
  });

  it("clears minimumStock when trackInventory is false for goods", () => {
    const result = productFormSchema.safeParse({
      productType: "goods",
      name: "Untracked Supply",
      unit: "box",
      costPrice: 1,
      sellingPrice: 2,
      trackInventory: false,
      minimumStock: 3,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trackInventory).toBe(false);
      expect(result.data.minimumStock).toBeNull();
    }
  });

  it("rejects negative prices and excessive decimal places", () => {
    expect(
      productFormSchema.safeParse({
        productType: "goods",
        name: "Item",
        unit: "pcs",
        costPrice: -1,
        sellingPrice: 10,
      }).success,
    ).toBe(false);

    expect(
      productFormSchema.safeParse({
        productType: "goods",
        name: "Item",
        unit: "pcs",
        costPrice: 10,
        sellingPrice: 12.345,
      }).success,
    ).toBe(false);

    expect(
      productFormSchema.safeParse({
        productType: "goods",
        name: "Item",
        unit: "pcs",
        costPrice: 10,
        sellingPrice: 12,
        trackInventory: true,
        minimumStock: 1.2345,
      }).success,
    ).toBe(false);
  });

  it("rejects blank name, blank unit, and non-UUID categoryId", () => {
    expect(
      productFormSchema.safeParse({
        productType: "goods",
        name: "   ",
        unit: "pcs",
        sellingPrice: 10,
      }).success,
    ).toBe(false);

    expect(
      productFormSchema.safeParse({
        productType: "goods",
        name: "Item",
        unit: "  ",
        sellingPrice: 10,
      }).success,
    ).toBe(false);

    expect(
      productFormSchema.safeParse({
        productType: "goods",
        name: "Item",
        unit: "pcs",
        categoryId: "not-a-uuid",
        sellingPrice: 10,
      }).success,
    ).toBe(false);
  });
});
