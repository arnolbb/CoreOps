import type { SalesOrderStatus, SalesPaymentStatus } from "../types/sales";

const ORDER_STATUS_STYLES: Record<SalesOrderStatus, string> = {
  draft:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  confirmed:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_STYLES: Record<SalesPaymentStatus, string> = {
  unpaid:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  partially_paid:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  refunded:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
};

const PAYMENT_STATUS_LABELS: Record<SalesPaymentStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  refunded: "Refunded",
};

export function SalesOrderStatusBadge({
  status,
}: {
  status: SalesOrderStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${ORDER_STATUS_STYLES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function SalesPaymentStatusBadge({
  status,
}: {
  status: SalesPaymentStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${PAYMENT_STATUS_STYLES[status]}`}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
