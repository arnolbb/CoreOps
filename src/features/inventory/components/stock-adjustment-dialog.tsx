"use client";

import { useEffect, useId, useRef, useState } from "react";
import { adjustStockAction } from "../actions/adjust-stock";
import { stockAdjustmentSchema } from "../schemas/stock-adjustment-schema";
import type { InventoryProductOption, WarehouseItem } from "../types/inventory";

type AdjustmentType = "opening_stock" | "adjustment_in" | "adjustment_out";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  warehouses: WarehouseItem[];
  products: InventoryProductOption[];
  defaultWarehouseId?: string;
  defaultProductId?: string;
};

export function StockAdjustmentDialog({
  isOpen,
  onClose,
  warehouses,
  products,
  defaultWarehouseId,
  defaultProductId,
}: Props) {
  const titleId = useId();
  const fieldPrefix = useId();

  const [warehouseId, setWarehouseId] = useState(
    () => defaultWarehouseId ?? warehouses[0]?.id ?? "",
  );
  const [productId, setProductId] = useState(
    () => defaultProductId ?? products[0]?.id ?? "",
  );
  const [adjustmentType, setAdjustmentType] =
    useState<AdjustmentType>("opening_stock");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const idempotencyKeyRef = useRef<string | null>(null);

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

  const canSubmit = warehouses.length > 0 && products.length > 0;

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current = null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!canSubmit) {
      setErrorMessage(
        "Create at least one active warehouse and one tracked product first.",
      );
      return;
    }

    const trimmedReason = reason.trim();
    if (
      (adjustmentType === "adjustment_in" ||
        adjustmentType === "adjustment_out") &&
      trimmedReason.length === 0
    ) {
      setFieldErrors({
        reason: ["Reason is required for manual stock adjustments."],
      });
      return;
    }

    const numericQuantity = Number(quantity);
    const parsed = stockAdjustmentSchema.safeParse({
      warehouseId,
      productId,
      adjustmentType,
      quantity: numericQuantity,
      reason: trimmedReason || null,
    });

    if (!parsed.success) {
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }

    setIsSubmitting(true);
    const result = await adjustStockAction({
      warehouseId,
      productId,
      adjustmentType,
      quantity: numericQuantity,
      reason: trimmedReason || null,
      idempotencyKey: idempotencyKeyRef.current,
    });
    setIsSubmitting(false);

    if (result.ok) {
      resetIdempotencyKey();
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-xl font-semibold">
            Adjust Stock
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close stock adjustment dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {!canSubmit ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            At least one active warehouse and one active inventory-tracked
            product are required before adjusting stock.
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
          <div>
            <label
              htmlFor={`${fieldPrefix}-warehouse`}
              className="block text-sm font-medium"
            >
              Warehouse *
            </label>
            <select
              id={`${fieldPrefix}-warehouse`}
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                resetIdempotencyKey();
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
            {fieldErrors.warehouseId ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.warehouseId[0]}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-product`}
              className="block text-sm font-medium"
            >
              Product *
            </label>
            <select
              id={`${fieldPrefix}-product`}
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                resetIdempotencyKey();
              }}
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              required
            >
              {products.length === 0 ? (
                <option value="">No tracked products</option>
              ) : (
                products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {product.sku ? ` (${product.sku})` : ""}
                  </option>
                ))
              )}
            </select>
            {fieldErrors.productId ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.productId[0]}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${fieldPrefix}-adjustmentType`}
                className="block text-sm font-medium"
              >
                Adjustment Type *
              </label>
              <select
                id={`${fieldPrefix}-adjustmentType`}
                value={adjustmentType}
                onChange={(e) => {
                  setAdjustmentType(e.target.value as AdjustmentType);
                  resetIdempotencyKey();
                }}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="opening_stock">Opening Stock</option>
                <option value="adjustment_in">Adjustment In</option>
                <option value="adjustment_out">Adjustment Out</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-quantity`}
                className="block text-sm font-medium"
              >
                Quantity *
              </label>
              <input
                id={`${fieldPrefix}-quantity`}
                type="number"
                step="0.001"
                min="0.001"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  resetIdempotencyKey();
                }}
                placeholder="0"
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {fieldErrors.quantity ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.quantity[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-reason`}
              className="block text-sm font-medium"
            >
              Reason {adjustmentType === "opening_stock" ? "(optional)" : "*"}
            </label>
            <textarea
              id={`${fieldPrefix}-reason`}
              rows={2}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                resetIdempotencyKey();
              }}
              placeholder="Explain why stock is being adjusted"
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            {fieldErrors.reason ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.reason[0]}
              </p>
            ) : null}
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
              {isSubmitting ? "Applying..." : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
