import { describe, expect, it } from "vitest";
import { warehouseFormSchema } from "../schemas/warehouse-schema";

describe("warehouseFormSchema", () => {
  it("trims valid fields, uppercases code, and transforms blank address to null", () => {
    const result = warehouseFormSchema.safeParse({
      name: "  Main Warehouse  ",
      code: "  wh-01  ",
      address: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Main Warehouse",
        code: "WH-01",
        address: null,
      });
    }
  });

  it("preserves non-empty address", () => {
    const result = warehouseFormSchema.safeParse({
      name: "Branch Warehouse",
      code: "wh-south",
      address: "  Jl. Sudirman No. 12  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Branch Warehouse",
        code: "WH-SOUTH",
        address: "Jl. Sudirman No. 12",
      });
    }
  });

  it("rejects blank or overlong name, code, or address", () => {
    expect(
      warehouseFormSchema.safeParse({ name: "   ", code: "WH-01" }).success,
    ).toBe(false);
    expect(
      warehouseFormSchema.safeParse({ name: "Main", code: "  " }).success,
    ).toBe(false);
    expect(
      warehouseFormSchema.safeParse({
        name: "x".repeat(101),
        code: "WH-01",
      }).success,
    ).toBe(false);
    expect(
      warehouseFormSchema.safeParse({
        name: "Main",
        code: "x".repeat(31),
      }).success,
    ).toBe(false);
    expect(
      warehouseFormSchema.safeParse({
        name: "Main",
        code: "WH-01",
        address: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});
