"use client";

import { useEffect, useId, useState } from "react";
import {
  archiveProductAction,
  getProductForEditAction,
} from "../actions/product-actions";
import type { ProductCategory, ProductDetail } from "../types/product";
import { ProductFormDialog } from "./product-form-dialog";

type Props = {
  productId: string;
  productName: string;
  canManage: boolean;
  canArchive: boolean;
  canViewCost: boolean;
  categories: ProductCategory[];
};

export function ProductRowActions({
  productId,
  productName,
  canManage,
  canArchive,
  canViewCost,
  categories,
}: Props) {
  const archiveTitleId = useId();

  const [editingProduct, setEditingProduct] = useState<ProductDetail | null>(
    null,
  );
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isConfirmArchiveOpen, setIsConfirmArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfirmArchiveOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isArchiving) {
        setIsConfirmArchiveOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConfirmArchiveOpen, isArchiving]);

  const handleOpenEdit = async () => {
    setIsLoadingEdit(true);
    setErrorMessage(null);

    try {
      const result = await getProductForEditAction(productId);
      if (result.ok) {
        setEditingProduct(result.data);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage("Unable to load product details.");
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const handleConfirmArchive = async () => {
    setIsArchiving(true);
    setErrorMessage(null);

    try {
      const result = await archiveProductAction(productId);
      if (result.ok) {
        setIsConfirmArchiveOpen(false);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage("Unable to archive product.");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {canManage ? (
          <button
            type="button"
            onClick={handleOpenEdit}
            disabled={isLoadingEdit || isArchiving}
            aria-label={`Edit ${productName}`}
            className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            {isLoadingEdit ? "Loading..." : "Edit"}
          </button>
        ) : null}

        {canArchive ? (
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setIsConfirmArchiveOpen(true);
            }}
            disabled={isLoadingEdit || isArchiving}
            aria-label={`Archive ${productName}`}
            className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-white/20 dark:text-red-300 dark:hover:bg-red-950"
          >
            Archive
          </button>
        ) : null}
      </div>

      {errorMessage && !isConfirmArchiveOpen ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {editingProduct ? (
        <ProductFormDialog
          key={`${editingProduct.id}-${editingProduct.updatedAt}`}
          isOpen
          product={editingProduct}
          categories={categories}
          canViewCost={canViewCost}
          onClose={() => setEditingProduct(null)}
        />
      ) : null}

      {isConfirmArchiveOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby={archiveTitleId}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 id={archiveTitleId} className="text-lg font-semibold">
              Archive product?
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              <strong>{productName}</strong> will be marked inactive and hidden
              from default active product lists. Historical sales and inventory
              records will remain intact, and archived products cannot be
              edited.
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
                onClick={() => setIsConfirmArchiveOpen(false)}
                disabled={isArchiving}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiving}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isArchiving ? "Archiving..." : "Confirm archive"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
