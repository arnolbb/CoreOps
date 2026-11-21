import { describe, expect, it } from "vitest";
import {
  canAdminSales,
  canManageSales,
  canReadSales,
} from "../services/sales-permissions";

describe("sales permissions", () => {
  it("allows owner, admin, staff, and viewer to read sales", () => {
    expect(canReadSales("owner")).toBe(true);
    expect(canReadSales("admin")).toBe(true);
    expect(canReadSales("staff")).toBe(true);
    expect(canReadSales("viewer")).toBe(true);
  });

  it("denies technician and unknown roles from reading sales", () => {
    expect(canReadSales("technician")).toBe(false);
    expect(canReadSales("")).toBe(false);
    expect(canReadSales("guest")).toBe(false);
  });

  it("allows owner, admin, and staff to manage sales", () => {
    expect(canManageSales("owner")).toBe(true);
    expect(canManageSales("admin")).toBe(true);
    expect(canManageSales("staff")).toBe(true);
  });

  it("denies viewer, technician, and unknown roles from managing sales", () => {
    expect(canManageSales("viewer")).toBe(false);
    expect(canManageSales("technician")).toBe(false);
    expect(canManageSales("")).toBe(false);
  });

  it("restricts admin sales actions (void payment, cancel order) to owner and admin", () => {
    expect(canAdminSales("owner")).toBe(true);
    expect(canAdminSales("admin")).toBe(true);
    expect(canAdminSales("staff")).toBe(false);
    expect(canAdminSales("viewer")).toBe(false);
    expect(canAdminSales("technician")).toBe(false);
    expect(canAdminSales("")).toBe(false);
  });
});
