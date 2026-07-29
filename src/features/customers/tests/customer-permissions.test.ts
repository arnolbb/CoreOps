import { describe, expect, it } from "vitest";
import { canReadCustomers } from "../services/customer-permissions";

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
