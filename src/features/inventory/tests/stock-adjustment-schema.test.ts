import { describe, expect, it } from "vitest";
import { stockAdjustmentSchema } from "../schemas/stock-adjustment-schema";

describe("stockAdjustmentSchema", () => {
  it("parses valid stock adjustment input", () => {
    const input = {
      warehouseId: "11111111-1111-4111-8111-111111111111",
      productId: "22222222-2222-4222-8222-222222222222",
      adjustmentType: "opening_stock",
      quantity: 50,
      reason: "Initial stock load",
    };
    const result = stockAdjustmentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(50);
      expect(result.data.adjustmentType).toBe("opening_stock");
      expect(result.data.reason).toBe("Initial stock load");
    }
  });

  it("fails when quantity is negative or zero", () => {
    const input = {
      warehouseId: "11111111-1111-4111-8111-111111111111",
      productId: "22222222-2222-4222-8222-222222222222",
      adjustmentType: "adjustment_in",
      quantity: 0,
    };
    const result = stockAdjustmentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("fails when adjustmentType is invalid", () => {
    const input = {
      warehouseId: "11111111-1111-4111-8111-111111111111",
      productId: "22222222-2222-4222-8222-222222222222",
      adjustmentType: "sale_out",
      quantity: 10,
    };
    const result = stockAdjustmentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
