export function canReadSales(role: string): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "staff" ||
    role === "viewer"
  );
}

export function canManageSales(role: string): boolean {
  return role === "owner" || role === "admin" || role === "staff";
}

export function canAdminSales(role: string): boolean {
  return role === "owner" || role === "admin";
}
