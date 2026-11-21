"use client";

import { useEffect, useId, useState } from "react";
import {
  reopenWorkOrderAction,
  transitionWorkOrderStatusAction,
} from "../actions/work-order-actions";
import {
  reopenWorkOrderSchema,
  transitionWorkOrderStatusSchema,
} from "../schemas/work-order-schema";

type DialogKind = "complete" | "cancel" | "reopen";

type Props = {
  kind: DialogKind;
  workOrderId: string;
  workOrderNumber: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const DIALOG_COPY: Record<
  DialogKind,
  {
    title: string;
    description: string;
    fieldLabel: string;
    placeholder: string;
    confirmLabel: string;
    pendingLabel: string;
    cancelLabel: string;
    confirmTone: "primary" | "danger";
  }
> = {
  complete: {
    title: "Complete Work Order",
    description:
      "Completing this work order locks editing, stock item consumption, and new attachments.",
    fieldLabel: "Completion Notes *",
    placeholder: "Summarize work performed, test results, or handover details",
    confirmLabel: "Confirm Completion",
    pendingLabel: "Completing...",
    cancelLabel: "Cancel",
    confirmTone: "primary",
  },
  cancel: {
    title: "Cancel Work Order",
    description:
      "Cancelled work orders remain preserved for audit history and cannot be edited.",
    fieldLabel: "Cancellation Reason *",
    placeholder: "Explain why this work order is being cancelled",
    confirmLabel: "Confirm Cancellation",
    pendingLabel: "Cancelling...",
    cancelLabel: "Keep Work Order",
    confirmTone: "danger",
  },
  reopen: {
    title: "Reopen Work Order",
    description:
      "Reopening returns this work order to In Progress and writes an audit log entry.",
    fieldLabel: "Reopen Reason *",
    placeholder: "Explain why this completed work order is being reopened",
    confirmLabel: "Confirm Reopen",
    pendingLabel: "Reopening...",
    cancelLabel: "Cancel",
    confirmTone: "primary",
  },
};

export function WorkOrderLifecycleDialog({
  kind,
  workOrderId,
  workOrderNumber,
  onClose,
  onSuccess,
}: Props) {
  const titleId = useId();
  const fieldId = useId();
  const [textValue, setTextValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const copy = DIALOG_COPY[kind];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldError(null);

    if (kind === "reopen") {
      const parsed = reopenWorkOrderSchema.safeParse({
        workOrderId,
        reason: textValue,
      });

      if (!parsed.success) {
        setFieldError(
          parsed.error.flatten().fieldErrors.reason?.[0] ??
            "Reopen reason is required.",
        );
        return;
      }

      setIsSubmitting(true);
      const result = await reopenWorkOrderAction({
        workOrderId,
        reason: textValue,
      });
      setIsSubmitting(false);

      if (result.ok) {
        onSuccess(result.message);
        onClose();
      } else {
        setErrorMessage(result.message);
        if (result.fieldErrors?.reason?.[0]) {
          setFieldError(result.fieldErrors.reason[0]);
        }
      }
      return;
    }

    const targetStatus = kind === "complete" ? "completed" : "cancelled";
    const payload =
      kind === "complete"
        ? {
            workOrderId,
            targetStatus: "completed" as const,
            completionNotes: textValue,
          }
        : {
            workOrderId,
            targetStatus: "cancelled" as const,
            cancellationReason: textValue,
          };

    const parsed = transitionWorkOrderStatusSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldError(
        errors.completionNotes?.[0] ??
          errors.cancellationReason?.[0] ??
          "Please fill in the required field.",
      );
      return;
    }

    setIsSubmitting(true);
    const result = await transitionWorkOrderStatusAction({
      workOrderId,
      targetStatus,
      completionNotes: kind === "complete" ? textValue : undefined,
      cancellationReason: kind === "cancel" ? textValue : undefined,
    });
    setIsSubmitting(false);

    if (result.ok) {
      onSuccess(result.message);
      onClose();
    } else {
      setErrorMessage(result.message);
      const nextFieldError =
        result.fieldErrors?.completionNotes?.[0] ??
        result.fieldErrors?.cancellationReason?.[0];
      if (nextFieldError) {
        setFieldError(nextFieldError);
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
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <div>
            <h2 id={titleId} className="text-xl font-semibold">
              {copy.title}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {workOrderNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={`Close ${copy.title.toLowerCase()} dialog`}
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          {copy.description}
        </p>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor={fieldId} className="block text-sm font-medium">
              {copy.fieldLabel}
            </label>
            <textarea
              id={fieldId}
              rows={3}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={copy.placeholder}
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
            {fieldError ? (
              <p className="mt-1 text-xs text-red-500">{fieldError}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {copy.cancelLabel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={
                copy.confirmTone === "danger"
                  ? "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  : "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              }
            >
              {isSubmitting ? copy.pendingLabel : copy.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
