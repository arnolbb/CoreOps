import { resolveValidTimezone } from "./timezone-boundaries";

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "member.invitation_created": "Invited a team member",
  "member.invitation_resent": "Resent a team invitation",
  "member.invitation_revoked": "Revoked a team invitation",
  "member.invitation_accepted": "Accepted a team invitation",
  "member.membership_reactivated": "Reactivated a team membership",
  "customer.archived": "Archived a customer",
  "product.archived": "Archived a product",
  "inventory.stock_adjusted": "Adjusted inventory stock",
  "sales_order.confirmed": "Confirmed a sales order",
  "sales_order.completed": "Completed a sales order",
  "sales_order.cancelled": "Cancelled a sales order",
  "payment.recorded": "Recorded a sales payment",
  "payment.voided": "Voided a sales payment",
  "work_order.created": "Created a work order",
  "work_order.updated": "Updated a work order",
  "work_order.scheduled": "Scheduled a work order",
  "work_order.started": "Started a work order",
  "work_order.completed": "Completed a work order",
  "work_order.cancelled": "Cancelled a work order",
  "work_order.status_changed": "Updated work order status",
  "work_order.reopened": "Reopened a work order",
  "work_order.item_used": "Recorded work order material usage",
};

const INVENTORY_TX_LABELS: Record<string, string> = {
  opening_stock: "Opening stock",
  adjustment_in: "Stock increase",
  adjustment_out: "Stock decrease",
  sale_out: "Sale deduction",
  return_in: "Sales return",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  work_order_out: "Work order usage",
  work_order_return: "Work order return",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  installation: "Installation",
  repair: "Repair",
  service: "Service",
  maintenance: "Maintenance",
  inspection: "Inspection",
  delivery_support: "Delivery Support",
  general: "General",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

function humanizeToken(raw: string): string {
  const normalized = raw.replace(/[._]+/g, " ").trim();
  if (!normalized) {
    return "Event";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Formats an audit action code into a readable summary without leaking raw internal keys.
 */
export function formatAuditActionSummary(
  action: string,
  entityType?: string,
): string {
  const known = AUDIT_ACTION_LABELS[action];
  if (known) {
    return known;
  }

  const formattedAction = humanizeToken(action);
  if (entityType && entityType.trim().length > 0) {
    return `${formattedAction} (${humanizeToken(entityType)})`;
  }

  return formattedAction;
}

export function formatInventoryTransactionLabel(type: string): string {
  return INVENTORY_TX_LABELS[type] ?? humanizeToken(type);
}

export function formatStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? humanizeToken(status);
}

export function formatWorkTypeLabel(workType: string): string {
  return WORK_TYPE_LABELS[workType] ?? humanizeToken(workType);
}

export function formatPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] ?? humanizeToken(priority);
}

/**
 * Formats a numeric monetary total with the organization currency code using Intl.NumberFormat.
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string,
): string {
  const trimmedCode = currencyCode.trim().toUpperCase();
  const safeCode = /^[A-Z]{3}$/.test(trimmedCode) ? trimmedCode : "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${safeCode} ${amount.toFixed(2)}`;
  }
}

/**
 * Formats an ISO timestamp in the organization's resolved IANA timezone.
 */
export function formatDashboardDateTime(
  value: string,
  timezone: string,
): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  const resolvedTimezone = resolveValidTimezone(timezone);

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: resolvedTimezone,
  }).format(parsed);
}
