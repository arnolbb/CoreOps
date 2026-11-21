"use client";

import { useEffect, useId, useState } from "react";
import {
  createWorkOrderAction,
  updateWorkOrderAction,
} from "../actions/work-order-actions";
import {
  workOrderFormSchema,
  type WorkOrderFormValues,
} from "../schemas/work-order-schema";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_TYPES,
  type WorkOrderAddressOption,
  type WorkOrderAssigneeOption,
  type WorkOrderCustomerOption,
  type WorkOrderDetail,
  type WorkOrderPriority,
  type WorkOrderType,
} from "../types/work-order";
import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_TYPE_LABELS,
} from "./work-order-status-badge";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  customers: WorkOrderCustomerOption[];
  addresses: WorkOrderAddressOption[];
  assignees: WorkOrderAssigneeOption[];
  workOrder?: WorkOrderDetail | null;
};

type FormState = {
  customerId: string;
  customerAddressId: string;
  workType: WorkOrderType;
  priority: WorkOrderPriority;
  initialStatus: "draft" | "scheduled";
  assignedTo: string;
  scheduledStart: string;
  scheduledEnd: string;
  description: string;
};

function toDatetimeLocalValue(isoValue: string | null | undefined): string {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDatetimeOrNull(localValue: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toISOString();
}

function findDefaultAddressId(
  customerId: string,
  addresses: WorkOrderAddressOption[],
): string {
  const customerAddresses = addresses.filter(
    (addr) => addr.customerId === customerId,
  );
  if (customerAddresses.length === 0) return "";
  const primary = customerAddresses.find((addr) => addr.isPrimary);
  return primary?.id ?? customerAddresses[0]?.id ?? "";
}

function buildInitialState(
  customers: WorkOrderCustomerOption[],
  addresses: WorkOrderAddressOption[],
  workOrder?: WorkOrderDetail | null,
): FormState {
  const initialCustomerId = workOrder?.customerId ?? customers[0]?.id ?? "";
  const initialAddressId = workOrder
    ? (workOrder.customerAddressId ?? "")
    : findDefaultAddressId(initialCustomerId, addresses);

  return {
    customerId: initialCustomerId,
    customerAddressId: initialAddressId,
    workType: workOrder?.workType ?? "service",
    priority: workOrder?.priority ?? "normal",
    initialStatus: workOrder?.status === "scheduled" ? "scheduled" : "draft",
    assignedTo: workOrder?.assignedTo ?? "",
    scheduledStart: toDatetimeLocalValue(workOrder?.scheduledStart),
    scheduledEnd: toDatetimeLocalValue(workOrder?.scheduledEnd),
    description: workOrder?.description ?? "",
  };
}

export function WorkOrderFormDialog({
  isOpen,
  onClose,
  customers,
  addresses,
  assignees,
  workOrder,
}: Props) {
  const isEditing = Boolean(workOrder);
  const titleId = useId();
  const fieldPrefix = useId();

  const [formState, setFormState] = useState<FormState>(() =>
    buildInitialState(customers, addresses, workOrder),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const customerAddresses = addresses.filter(
    (addr) => addr.customerId === formState.customerId,
  );
  const canSubmit = customers.length > 0;

  const handleCustomerChange = (nextCustomerId: string) => {
    const nextDefaultAddress = findDefaultAddressId(nextCustomerId, addresses);
    setFormState((prev) => ({
      ...prev,
      customerId: nextCustomerId,
      customerAddressId: nextDefaultAddress,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!canSubmit) {
      setErrorMessage("Create at least one active customer first.");
      return;
    }

    const payload: WorkOrderFormValues = {
      customerId: formState.customerId,
      customerAddressId: formState.customerAddressId || null,
      workType: formState.workType,
      priority: formState.priority,
      initialStatus: formState.initialStatus,
      assignedTo: formState.assignedTo || null,
      scheduledStart: toIsoDatetimeOrNull(formState.scheduledStart),
      scheduledEnd: toIsoDatetimeOrNull(formState.scheduledEnd),
      description: formState.description,
    };

    const parsed = workOrderFormSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    setIsSubmitting(true);
    const result =
      isEditing && workOrder
        ? await updateWorkOrderAction(workOrder.id, payload)
        : await createWorkOrderAction(payload);
    setIsSubmitting(false);

    if (result.ok) {
      onClose();
    } else {
      setErrorMessage(result.message);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-xl font-semibold">
            {isEditing ? "Edit Work Order" : "New Work Order"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close work order dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {!canSubmit ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            At least one active customer is required before creating a work
            order.
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${fieldPrefix}-customerId`}
                className="block text-sm font-medium"
              >
                Customer *
              </label>
              <select
                id={`${fieldPrefix}-customerId`}
                name="customerId"
                value={formState.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              >
                {customers.length === 0 ? (
                  <option value="">No active customers</option>
                ) : (
                  customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.displayName}
                      {customer.companyName ? ` (${customer.companyName})` : ""}
                    </option>
                  ))
                )}
              </select>
              {fieldErrors.customerId ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.customerId[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-customerAddressId`}
                className="block text-sm font-medium"
              >
                Site Address
              </label>
              <select
                id={`${fieldPrefix}-customerAddressId`}
                name="customerAddressId"
                value={formState.customerAddressId}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    customerAddressId: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">No site address</option>
                {customerAddresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label} — {addr.addressLine1}
                    {addr.city ? `, ${addr.city}` : ""}
                  </option>
                ))}
              </select>
              {fieldErrors.customerAddressId ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.customerAddressId[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-workType`}
                className="block text-sm font-medium"
              >
                Work Type *
              </label>
              <select
                id={`${fieldPrefix}-workType`}
                name="workType"
                value={formState.workType}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    workType: e.target.value as WorkOrderType,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {WORK_ORDER_TYPES.map((workType) => (
                  <option key={workType} value={workType}>
                    {WORK_ORDER_TYPE_LABELS[workType]}
                  </option>
                ))}
              </select>
              {fieldErrors.workType ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.workType[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-priority`}
                className="block text-sm font-medium"
              >
                Priority *
              </label>
              <select
                id={`${fieldPrefix}-priority`}
                name="priority"
                value={formState.priority}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    priority: e.target.value as WorkOrderPriority,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {WORK_ORDER_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {WORK_ORDER_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
              {fieldErrors.priority ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.priority[0]}
                </p>
              ) : null}
            </div>

            {!isEditing ? (
              <div>
                <label
                  htmlFor={`${fieldPrefix}-initialStatus`}
                  className="block text-sm font-medium"
                >
                  Initial Status
                </label>
                <select
                  id={`${fieldPrefix}-initialStatus`}
                  name="initialStatus"
                  value={formState.initialStatus}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      initialStatus:
                        e.target.value === "scheduled" ? "scheduled" : "draft",
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            ) : null}

            <div className={isEditing ? "sm:col-span-2" : ""}>
              <label
                htmlFor={`${fieldPrefix}-assignedTo`}
                className="block text-sm font-medium"
              >
                Assignee
              </label>
              <select
                id={`${fieldPrefix}-assignedTo`}
                name="assignedTo"
                value={formState.assignedTo}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    assignedTo: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Unassigned</option>
                {assignees.map((assignee) => (
                  <option key={assignee.userId} value={assignee.userId}>
                    {assignee.email}
                  </option>
                ))}
              </select>
              {fieldErrors.assignedTo ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.assignedTo[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-scheduledStart`}
                className="block text-sm font-medium"
              >
                Scheduled Start
              </label>
              <input
                id={`${fieldPrefix}-scheduledStart`}
                type="datetime-local"
                name="scheduledStart"
                value={formState.scheduledStart}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    scheduledStart: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {fieldErrors.scheduledStart ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.scheduledStart[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-scheduledEnd`}
                className="block text-sm font-medium"
              >
                Scheduled End
              </label>
              <input
                id={`${fieldPrefix}-scheduledEnd`}
                type="datetime-local"
                name="scheduledEnd"
                value={formState.scheduledEnd}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    scheduledEnd: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {fieldErrors.scheduledEnd ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.scheduledEnd[0]}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor={`${fieldPrefix}-description`}
                className="block text-sm font-medium"
              >
                Description *
              </label>
              <textarea
                id={`${fieldPrefix}-description`}
                name="description"
                rows={3}
                value={formState.description}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe the requested task, site instructions, or scope of work"
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {fieldErrors.description ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.description[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Work Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
