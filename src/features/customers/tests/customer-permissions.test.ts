import { describe, expect, it } from "vitest";
import {
  canManageCustomers,
  canReadCustomers,
} from "../services/customer-permissions";

describe("customer-permissions", () => {
  describe("canReadCustomers", () => {
    it.each(["owner", "admin", "staff", "viewer"])(
      "allows %s to read customers",
      (role) => {
        expect(canReadCustomers(role)).toBe(true);
      },
    );

    it.each(["technician", "manager", "", "unknown"])(
      "denies broad customer access for %s",
      (role) => {
        expect(canReadCustomers(role)).toBe(false);
      },
    );
  });

  describe("canManageCustomers", () => {
    it.each(["owner", "admin", "staff"])(
      "allows %s to manage customers",
      (role) => {
        expect(canManageCustomers(role)).toBe(true);
      },
    );

    it.each(["viewer", "technician", "manager", "", "unknown"])(
      "denies managing customers for %s",
      (role) => {
        expect(canManageCustomers(role)).toBe(false);
      },
    );
  });
});
