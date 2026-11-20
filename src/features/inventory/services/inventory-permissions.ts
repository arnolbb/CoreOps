export function canReadInventory(role: string) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "staff" ||
    role === "viewer" ||
    role === "technician"
  );
}

export function canManageInventory(role: string) {
  return role === "owner" || role === "admin" || role === "staff";
}
