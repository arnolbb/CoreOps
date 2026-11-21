export function canReadWorkOrders(role: string) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "staff" ||
    role === "viewer" ||
    role === "technician"
  );
}

export function canManageWorkOrders(role: string) {
  return role === "owner" || role === "admin" || role === "staff";
}

export function canReopenWorkOrders(role: string) {
  return role === "owner" || role === "admin";
}

export function canOperateWorkOrder(
  role: string,
  assignedTo: string | null | undefined,
  userId: string,
) {
  if (canManageWorkOrders(role)) {
    return true;
  }

  return (
    role === "technician" &&
    Boolean(userId) &&
    Boolean(assignedTo) &&
    assignedTo === userId
  );
}
