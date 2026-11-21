import { describe, expect, it } from "vitest";
import {
  getDashboardCapabilities,
  hasAnyDashboardCapability,
} from "../services/dashboard-permissions";

describe("dashboard-permissions", () => {
  it("grants full operational, financial, and audit capabilities to owner and admin", () => {
    for (const role of ["owner", "admin"]) {
      const capabilities = getDashboardCapabilities(role);

      expect(capabilities).toEqual({
        canReadCustomers: true,
        canReadSales: true,
        canViewFinancialTotals: true,
        canReadInventory: true,
        canReadWorkOrders: true,
        canViewAuditActivity: true,
      });
      expect(hasAnyDashboardCapability(capabilities)).toBe(true);
    }
  });

  it("hides financial totals and audit logs from staff and viewer while allowing operational reads", () => {
    for (const role of ["staff", "viewer"]) {
      const capabilities = getDashboardCapabilities(role);

      expect(capabilities).toEqual({
        canReadCustomers: true,
        canReadSales: true,
        canViewFinancialTotals: false,
        canReadInventory: true,
        canReadWorkOrders: true,
        canViewAuditActivity: false,
      });
      expect(hasAnyDashboardCapability(capabilities)).toBe(true);
    }
  });

  it("restricts technician to inventory and work orders only", () => {
    const capabilities = getDashboardCapabilities("technician");

    expect(capabilities).toEqual({
      canReadCustomers: false,
      canReadSales: false,
      canViewFinancialTotals: false,
      canReadInventory: true,
      canReadWorkOrders: true,
      canViewAuditActivity: false,
    });
    expect(hasAnyDashboardCapability(capabilities)).toBe(true);
  });

  it.each(["manager", "", "unknown"])(
    "denies all dashboard capabilities by default for %s",
    (role) => {
      const capabilities = getDashboardCapabilities(role);

      expect(capabilities).toEqual({
        canReadCustomers: false,
        canReadSales: false,
        canViewFinancialTotals: false,
        canReadInventory: false,
        canReadWorkOrders: false,
        canViewAuditActivity: false,
      });
      expect(hasAnyDashboardCapability(capabilities)).toBe(false);
    },
  );
});
