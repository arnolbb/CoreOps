"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  cancelSalesOrderAction,
  completeSalesOrderAction,
  confirmSalesOrderAction,
  recordSalesPaymentAction,
  voidSalesPaymentAction,
} from "../actions/sales-actions";
import {
  cancelSalesOrderSchema,
  confirmSalesOrderSchema,
} from "../schemas/sales-order-schema";
import {
  recordSalesPaymentSchema,
  SALES_PAYMENT_METHODS,
  voidSalesPaymentSchema,
} from "../schemas/sales-payment-schema";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatOrderItemType,
  formatPaymentMethod,
} from "../services/sales-formatters";
import type {
  SalesOrderDetail,
  SalesPaymentMethod,
  SalesPaymentView,
} from "../types/sales";
import { SalesOrderFormDialog } from "./sales-order-form-dialog";
import {
  SalesOrderStatusBadge,
  SalesPaymentStatusBadge,
} from "./sales-status-badge";

type Props = {
  order: SalesOrderDetail;
  canManage: boolean;
  canAdmin: boolean;
};

function ConfirmOrderDialog({
  order,
  onClose,
}: {
  order: SalesOrderDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const warehouseSelectId = useId();
  const [warehouseId, setWarehouseId] = useState(
    () => order.warehouse?.id ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = confirmSalesOrderSchema.safeParse({
      salesOrderId: order.id,
      warehouseId: warehouseId || null,
    });
    if (!parsed.success) {
      setErrorMessage("Select a valid warehouse.");
      return;
    }

    setIsSubmitting(true);
    const result = await confirmSalesOrderAction({
      salesOrderId: order.id,
      warehouseId: warehouseId || null,
    });
    setIsSubmitting(false);

    if (result.ok) {
      router.refresh();
      onClose();
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-lg font-semibold">
            Confirm Sales Order
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close confirm order dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirm} className="mt-4 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {order.hasTrackedGoods
              ? "Confirming locks line items and deducts inventory for tracked goods from the selected warehouse."
              : "Confirming locks line items and marks this order ready for fulfillment and payment."}
          </p>

          {order.hasTrackedGoods && !order.warehouse ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              This order contains inventory-tracked goods and does not have a
              warehouse assigned yet. Select an active warehouse below.
            </div>
          ) : null}

          {order.hasTrackedGoods || order.activeWarehouses.length > 0 ? (
            <div>
              <label
                htmlFor={warehouseSelectId}
                className="block text-sm font-medium"
              >
                Fulfillment Warehouse{" "}
                {order.hasTrackedGoods ? "*" : "(optional)"}
              </label>
              <select
                id={warehouseSelectId}
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">
                  {order.hasTrackedGoods
                    ? "Select an active warehouse"
                    : "No warehouse assigned"}
                </option>
                {order.activeWarehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "Confirming..." : "Confirm Sales Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompleteOrderDialog({
  order,
  onClose,
}: {
  order: SalesOrderDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleComplete = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const result = await completeSalesOrderAction(order.id);
    setIsSubmitting(false);

    if (result.ok) {
      router.refresh();
      onClose();
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 id={titleId} className="text-lg font-semibold">
          Complete Sales Order?
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Mark <strong>{order.orderNumber}</strong> as completed? Completed
          orders cannot be cancelled, though outstanding payments can still be
          recorded.
        </p>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={isSubmitting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Completing..." : "Confirm Completion"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelOrderDialog({
  order,
  onClose,
}: {
  order: SalesOrderDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

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
    setFieldErrors({});

    const parsed = cancelSalesOrderSchema.safeParse({
      salesOrderId: order.id,
      reason,
    });
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    setIsSubmitting(true);
    const result = await cancelSalesOrderAction({
      salesOrderId: order.id,
      reason,
    });
    setIsSubmitting(false);

    if (result.ok) {
      router.refresh();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-lg font-semibold">
            Cancel Sales Order
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close cancel order dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {order.status === "confirmed"
              ? "Cancelling this confirmed order will restore any deducted tracked inventory. Active completed payments must be voided before cancellation."
              : "Cancel this draft sales order? This action cannot be undone."}
          </p>

          <div>
            <label htmlFor={reasonId} className="block text-sm font-medium">
              Cancellation Reason *
            </label>
            <textarea
              id={reasonId}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this order is being cancelled"
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
            {fieldErrors.reason ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.reason[0]}
              </p>
            ) : null}
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordPaymentDialog({
  order,
  onClose,
}: {
  order: SalesOrderDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const fieldPrefix = useId();
  const [amount, setAmount] = useState(() =>
    order.outstandingBalance.toFixed(2),
  );
  const [paymentMethod, setPaymentMethod] =
    useState<SalesPaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

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
    setFieldErrors({});

    const payload = {
      salesOrderId: order.id,
      amount,
      paymentMethod,
      reference: reference || null,
      notes: notes || null,
    };

    const parsed = recordSalesPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    setIsSubmitting(true);
    const result = await recordSalesPaymentAction(payload);
    setIsSubmitting(false);

    if (result.ok) {
      router.refresh();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-lg font-semibold">
            Record Payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close record payment dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Remaining balance:{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {formatCurrency(order.outstandingBalance, order.currencyCode)}
            </strong>
          </p>

          <div>
            <label
              htmlFor={`${fieldPrefix}-amount`}
              className="block text-sm font-medium"
            >
              Amount *
            </label>
            <input
              id={`${fieldPrefix}-amount`}
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
            {fieldErrors.amount ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.amount[0]}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-method`}
              className="block text-sm font-medium"
            >
              Payment Method *
            </label>
            <select
              id={`${fieldPrefix}-method`}
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as SalesPaymentMethod)
              }
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {SALES_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {formatPaymentMethod(method)}
                </option>
              ))}
            </select>
            {fieldErrors.paymentMethod ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.paymentMethod[0]}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-reference`}
              className="block text-sm font-medium"
            >
              Reference
            </label>
            <input
              id={`${fieldPrefix}-reference`}
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Receipt or transfer reference"
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            {fieldErrors.reference ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.reference[0]}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-notes`}
              className="block text-sm font-medium"
            >
              Notes
            </label>
            <textarea
              id={`${fieldPrefix}-notes`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes"
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            {fieldErrors.notes ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.notes[0]}
              </p>
            ) : null}
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {errorMessage}
            </div>
          ) : null}

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
              disabled={isSubmitting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "Recording..." : "Submit Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VoidPaymentDialog({
  payment,
  currencyCode,
  onClose,
}: {
  payment: SalesPaymentView;
  currencyCode: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const reasonId = useId();
  const [voidReason, setVoidReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

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
    setFieldErrors({});

    const parsed = voidSalesPaymentSchema.safeParse({
      paymentId: payment.id,
      voidReason,
    });
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    setIsSubmitting(true);
    const result = await voidSalesPaymentAction({
      paymentId: payment.id,
      voidReason,
    });
    setIsSubmitting(false);

    if (result.ok) {
      router.refresh();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-lg font-semibold">
            Void Payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close void payment dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Void{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {formatCurrency(payment.amount, currencyCode)}
            </strong>{" "}
            ({formatPaymentMethod(payment.paymentMethod)})? Voided payments
            remain in the audit log and update the order balance.
          </p>

          <div>
            <label htmlFor={reasonId} className="block text-sm font-medium">
              Void Reason *
            </label>
            <textarea
              id={reasonId}
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Explain why this payment is being voided"
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
            {fieldErrors.voidReason ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.voidReason[0]}
              </p>
            ) : null}
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Keep Payment
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? "Voiding..." : "Confirm Void"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SalesOrderDetailClient({ order, canManage, canAdmin }: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [voidTargetPayment, setVoidTargetPayment] =
    useState<SalesPaymentView | null>(null);

  const canRecordPayment =
    canManage &&
    (order.status === "confirmed" || order.status === "completed") &&
    order.outstandingBalance > 0;

  return (
    <section className="space-y-6">
      <div className="space-y-3 print:hidden">
        <Link
          href="/dashboard/sales"
          className="inline-flex items-center text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to Sales
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-semibold tracking-tight">
                {order.orderNumber}
              </h1>
              <SalesOrderStatusBadge status={order.status} />
              <SalesPaymentStatusBadge status={order.paymentStatus} />
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Created{" "}
              {formatDateTime(order.createdAt, order.organizationTimezone)}
              {order.confirmedAt
                ? ` · Confirmed ${formatDateTime(order.confirmedAt, order.organizationTimezone)}`
                : ""}
              {order.completedAt
                ? ` · Completed ${formatDateTime(order.completedAt, order.organizationTimezone)}`
                : ""}
              {order.cancelledAt
                ? ` · Cancelled ${formatDateTime(order.cancelledAt, order.organizationTimezone)}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-900"
            >
              Print Invoice
            </button>

            {canManage && order.status === "draft" && order.formOptions ? (
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-900"
              >
                Edit Draft
              </button>
            ) : null}

            {canManage && order.status === "draft" ? (
              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Confirm Order
              </button>
            ) : null}

            {canManage && order.status === "confirmed" ? (
              <button
                type="button"
                onClick={() => setIsCompleteOpen(true)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Complete Order
              </button>
            ) : null}

            {canAdmin &&
            (order.status === "draft" || order.status === "confirmed") ? (
              <button
                type="button"
                onClick={() => setIsCancelOpen(true)}
                className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-white/20 dark:text-red-300 dark:hover:bg-red-950"
              >
                Cancel Order
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {order.status === "cancelled" && order.cancellationReason ? (
        <div
          role="status"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <p className="font-semibold">Order Cancelled</p>
          <p className="mt-1">Reason: {order.cancellationReason}</p>
        </div>
      ) : null}

      {/* Printable Invoice View */}
      <article className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-zinc-950 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
        <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-6 dark:border-white/15 sm:flex-row">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Sales Invoice
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50 print:text-black">
              {order.organizationName}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
              Order #{order.orderNumber}
            </p>
          </div>
          <div className="space-y-1 text-sm sm:text-right">
            <p className="text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
              Issue Date:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100 print:text-black">
                {formatDate(order.createdAt, order.organizationTimezone)}
              </span>
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
              Currency:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100 print:text-black">
                {order.currencyCode}
              </span>
            </p>
            <div className="hidden flex-wrap gap-2 pt-1 print:flex print:justify-end">
              <SalesOrderStatusBadge status={order.status} />
              <SalesPaymentStatusBadge status={order.paymentStatus} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Bill To
            </h3>
            <p className="mt-2 font-medium text-zinc-950 dark:text-zinc-50 print:text-black">
              {order.customer.displayName}
            </p>
            {order.customer.companyName ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {order.customer.companyName}
              </p>
            ) : null}
            {order.customer.email ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {order.customer.email}
              </p>
            ) : null}
            {order.customer.phone ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {order.customer.phone}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Fulfillment Details
            </h3>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              Warehouse:{" "}
              <span className="font-medium text-zinc-950 dark:text-zinc-50">
                {order.warehouse
                  ? `${order.warehouse.name} (${order.warehouse.code})`
                  : "Not assigned"}
              </span>
            </p>
            {order.notes ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Notes: {order.notes}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
          <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/15">
            <caption className="sr-only">Order line items</caption>
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Item
                </th>
                <th scope="col" className="px-4 py-3">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Qty
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Unit Price
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Discount
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Tax
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/15">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      {item.nameSnapshot}
                    </p>
                    {item.skuSnapshot ? (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        SKU: {item.skuSnapshot}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-400">
                    {formatOrderItemType(item.itemType)}
                  </td>
                  <td className="px-4 py-3 text-right align-top text-zinc-900 dark:text-zinc-100">
                    {item.quantity} {item.unitSnapshot}
                  </td>
                  <td className="px-4 py-3 text-right align-top text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(item.unitPrice, order.currencyCode)}
                  </td>
                  <td className="px-4 py-3 text-right align-top text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(item.discountAmount, order.currencyCode)}
                  </td>
                  <td className="px-4 py-3 text-right align-top text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(item.taxAmount, order.currencyCode)}
                  </td>
                  <td className="px-4 py-3 text-right align-top font-medium text-zinc-950 dark:text-zinc-50">
                    {formatCurrency(item.lineTotal, order.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(order.subtotal, order.currencyCode)}</dd>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <dt>Discount</dt>
              <dd>
                -{formatCurrency(order.discountTotal, order.currencyCode)}
              </dd>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <dt>Tax</dt>
              <dd>{formatCurrency(order.taxTotal, order.currencyCode)}</dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold text-zinc-950 dark:border-white/15 dark:text-zinc-50">
              <dt>Grand Total</dt>
              <dd>{formatCurrency(order.grandTotal, order.currencyCode)}</dd>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <dt>Paid Total</dt>
              <dd>{formatCurrency(order.paidTotal, order.currencyCode)}</dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-2 font-semibold text-zinc-950 dark:border-white/15 dark:text-zinc-50">
              <dt>Outstanding Balance</dt>
              <dd>
                {formatCurrency(order.outstandingBalance, order.currencyCode)}
              </dd>
            </div>
          </dl>
        </div>
      </article>

      {/* Payments Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Payments</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Recorded payments and void history for {order.orderNumber}.
            </p>
          </div>
          {canRecordPayment ? (
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 print:hidden"
            >
              Record Payment
            </button>
          ) : null}
        </div>

        {order.payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 p-6 dark:border-white/20">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {order.status === "draft"
                ? "Confirm this draft order before recording payments."
                : "No payments have been recorded for this order yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {order.payments.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-2xl border border-black/10 bg-white p-4 text-sm dark:border-white/15 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                        {formatCurrency(payment.amount, order.currencyCode)}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {formatPaymentMethod(payment.paymentMethod)} ·{" "}
                        {formatDateTime(
                          payment.paidAt,
                          order.organizationTimezone,
                        )}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        payment.status === "completed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {payment.status === "completed" ? "Completed" : "Voided"}
                    </span>
                  </div>
                  {payment.reference ? (
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      Reference: {payment.reference}
                    </p>
                  ) : null}
                  {payment.notes ? (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Notes: {payment.notes}
                    </p>
                  ) : null}
                  {payment.status === "voided" && payment.voidReason ? (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Void reason: {payment.voidReason}
                    </p>
                  ) : null}
                  {canAdmin && payment.status === "completed" ? (
                    <div className="mt-3 flex justify-end border-t border-black/10 pt-3 dark:border-white/15 print:hidden">
                      <button
                        type="button"
                        onClick={() => setVoidTargetPayment(payment)}
                        className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-white/20 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        Void
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-950 md:block">
              <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/15">
                <caption className="sr-only">Payment history</caption>
                <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Method
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Reference & Notes
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Amount
                    </th>
                    {canAdmin ? (
                      <th
                        scope="col"
                        className="px-4 py-3 text-right print:hidden"
                      >
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/15">
                  {order.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 align-top text-xs text-zinc-600 dark:text-zinc-400">
                        {formatDateTime(
                          payment.paidAt,
                          order.organizationTimezone,
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-zinc-900 dark:text-zinc-100">
                        {formatPaymentMethod(payment.paymentMethod)}
                      </td>
                      <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-400">
                        {payment.reference ? (
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {payment.reference}
                          </p>
                        ) : null}
                        {payment.notes ? (
                          <p className="text-xs">{payment.notes}</p>
                        ) : null}
                        {payment.status === "voided" && payment.voidReason ? (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Void reason: {payment.voidReason}
                          </p>
                        ) : null}
                        {!payment.reference &&
                        !payment.notes &&
                        payment.status !== "voided"
                          ? "—"
                          : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                            payment.status === "completed"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {payment.status === "completed"
                            ? "Completed"
                            : "Voided"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-top font-medium text-zinc-950 dark:text-zinc-50">
                        {formatCurrency(payment.amount, order.currencyCode)}
                      </td>
                      {canAdmin ? (
                        <td className="px-4 py-3 text-right align-top print:hidden">
                          {payment.status === "completed" ? (
                            <button
                              type="button"
                              onClick={() => setVoidTargetPayment(payment)}
                              className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-white/20 dark:text-red-300 dark:hover:bg-red-950"
                            >
                              Void
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-400">
                              Voided
                            </span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {isEditOpen && order.status === "draft" && order.formOptions ? (
        <SalesOrderFormDialog
          key={`${order.id}-${order.updatedAt}`}
          isOpen
          onClose={() => setIsEditOpen(false)}
          formOptions={order.formOptions}
          currencyCode={order.currencyCode}
          order={order}
        />
      ) : null}

      {isConfirmOpen ? (
        <ConfirmOrderDialog
          key={`confirm-${order.id}-${order.updatedAt}`}
          order={order}
          onClose={() => setIsConfirmOpen(false)}
        />
      ) : null}

      {isCompleteOpen ? (
        <CompleteOrderDialog
          key={`complete-${order.id}`}
          order={order}
          onClose={() => setIsCompleteOpen(false)}
        />
      ) : null}

      {isCancelOpen ? (
        <CancelOrderDialog
          key={`cancel-${order.id}`}
          order={order}
          onClose={() => setIsCancelOpen(false)}
        />
      ) : null}

      {isRecordPaymentOpen ? (
        <RecordPaymentDialog
          key={`pay-${order.id}-${order.outstandingBalance}`}
          order={order}
          onClose={() => setIsRecordPaymentOpen(false)}
        />
      ) : null}

      {voidTargetPayment ? (
        <VoidPaymentDialog
          key={`void-${voidTargetPayment.id}`}
          payment={voidTargetPayment}
          currencyCode={order.currencyCode}
          onClose={() => setVoidTargetPayment(null)}
        />
      ) : null}
    </section>
  );
}
