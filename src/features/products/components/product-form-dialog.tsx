"use client";

import { useEffect, useId, useState } from "react";
import {
  createProductAction,
  updateProductAction,
} from "../actions/product-actions";
import {
  productFormSchema,
  type ProductFormValues,
} from "../schemas/product-form-schema";
import type {
  ProductCategory,
  ProductDetail,
  ProductType,
} from "../types/product";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  canViewCost: boolean;
  product?: ProductDetail | null;
};

type ProductFormState = {
  productType: ProductType;
  name: string;
  sku: string;
  categoryId: string;
  unit: string;
  description: string;
  costPrice: string;
  sellingPrice: string;
  trackInventory: boolean;
  minimumStock: string;
};

function buildInitialState(product?: ProductDetail | null): ProductFormState {
  return {
    productType: product?.productType ?? "goods",
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    categoryId: product?.categoryId ?? "",
    unit: product?.unit ?? "pcs",
    description: product?.description ?? "",
    costPrice:
      product?.costPrice !== null && product?.costPrice !== undefined
        ? String(product.costPrice)
        : "0",
    sellingPrice:
      product?.sellingPrice !== undefined ? String(product.sellingPrice) : "0",
    trackInventory:
      product?.productType === "service"
        ? false
        : (product?.trackInventory ?? true),
    minimumStock:
      product?.minimumStock !== null && product?.minimumStock !== undefined
        ? String(product.minimumStock)
        : "",
  };
}

export function ProductFormDialog({
  isOpen,
  onClose,
  categories,
  canViewCost,
  product,
}: Props) {
  const isEditing = Boolean(product);
  const titleId = useId();
  const fieldPrefix = useId();

  const [formState, setFormState] = useState<ProductFormState>(() =>
    buildInitialState(product),
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

  const isService = formState.productType === "service";

  const handleProductTypeChange = (nextType: ProductType) => {
    setFormState((prev) => ({
      ...prev,
      productType: nextType,
      trackInventory: nextType === "service" ? false : prev.trackInventory,
      minimumStock: nextType === "service" ? "" : prev.minimumStock,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    const payload: ProductFormValues = {
      productType: formState.productType,
      name: formState.name,
      sku: formState.sku,
      categoryId: formState.categoryId,
      unit: formState.unit,
      description: formState.description,
      costPrice: canViewCost ? formState.costPrice : 0,
      sellingPrice: formState.sellingPrice,
      trackInventory: isService ? false : formState.trackInventory,
      minimumStock:
        isService || !formState.trackInventory ? null : formState.minimumStock,
    };

    const parsed = productFormSchema.safeParse(payload);
    if (!parsed.success) {
      setIsSubmitting(false);
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    const result =
      isEditing && product
        ? await updateProductAction(product.id, payload)
        : await createProductAction(payload);

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
            {isEditing ? "Edit Product" : "Add Product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${fieldPrefix}-productType`}
                className="block text-sm font-medium"
              >
                Product Type
              </label>
              <select
                id={`${fieldPrefix}-productType`}
                name="productType"
                value={formState.productType}
                onChange={(e) =>
                  handleProductTypeChange(
                    e.target.value === "service" ? "service" : "goods",
                  )
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="goods">Goods</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-name`}
                className="block text-sm font-medium"
              >
                Product Name *
              </label>
              <input
                id={`${fieldPrefix}-name`}
                type="text"
                name="name"
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.name[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-sku`}
                className="block text-sm font-medium"
              >
                SKU
              </label>
              <input
                id={`${fieldPrefix}-sku`}
                type="text"
                name="sku"
                value={formState.sku}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, sku: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {fieldErrors.sku && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.sku[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-categoryId`}
                className="block text-sm font-medium"
              >
                Category
              </label>
              <select
                id={`${fieldPrefix}-categoryId`}
                name="categoryId"
                value={formState.categoryId}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.categoryId[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-unit`}
                className="block text-sm font-medium"
              >
                Unit *
              </label>
              <input
                id={`${fieldPrefix}-unit`}
                type="text"
                name="unit"
                value={formState.unit}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, unit: e.target.value }))
                }
                placeholder="pcs, box, visit"
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {fieldErrors.unit && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.unit[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-sellingPrice`}
                className="block text-sm font-medium"
              >
                Selling Price *
              </label>
              <input
                id={`${fieldPrefix}-sellingPrice`}
                type="number"
                name="sellingPrice"
                step="0.01"
                min="0"
                value={formState.sellingPrice}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    sellingPrice: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {fieldErrors.sellingPrice && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.sellingPrice[0]}
                </p>
              )}
            </div>

            {canViewCost ? (
              <div>
                <label
                  htmlFor={`${fieldPrefix}-costPrice`}
                  className="block text-sm font-medium"
                >
                  Cost Price
                </label>
                <input
                  id={`${fieldPrefix}-costPrice`}
                  type="number"
                  name="costPrice"
                  step="0.01"
                  min="0"
                  value={formState.costPrice}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      costPrice: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                {fieldErrors.costPrice && (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldErrors.costPrice[0]}
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex flex-col justify-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  id={`${fieldPrefix}-trackInventory`}
                  type="checkbox"
                  name="trackInventory"
                  checked={isService ? false : formState.trackInventory}
                  disabled={isService}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      trackInventory: e.target.checked,
                      minimumStock: e.target.checked ? prev.minimumStock : "",
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <span>Track inventory</span>
              </label>
              {isService ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Service items do not track stock.
                </p>
              ) : null}
            </div>

            {!isService && formState.trackInventory ? (
              <div>
                <label
                  htmlFor={`${fieldPrefix}-minimumStock`}
                  className="block text-sm font-medium"
                >
                  Minimum Stock
                </label>
                <input
                  id={`${fieldPrefix}-minimumStock`}
                  type="number"
                  name="minimumStock"
                  step="0.001"
                  min="0"
                  value={formState.minimumStock}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      minimumStock: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                {fieldErrors.minimumStock && (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldErrors.minimumStock[0]}
                  </p>
                )}
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <label
                htmlFor={`${fieldPrefix}-description`}
                className="block text-sm font-medium"
              >
                Description
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
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {fieldErrors.description && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.description[0]}
                </p>
              )}
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
              disabled={isSubmitting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
