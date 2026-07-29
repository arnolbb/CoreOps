export function canReadCustomers(role: string) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "staff" ||
    role === "viewer"
  );
}

export function canManageCustomers(role: string) {
  return role === "owner" || role === "admin" || role === "staff";
}

