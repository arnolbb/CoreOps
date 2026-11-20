export function canReadProducts(role: string) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "staff" ||
    role === "viewer" ||
    role === "technician"
  );
}

export function canManageProducts(role: string) {
  return role === "owner" || role === "admin" || role === "staff";
}

export function canArchiveProducts(role: string) {
  return role === "owner" || role === "admin";
}

export function canViewProductCost(role: string) {
  return role === "owner" || role === "admin";
}
