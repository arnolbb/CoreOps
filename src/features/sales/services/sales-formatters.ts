import type { SalesOrderItemType, SalesPaymentMethod } from "../types/sales";

export function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

export function formatDateTime(value: string, timeZone = "UTC"): string {
  const date = new Date(value);
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date);
  }
}

export function formatDate(value: string, timeZone = "UTC"): string {
  const date = new Date(value);
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(date);
  }
}

const PAYMENT_METHOD_LABELS: Record<SalesPaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  credit_card: "Credit Card",
  other: "Other",
};

export function formatPaymentMethod(method: string): string {
  if (method in PAYMENT_METHOD_LABELS) {
    return PAYMENT_METHOD_LABELS[method as SalesPaymentMethod];
  }
  return method;
}

const ITEM_TYPE_LABELS: Record<SalesOrderItemType, string> = {
  goods: "Goods",
  service: "Service",
  custom: "Custom",
};

export function formatOrderItemType(itemType: SalesOrderItemType): string {
  return ITEM_TYPE_LABELS[itemType];
}
