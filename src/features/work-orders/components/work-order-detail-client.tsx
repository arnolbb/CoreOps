"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import {
  recordWorkOrderItemUsageAction,
  transitionWorkOrderStatusAction,
  uploadWorkOrderAttachmentAction,
} from "../actions/work-order-actions";
import {
  workOrderAttachmentMetaSchema,
  workOrderItemUsageSchema,
} from "../schemas/work-order-schema";
import {
  WORK_ORDER_ATTACHMENT_TYPES,
  type WorkOrderAttachmentType,
  type WorkOrderDetailData,
  type WorkOrderStatus,
} from "../types/work-order";
import { WorkOrderLifecycleDialog } from "./work-order-action-dialogs";
import { WorkOrderFormDialog } from "./work-order-form-dialog";
import {
  WORK_ORDER_ATTACHMENT_TYPE_LABELS,
  WORK_ORDER_TYPE_LABELS,
  WorkOrderPriorityBadge,
  WorkOrderStatusBadge,
} from "./work-order-status-badge";

type Props = {
  data: WorkOrderDetailData;
  canManage: boolean;
  canReopen: boolean;
  canOperate: boolean;
};

type LifecycleDialogKind = "complete" | "cancel" | "reopen" | null;

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function WorkOrderDetailClient({
  data,
  canManage,
  canReopen,
  canOperate,
}: Props) {
  const { workOrder, warehouses, products, customers, addresses, assignees } =
    data;
  const itemFormPrefix = useId();
  const attachmentFormPrefix = useId();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [lifecycleDialog, setLifecycleDialog] =
    useState<LifecycleDialogKind>(null);
  const [transitionPending, setTransitionPending] =
    useState<WorkOrderStatus | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Used items form state
  const [warehouseId, setWarehouseId] = useState(() => warehouses[0]?.id ?? "");
  const [productId, setProductId] = useState(() => products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemSuccess, setItemSuccess] = useState<string | null>(null);
  const [itemFieldErrors, setItemFieldErrors] = useState<
    Record<string, string[]>
  >({});
  const itemIdempotencyKeyRef = useRef<string | null>(null);

  // Attachments form state
  const [attachmentType, setAttachmentType] =
    useState<WorkOrderAttachmentType>("photo");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isLocked =
    workOrder.status === "completed" || workOrder.status === "cancelled";
  const canUseItemsForm = workOrder.status === "in_progress" && canOperate;
  const canUploadAttachment = !isLocked && canOperate;
  const canUseItemsInputs = warehouses.length > 0 && products.length > 0;

  const resetItemIdempotencyKey = () => {
    itemIdempotencyKeyRef.current = null;
  };

  const handleQuickTransition = async (targetStatus: WorkOrderStatus) => {
    setBannerError(null);
    setBannerSuccess(null);
    setTransitionPending(targetStatus);

    const result = await transitionWorkOrderStatusAction({
      workOrderId: workOrder.id,
      targetStatus,
    });

    setTransitionPending(null);

    if (result.ok) {
      setBannerSuccess(result.message);
    } else {
      setBannerError(result.message);
    }
  };

  const handleItemUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemError(null);
    setItemSuccess(null);
    setItemFieldErrors({});

    if (!canUseItemsInputs) {
      setItemError(
        "Create at least one active warehouse and one tracked goods product first.",
      );
      return;
    }

    const numericQuantity = Number(quantity);
    const parsed = workOrderItemUsageSchema.safeParse({
      workOrderId: workOrder.id,
      warehouseId,
      productId,
      quantity: numericQuantity,
    });

    if (!parsed.success) {
      setItemFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    if (!itemIdempotencyKeyRef.current) {
      itemIdempotencyKeyRef.current = crypto.randomUUID();
    }

    setIsSubmittingItem(true);
    const result = await recordWorkOrderItemUsageAction({
      workOrderId: workOrder.id,
      warehouseId,
      productId,
      quantity: numericQuantity,
      idempotencyKey: itemIdempotencyKeyRef.current,
    });
    setIsSubmittingItem(false);

    if (result.ok) {
      resetItemIdempotencyKey();
      setQuantity("");
      setItemSuccess(result.message);
    } else {
      setItemError(result.message);
      if (result.fieldErrors) {
        setItemFieldErrors(result.fieldErrors);
      }
    }
  };

  const handleAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Select a file to upload.");
      return;
    }

    const parsedMeta = workOrderAttachmentMetaSchema.safeParse({
      workOrderId: workOrder.id,
      attachmentType,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    if (!parsedMeta.success) {
      const errors = parsedMeta.error.flatten().fieldErrors;
      setUploadError(
        errors.mimeType?.[0] ??
          errors.sizeBytes?.[0] ??
          errors.attachmentType?.[0] ??
          "Invalid attachment file.",
      );
      return;
    }

    const formData = new FormData();
    formData.set("workOrderId", workOrder.id);
    formData.set("attachmentType", attachmentType);
    formData.set("file", file);

    setIsUploading(true);
    const result = await uploadWorkOrderAttachmentAction(formData);
    setIsUploading(false);

    if (result.ok) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setUploadSuccess(result.message);
    } else {
      setUploadError(result.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/work-orders"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to Work Orders
        </Link>
      </div>

      <header className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-950 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {workOrder.workOrderNumber}
            </h1>
            <WorkOrderStatusBadge status={workOrder.status} />
            <WorkOrderPriorityBadge priority={workOrder.priority} />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {WORK_ORDER_TYPE_LABELS[workOrder.workType]} · Created{" "}
            {formatDateTime(workOrder.createdAt)} UTC
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && !isLocked ? (
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="rounded-lg border border-black/15 px-3.5 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-900"
            >
              Edit Work Order
            </button>
          ) : null}

          {workOrder.status === "draft" && canManage ? (
            <button
              type="button"
              onClick={() => handleQuickTransition("scheduled")}
              disabled={Boolean(transitionPending)}
              className="rounded-lg border border-black/15 px-3.5 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/20 dark:hover:bg-zinc-900"
            >
              {transitionPending === "scheduled" ? "Scheduling..." : "Schedule"}
            </button>
          ) : null}

          {(workOrder.status === "draft" || workOrder.status === "scheduled") &&
          canOperate ? (
            <button
              type="button"
              onClick={() => handleQuickTransition("in_progress")}
              disabled={Boolean(transitionPending)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {transitionPending === "in_progress"
                ? "Starting..."
                : "Start Work"}
            </button>
          ) : null}

          {workOrder.status === "scheduled" && canManage ? (
            <button
              type="button"
              onClick={() => handleQuickTransition("draft")}
              disabled={Boolean(transitionPending)}
              className="rounded-lg border border-black/15 px-3.5 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/20 dark:hover:bg-zinc-900"
            >
              {transitionPending === "draft" ? "Updating..." : "Back to Draft"}
            </button>
          ) : null}

          {workOrder.status === "in_progress" && canOperate ? (
            <button
              type="button"
              onClick={() => {
                setBannerError(null);
                setBannerSuccess(null);
                setLifecycleDialog("complete");
              }}
              disabled={Boolean(transitionPending)}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Complete Work Order
            </button>
          ) : null}

          {!isLocked && canManage ? (
            <button
              type="button"
              onClick={() => {
                setBannerError(null);
                setBannerSuccess(null);
                setLifecycleDialog("cancel");
              }}
              disabled={Boolean(transitionPending)}
              className="rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
            >
              Cancel Work Order
            </button>
          ) : null}

          {workOrder.status === "completed" && canReopen ? (
            <button
              type="button"
              onClick={() => {
                setBannerError(null);
                setBannerSuccess(null);
                setLifecycleDialog("reopen");
              }}
              className="rounded-lg border border-black/15 px-3.5 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-900"
            >
              Reopen Work Order
            </button>
          ) : null}
        </div>
      </header>

      {bannerSuccess ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {bannerSuccess}
        </div>
      ) : null}

      {bannerError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {bannerError}
        </div>
      ) : null}

      {workOrder.status === "completed" ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/50">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
              Completed &amp; Locked
            </h2>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Completed {formatDateTime(workOrder.completedAt)} UTC
            </p>
          </div>
          <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-200">
            This work order is locked. Editing, stock consumption, and
            attachments are disabled unless reopened by an Owner or Admin.
          </p>
          {workOrder.completionNotes ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-white/80 p-3 dark:border-emerald-900 dark:bg-zinc-950/70">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Completion Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
                {workOrder.completionNotes}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {workOrder.status === "cancelled" ? (
        <section className="rounded-2xl border border-red-200 bg-red-50/70 p-5 dark:border-red-900 dark:bg-red-950/50">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-red-950 dark:text-red-100">
              Cancelled
            </h2>
            <p className="text-xs text-red-800 dark:text-red-300">
              Cancelled {formatDateTime(workOrder.cancelledAt)} UTC
            </p>
          </div>
          {workOrder.cancellationReason ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-white/80 p-3 dark:border-red-900 dark:bg-zinc-950/70">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Cancellation Reason
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
                {workOrder.cancellationReason}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-950 lg:col-span-2">
          <h2 className="text-lg font-semibold">Work Order Details</h2>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-900 dark:text-zinc-100">
              {workOrder.description}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-4 border-t border-black/10 pt-4 text-sm dark:border-white/15 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Assignee
              </dt>
              <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {workOrder.assignedToEmail ?? "Unassigned"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Work Type
              </dt>
              <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {WORK_ORDER_TYPE_LABELS[workOrder.workType]}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Scheduled Start (UTC)
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {formatDateTime(workOrder.scheduledStart)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Scheduled End (UTC)
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {formatDateTime(workOrder.scheduledEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Started At (UTC)
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {formatDateTime(workOrder.startedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Last Updated (UTC)
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {formatDateTime(workOrder.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Customer &amp; Site</h2>
          <div className="space-y-2 text-sm">
            <div>
              <p className="font-medium text-zinc-950 dark:text-zinc-50">
                {workOrder.customerName}
              </p>
              {workOrder.customerCompanyName ? (
                <p className="text-zinc-600 dark:text-zinc-400">
                  {workOrder.customerCompanyName}
                </p>
              ) : null}
            </div>
            {workOrder.customerPhone ? (
              <p className="text-zinc-600 dark:text-zinc-400">
                Phone: {workOrder.customerPhone}
              </p>
            ) : null}
            {workOrder.customerEmail ? (
              <p className="text-zinc-600 dark:text-zinc-400">
                Email: {workOrder.customerEmail}
              </p>
            ) : null}
          </div>

          <div className="border-t border-black/10 pt-4 text-sm dark:border-white/15">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Site Address
            </p>
            {workOrder.customerAddress ? (
              <div className="mt-1 space-y-0.5 text-zinc-700 dark:text-zinc-300">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {workOrder.customerAddress.label}
                </p>
                <p>{workOrder.customerAddress.addressLine1}</p>
                {workOrder.customerAddress.addressLine2 ? (
                  <p>{workOrder.customerAddress.addressLine2}</p>
                ) : null}
                <p>
                  {[
                    workOrder.customerAddress.city,
                    workOrder.customerAddress.province,
                    workOrder.customerAddress.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-xs uppercase text-zinc-500">
                  {workOrder.customerAddress.countryCode}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                No site address specified.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Used Stock Items */}
      <section className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-950">
        <div>
          <h2 className="text-lg font-semibold">Used Stock Items</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Inventory-tracked goods consumed for this work order.
          </p>
        </div>

        {workOrder.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 p-4 text-sm text-zinc-600 dark:border-white/20 dark:text-zinc-400">
            No stock items recorded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/15">
            <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/15">
              <caption className="sr-only">Used stock items</caption>
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    Item
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Warehouse
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Quantity
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Recorded (UTC)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/15">
                {workOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-zinc-950 dark:text-zinc-50">
                      {item.nameSnapshot}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {item.warehouseName} ({item.warehouseCode})
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {item.quantity} {item.unitSnapshot}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {formatDateTime(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canUseItemsForm ? (
          <form
            onSubmit={handleItemUsageSubmit}
            className="space-y-4 border-t border-black/10 pt-4 dark:border-white/15"
          >
            <h3 className="text-sm font-semibold">Record Used Item</h3>

            {!canUseItemsInputs ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                Create at least one active warehouse and one active
                inventory-tracked goods product before recording item usage.
              </div>
            ) : null}

            {itemError ? (
              <div
                role="alert"
                className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
              >
                {itemError}
              </div>
            ) : null}

            {itemSuccess ? (
              <div
                role="status"
                className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                {itemSuccess}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor={`${itemFormPrefix}-warehouse`}
                  className="block text-sm font-medium"
                >
                  Warehouse *
                </label>
                <select
                  id={`${itemFormPrefix}-warehouse`}
                  value={warehouseId}
                  onChange={(e) => {
                    setWarehouseId(e.target.value);
                    resetItemIdempotencyKey();
                  }}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  required
                >
                  {warehouses.length === 0 ? (
                    <option value="">No active warehouses</option>
                  ) : (
                    warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))
                  )}
                </select>
                {itemFieldErrors.warehouseId ? (
                  <p className="mt-1 text-xs text-red-500">
                    {itemFieldErrors.warehouseId[0]}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor={`${itemFormPrefix}-product`}
                  className="block text-sm font-medium"
                >
                  Product *
                </label>
                <select
                  id={`${itemFormPrefix}-product`}
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    resetItemIdempotencyKey();
                  }}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  required
                >
                  {products.length === 0 ? (
                    <option value="">No tracked goods products</option>
                  ) : (
                    products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.sku ? ` (${product.sku})` : ""}
                      </option>
                    ))
                  )}
                </select>
                {itemFieldErrors.productId ? (
                  <p className="mt-1 text-xs text-red-500">
                    {itemFieldErrors.productId[0]}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor={`${itemFormPrefix}-quantity`}
                  className="block text-sm font-medium"
                >
                  Quantity *
                </label>
                <input
                  id={`${itemFormPrefix}-quantity`}
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    resetItemIdempotencyKey();
                  }}
                  placeholder="0"
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  required
                />
                {itemFieldErrors.quantity ? (
                  <p className="mt-1 text-xs text-red-500">
                    {itemFieldErrors.quantity[0]}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingItem || !canUseItemsInputs}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isSubmittingItem ? "Recording..." : "Record Used Item"}
              </button>
            </div>
          </form>
        ) : !isLocked && canOperate ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Start work on this work order to record stock item consumption.
          </p>
        ) : null}
      </section>

      {/* Attachments */}
      <section className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-950">
        <div>
          <h2 className="text-lg font-semibold">Attachments</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Photos, signed documents, and supporting files stored privately for
            your organization.
          </p>
        </div>

        {workOrder.attachments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 p-4 text-sm text-zinc-600 dark:border-white/20 dark:text-zinc-400">
            No attachments uploaded yet.
          </div>
        ) : (
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/15 dark:border-white/15">
            {workOrder.attachments.map((att) => (
              <li
                key={att.id}
                className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      {att.fileName}
                    </span>
                    <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-zinc-600 dark:border-white/15 dark:text-zinc-300">
                      {WORK_ORDER_ATTACHMENT_TYPE_LABELS[att.attachmentType]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {att.mimeType} · {formatFileSize(att.sizeBytes)} ·{" "}
                    {formatDateTime(att.createdAt)} UTC
                  </p>
                </div>

                {att.signedUrl ? (
                  <a
                    href={att.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-900"
                  >
                    View / Download
                  </a>
                ) : (
                  <span className="text-xs text-zinc-400">Unavailable</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {canUploadAttachment ? (
          <form
            onSubmit={handleAttachmentSubmit}
            className="space-y-4 border-t border-black/10 pt-4 dark:border-white/15"
          >
            <h3 className="text-sm font-semibold">Upload Attachment</h3>

            {uploadError ? (
              <div
                role="alert"
                className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
              >
                {uploadError}
              </div>
            ) : null}

            {uploadSuccess ? (
              <div
                role="status"
                className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                {uploadSuccess}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`${attachmentFormPrefix}-type`}
                  className="block text-sm font-medium"
                >
                  Attachment Type *
                </label>
                <select
                  id={`${attachmentFormPrefix}-type`}
                  value={attachmentType}
                  onChange={(e) =>
                    setAttachmentType(e.target.value as WorkOrderAttachmentType)
                  }
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {WORK_ORDER_ATTACHMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {WORK_ORDER_ATTACHMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`${attachmentFormPrefix}-file`}
                  className="block text-sm font-medium"
                >
                  File * (JPEG, PNG, WebP, or PDF, max 10 MB)
                </label>
                <input
                  ref={fileInputRef}
                  id={`${attachmentFormPrefix}-file`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isUploading ? "Uploading..." : "Upload Attachment"}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {isEditOpen ? (
        <WorkOrderFormDialog
          key={`${workOrder.id}-${workOrder.updatedAt}`}
          isOpen
          onClose={() => setIsEditOpen(false)}
          customers={customers}
          addresses={addresses}
          assignees={assignees}
          workOrder={workOrder}
        />
      ) : null}

      {lifecycleDialog ? (
        <WorkOrderLifecycleDialog
          key={lifecycleDialog}
          kind={lifecycleDialog}
          workOrderId={workOrder.id}
          workOrderNumber={workOrder.workOrderNumber}
          onClose={() => setLifecycleDialog(null)}
          onSuccess={(message) => setBannerSuccess(message)}
        />
      ) : null}
    </div>
  );
}
