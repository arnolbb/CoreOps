import { describe, expect, it } from "vitest";
import {
  canArchiveProducts,
  canManageProducts,
  canReadProducts,
  canViewProductCost,
} from "../services/product-permissions";

describe("product-permissions", () => {
  describe("canReadProducts", () => {
    it.each(["owner", "admin", "staff", "viewer", "technician"])(
      "allows %s to read products",
      (role) => {
        expect(canReadProducts(role)).toBe(true);
      },
    );

    it.each(["manager", "", "unknown"])(
      "denies reading products for %s",
      (role) => {
        expect(canReadProducts(role)).toBe(false);
      },
    );
  });

  describe("canManageProducts", () => {
    it.each(["owner", "admin", "staff"])(
      "allows %s to manage products and categories",
      (role) => {
        expect(canManageProducts(role)).toBe(true);
      },
    );

    it.each(["viewer", "technician", "manager", "", "unknown"])(
      "denies managing products for %s",
      (role) => {
        expect(canManageProducts(role)).toBe(false);
      },
    );
  });

  describe("canArchiveProducts", () => {
    it.each(["owner", "admin"])("allows %s to archive products", (role) => {
      expect(canArchiveProducts(role)).toBe(true);
    });

    it.each(["staff", "viewer", "technician", "manager", "", "unknown"])(
      "denies archiving products for %s",
      (role) => {
        expect(canArchiveProducts(role)).toBe(false);
      },
    );
  });

  describe("canViewProductCost", () => {
    it.each(["owner", "admin"])(
      "allows %s to view product cost price",
      (role) => {
        expect(canViewProductCost(role)).toBe(true);
      },
    );

    it.each(["staff", "viewer", "technician", "manager", "", "unknown"])(
      "denies viewing product cost price for %s",
      (role) => {
        expect(canViewProductCost(role)).toBe(false);
      },
    );
  });
});
