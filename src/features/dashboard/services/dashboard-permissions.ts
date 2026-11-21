import type { DashboardCapabilities } from "../types/dashboard";

/**
 * Resolves role-scoped dashboard capabilities following docs/07-authorization-and-permissions.md.
 * Denies by default for unrecognized or empty role strings.
 */
export function getDashboardCapabilities(role: string): DashboardCapabilities {
  const isOwnerOrAdmin = role === "owner" || role === "admin";
  const isCoreReader = isOwnerOrAdmin || role === "staff" || role === "viewer";
  const isOperationalReader = isCoreReader || role === "technician";

  return {
    canReadCustomers: isCoreReader,
    canReadSales: isCoreReader,
    canViewFinancialTotals: isOwnerOrAdmin,
    canReadInventory: isOperationalReader,
    canReadWorkOrders: isOperationalReader,
    canViewAuditActivity: isOwnerOrAdmin,
  };
}

/**
 * Returns true if the role can view at least one dashboard module.
 */
export function hasAnyDashboardCapability(
  capabilities: DashboardCapabilities,
): boolean {
  return (
    capabilities.canReadCustomers ||
    capabilities.canReadSales ||
    capabilities.canReadInventory ||
    capabilities.canReadWorkOrders
  );
}
