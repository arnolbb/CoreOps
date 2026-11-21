"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  createSalesOrderDraftAction,
  updateSalesOrderDraftAction,
} from "../actions/sales-actions";
import {
  salesOrderDraftSchema,
  updateSalesOrderDraftSchema,
  type SalesOrderDraftValues,
} from "../schemas/sales-order-schema";
import { formatCurrency } from "../services/sales-formatters";
import type { SalesFormOptions, SalesOrderDetail } from "../types/sales";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  formOptions: SalesFormOptions;
  currencyCode: string;
  order?: SalesOrderDetail | null;
};

type ItemRowState = {
  rowKey: string;
  source: "catalog" | "custom";
  productId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
};

type FormState = {
  customerId: string;
  warehouseId: string;
  orderNumber: string;
  notes: string;
  items: ItemRowState[];
};

function createEmptyCatalogRow(
  rowKey: string,
  formOptions: SalesFormOptions,
): ItemRowState {
  const firstProduct = formOptions.products[0];
  if (!firstProduct) {
    return {
      rowKey,
      source: "custom",
      productId: "",
      name: "",
      sku: "",
      unit: "pcs",
      quantity: "1",
      unitPrice: "0",
      discountAmount: "0",
      taxAmount: "0",
    };
  }

  return {
    rowKey,
    source: "catalog",
    productId: firstProduct.id,
    name: firstProduct.name,
    sku: firstProduct.sku ?? "",
    unit: firstProduct.unit,
    quantity: "1",
    unitPrice: String(firstProduct.sellingPrice),
    discountAmount: "0",
    taxAmount: "0",
  };
}

