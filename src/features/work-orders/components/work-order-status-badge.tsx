import type {
  WorkOrderAttachmentType,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderType,
} from "../types/work-order";

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const WORK_ORDER_TYPE_LABELS: Record<WorkOrderType, string> = {
  installation: "Installation",
  repair: "Repair",
  service: "Service",
  maintenance: "Maintenance",
  inspection: "Inspection",
  delivery_support: "Delivery Support",
  general: "General",
};

export const WORK_ORDER_ATTACHMENT_TYPE_LABELS: Record<
  WorkOrderAttachmentType,
  string
> = {
  photo: "Photo",
  document: "Document",
  signature: "Signature",
  other: "Other",
};

const statusStyles: Record<WorkOrderStatus, string> = {
  draft:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  scheduled:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  in_progress:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const priorityStyles: Record<WorkOrderPriority, string> = {
  low: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400",
  normal:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  high: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  urgent:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {WORK_ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function WorkOrderPriorityBadge({
  priority,
}: {
  priority: WorkOrderPriority;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityStyles[priority]}`}
    >
      {WORK_ORDER_PRIORITY_LABELS[priority]}
    </span>
  );
}
