import { describe, expect, it } from "vitest";
import {
  canManageInventory,
  canReadInventory,
} from "../services/inventory-permissions";

describe("inventory-permissions", () => {
  describe("canReadInventory", () => {
    it.each(["owner", "admin", "staff", "viewer", "technician"])(
      "allows %s to read inventory",
      (role) => {
        expect(canReadInventory(role)).toBe(true);
      },
    );

    it.each(["manager", "", "unknown"])(
      "denies reading inventory for %s",
      (role) => {
        expect(canReadInventory(role)).toBe(false);
      },
    );
  });

  describe("canManageInventory", () => {
    it.each(["owner", "admin", "staff"])(
      "allows %s to manage inventory",
      (role) => {
        expect(canManageInventory(role)).toBe(true);
      },
    );

    it.each(["viewer", "technician", "manager", "", "unknown"])(
      "denies managing inventory for %s",
      (role) => {
        expect(canManageInventory(role)).toBe(false);
      },
    );
  });
});