function buildInitialFormState(
  formOptions: SalesFormOptions,
  order?: SalesOrderDetail | null,
): FormState {
  if (order) {
    const items: ItemRowState[] =
      order.items.length > 0
        ? order.items.map((item, index) => ({
            rowKey: `row-${index}`,
            source: item.productId ? "catalog" : "custom",
            productId: item.productId ?? "",
            name: item.nameSnapshot,
            sku: item.skuSnapshot ?? "",
            unit: item.unitSnapshot,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            discountAmount: String(item.discountAmount),
            taxAmount: String(item.taxAmount),
          }))
        : [createEmptyCatalogRow("row-0", formOptions)];

    return {
      customerId: order.customer.id,
      warehouseId: order.warehouse?.id ?? "",
      orderNumber: order.orderNumber,
      notes: order.notes ?? "",
      items,
    };
  }

  return {
    customerId: formOptions.customers[0]?.id ?? "",
    warehouseId: "",
    orderNumber: "",
    notes: "",
    items: [createEmptyCatalogRow("row-0", formOptions)],
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function SalesOrderFormDialog({
  isOpen,
  onClose,
  formOptions,
  currencyCode,
  order,
}: Props) {
  const router = useRouter();
  const isEditing = Boolean(order);
  const titleId = useId();
  const fieldPrefix = useId();

  const [formState, setFormState] = useState<FormState>(() =>
    buildInitialFormState(formOptions, order),
  );
  const nextRowCounterRef = useRef(formState.items.length + 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

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

  const hasCustomers = formOptions.customers.length > 0;

  const updateItem = (
    rowKey: string,
    updater: (prev: ItemRowState) => ItemRowState,
  ) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.rowKey === rowKey ? updater(item) : item,
      ),
    }));
  };

  const handleSourceChange = (
    rowKey: string,
    nextSource: "catalog" | "custom",
  ) => {
    updateItem(rowKey, (item) => {
      if (nextSource === "custom") {
        return {
          ...item,
          source: "custom",
          productId: "",
          name: "",
          sku: "",
          unit: "pcs",
          unitPrice: "0",
        };
      }

      const firstProduct = formOptions.products[0];
      return {
        ...item,
        source: "catalog",
        productId: firstProduct?.id ?? "",
        name: firstProduct?.name ?? "",
        sku: firstProduct?.sku ?? "",
        unit: firstProduct?.unit ?? "pcs",
        unitPrice: firstProduct ? String(firstProduct.sellingPrice) : "0",
      };
    });
  };

  const handleProductChange = (rowKey: string, nextProductId: string) => {
    const product = formOptions.products.find((p) => p.id === nextProductId);
    updateItem(rowKey, (item) => ({
      ...item,
      productId: nextProductId,
      name: product?.name ?? item.name,
      sku: product?.sku ?? "",
      unit: product?.unit ?? item.unit,
      unitPrice: product ? String(product.sellingPrice) : item.unitPrice,
    }));
  };

  const handleAddItem = () => {
    const nextKey = `row-${nextRowCounterRef.current}`;
    nextRowCounterRef.current += 1;
    setFormState((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyCatalogRow(nextKey, formOptions)],
    }));
  };

  const handleRemoveItem = (rowKey: string) => {
    setFormState((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((item) => item.rowKey !== rowKey),
      };
    });
  };

  const estimatedTotals = formState.items.reduce(
    (acc, item) => {
      const qty = Math.max(Number(item.quantity) || 0, 0);
      const price = Math.max(Number(item.unitPrice) || 0, 0);
      const discount = Math.max(Number(item.discountAmount) || 0, 0);
      const tax = Math.max(Number(item.taxAmount) || 0, 0);
      const lineSub = roundMoney(qty * price);
      const lineTotal = roundMoney(Math.max(lineSub - discount + tax, 0));

      return {
        subtotal: roundMoney(acc.subtotal + lineSub),
        discountTotal: roundMoney(acc.discountTotal + discount),
        taxTotal: roundMoney(acc.taxTotal + tax),
        grandTotal: roundMoney(acc.grandTotal + lineTotal),
      };
    },
    { subtotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0 },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setItemErrors({});

    if (!hasCustomers && !isEditing) {
      setErrorMessage(
        "Create at least one active customer before creating a sales order.",
      );
      return;
    }

    const payload: SalesOrderDraftValues = {
      customerId: formState.customerId,
      warehouseId: formState.warehouseId || null,
      orderNumber: isEditing ? undefined : formState.orderNumber || null,
      notes: formState.notes || null,
      items: formState.items.map((item) => ({
        productId: item.source === "catalog" ? item.productId : null,
        name: item.source === "custom" ? item.name : null,
        sku: item.source === "custom" ? item.sku || null : null,
        unit: item.source === "custom" ? item.unit : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || "0",
        taxAmount: item.taxAmount || "0",
      })),
    };

    const parsed = isEditing
      ? updateSalesOrderDraftSchema.safeParse(payload)
      : salesOrderDraftSchema.safeParse(payload);

    if (!parsed.success) {
      const nextItemErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "items" && typeof issue.path[1] === "number") {
          const idx = issue.path[1];
          const field = String(issue.path[2] ?? "general");
          const key = `${idx}-${field}`;
          if (!nextItemErrors[key]) {
            nextItemErrors[key] = issue.message;
          }
        }
      }
      setItemErrors(nextItemErrors);
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    setIsSubmitting(true);
    const result =
      isEditing && order
        ? await updateSalesOrderDraftAction(order.id, payload)
        : await createSalesOrderDraftAction(payload);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-xl font-semibold">
            {isEditing ? "Edit Draft Order" : "New Sales Order"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close sales order dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {!hasCustomers && !isEditing ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            At least one active customer is required before creating a sales
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${fieldPrefix}-customer`}
                className="block text-sm font-medium"
              >
                Customer *
              </label>
              <select
                id={`${fieldPrefix}-customer`}
                value={formState.customerId}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              >
                {formOptions.customers.length === 0 ? (
                  <option value="">No active customers</option>
                ) : (
                  formOptions.customers.map((customer) => (
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
                htmlFor={`${fieldPrefix}-warehouse`}
                className="block text-sm font-medium"
              >
                Fulfillment Warehouse
              </label>
              <select
                id={`${fieldPrefix}-warehouse`}
                value={formState.warehouseId}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    warehouseId: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Select warehouse later</option>
                {formOptions.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
              {fieldErrors.warehouseId ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.warehouseId[0]}
                </p>
              ) : null}
            </div>

            {!isEditing ? (
              <div>
                <label
                  htmlFor={`${fieldPrefix}-orderNumber`}
                  className="block text-sm font-medium"
                >
                  Order Number (optional)
                </label>
                <input
                  id={`${fieldPrefix}-orderNumber`}
                  type="text"
                  value={formState.orderNumber}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      orderNumber: e.target.value,
                    }))
                  }
                  placeholder="Auto-generated if blank"
                  maxLength={50}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                {fieldErrors.orderNumber ? (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldErrors.orderNumber[0]}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className={isEditing ? "sm:col-span-2" : ""}>
              <label
                htmlFor={`${fieldPrefix}-notes`}
                className="block text-sm font-medium"
              >
                Notes
              </label>
              <textarea
                id={`${fieldPrefix}-notes`}
                rows={2}
                value={formState.notes}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Optional order notes"
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {fieldErrors.notes ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.notes[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line Items</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
              >
                Add Item
              </button>
            </div>

            {fieldErrors.items ? (
              <p className="text-xs text-red-500">{fieldErrors.items[0]}</p>
            ) : null}

            <div className="space-y-3">
              {formState.items.map((item, index) => {
                const rowPrefix = `${fieldPrefix}-item-${index}`;
                const qty = Math.max(Number(item.quantity) || 0, 0);
                const price = Math.max(Number(item.unitPrice) || 0, 0);
                const disc = Math.max(Number(item.discountAmount) || 0, 0);
                const tax = Math.max(Number(item.taxAmount) || 0, 0);
                const lineTotal = roundMoney(
                  Math.max(roundMoney(qty * price) - disc + tax, 0),
                );

                return (
                  <div
                    key={item.rowKey}
                    className="rounded-xl border border-black/10 p-4 dark:border-white/15"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Item #{index + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Est. Line: {formatCurrency(lineTotal, currencyCode)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.rowKey)}
                          disabled={formState.items.length <= 1 || isSubmitting}
                          aria-label={`Remove item ${index + 1}`}
                          className="rounded border border-black/15 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-white/20 dark:text-red-300 dark:hover:bg-red-950"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                      <div>
                        <label
                          htmlFor={`${rowPrefix}-source`}
                          className="block text-xs font-medium"
                        >
                          Item Type
                        </label>
                        <select
                          id={`${rowPrefix}-source`}
                          value={item.source}
                          onChange={(e) =>
                            handleSourceChange(
                              item.rowKey,
                              e.target.value === "custom"
                                ? "custom"
                                : "catalog",
                            )
                          }
                          className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        >
                          <option value="catalog">Catalog Product</option>
                          <option value="custom">Custom Item</option>
                        </select>
                      </div>

                      {item.source === "catalog" ? (
                        <div className="lg:col-span-2">
                          <label
                            htmlFor={`${rowPrefix}-product`}
                            className="block text-xs font-medium"
                          >
                            Product *
                          </label>
                          <select
                            id={`${rowPrefix}-product`}
                            value={item.productId}
                            onChange={(e) =>
                              handleProductChange(item.rowKey, e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                            required
                          >
                            {formOptions.products.length === 0 ? (
                              <option value="">No active products</option>
                            ) : (
                              formOptions.products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                  {product.sku
                                    ? ` (${product.sku})`
                                    : ""} —{" "}
                                  {formatCurrency(
                                    product.sellingPrice,
                                    currencyCode,
                                  )}{" "}
                                  / {product.unit}
                                </option>
                              ))
                            )}
                          </select>
                          {itemErrors[`${index}-productId`] ? (
                            <p className="mt-1 text-xs text-red-500">
                              {itemErrors[`${index}-productId`]}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          <div>
                            <label
                              htmlFor={`${rowPrefix}-name`}
                              className="block text-xs font-medium"
                            >
                              Item Name *
                            </label>
                            <input
                              id={`${rowPrefix}-name`}
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                updateItem(item.rowKey, (prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Custom item name"
                              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                              required
                            />
                            {itemErrors[`${index}-name`] ? (
                              <p className="mt-1 text-xs text-red-500">
                                {itemErrors[`${index}-name`]}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <label
                              htmlFor={`${rowPrefix}-unit`}
                              className="block text-xs font-medium"
                            >
                              Unit *
                            </label>
                            <input
                              id={`${rowPrefix}-unit`}
                              type="text"
                              value={item.unit}
                              onChange={(e) =>
                                updateItem(item.rowKey, (prev) => ({
                                  ...prev,
                                  unit: e.target.value,
                                }))
                              }
                              placeholder="pcs, trip, hr"
                              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                              required
                            />
                            {itemErrors[`${index}-unit`] ? (
                              <p className="mt-1 text-xs text-red-500">
                                {itemErrors[`${index}-unit`]}
                              </p>
                            ) : null}
                          </div>
                        </>
                      )}

                      <div>
                        <label
                          htmlFor={`${rowPrefix}-quantity`}
                          className="block text-xs font-medium"
                        >
                          Quantity *
                        </label>
                        <input
                          id={`${rowPrefix}-quantity`}
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.rowKey, (prev) => ({
                              ...prev,
                              quantity: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                          required
                        />
                        {itemErrors[`${index}-quantity`] ? (
                          <p className="mt-1 text-xs text-red-500">
                            {itemErrors[`${index}-quantity`]}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label
                          htmlFor={`${rowPrefix}-unitPrice`}
                          className="block text-xs font-medium"
                        >
                          Unit Price *
                        </label>
                        <input
                          id={`${rowPrefix}-unitPrice`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.rowKey, (prev) => ({
                              ...prev,
                              unitPrice: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                          required
                        />
                        {itemErrors[`${index}-unitPrice`] ? (
                          <p className="mt-1 text-xs text-red-500">
                            {itemErrors[`${index}-unitPrice`]}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label
                          htmlFor={`${rowPrefix}-discount`}
                          className="block text-xs font-medium"
                        >
                          Discount
                        </label>
                        <input
                          id={`${rowPrefix}-discount`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discountAmount}
                          onChange={(e) =>
                            updateItem(item.rowKey, (prev) => ({
                              ...prev,
                              discountAmount: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                        {itemErrors[`${index}-discountAmount`] ? (
                          <p className="mt-1 text-xs text-red-500">
                            {itemErrors[`${index}-discountAmount`]}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label
                          htmlFor={`${rowPrefix}-tax`}
                          className="block text-xs font-medium"
                        >
                          Tax
                        </label>
                        <input
                          id={`${rowPrefix}-tax`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.taxAmount}
                          onChange={(e) =>
                            updateItem(item.rowKey, (prev) => ({
                              ...prev,
                              taxAmount: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                        {itemErrors[`${index}-taxAmount`] ? (
                          <p className="mt-1 text-xs text-red-500">
                            {itemErrors[`${index}-taxAmount`]}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-zinc-50 p-4 dark:border-white/15 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
                <p>
                  Estimated Subtotal:{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(estimatedTotals.subtotal, currencyCode)}
                  </span>
                </p>
                <p>
                  Estimated Discount:{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(
                      estimatedTotals.discountTotal,
                      currencyCode,
                    )}
                  </span>
                  {" · "}
                  Estimated Tax:{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(estimatedTotals.taxTotal, currencyCode)}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Estimated Total
                </p>
                <p className="text-xl font-semibold">
                  {formatCurrency(estimatedTotals.grandTotal, currencyCode)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Final totals are calculated and verified on the server when the
              draft is saved.
            </p>
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
              disabled={isSubmitting || (!hasCustomers && !isEditing)}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Draft"
                  : "Create Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
