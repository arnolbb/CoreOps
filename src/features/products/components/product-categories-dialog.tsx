"use client";

import { useEffect, useId, useState } from "react";
import {
  createProductCategoryAction,
  deleteProductCategoryAction,
} from "../actions/product-category-actions";
import { productCategoryFormSchema } from "../schemas/product-category-schema";
import type { ProductCategory } from "../types/product";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categories: ProductCategory[];
};

export function ProductCategoriesDialog({
  isOpen,
  onClose,
  categories,
}: Props) {
  const titleId = useId();
  const nameInputId = useId();

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting && !deletingId) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, deletingId, onClose]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldError(null);

    const parsed = productCategoryFormSchema.safeParse({ name });
    if (!parsed.success) {
      setFieldError(
        parsed.error.flatten().fieldErrors.name?.[0] ??
          "Invalid category name.",
      );
      return;
    }

    setIsSubmitting(true);
    const result = await createProductCategoryAction({ name });
    setIsSubmitting(false);

    if (result.ok) {
      setName("");
    } else {
      setErrorMessage(result.message);
      if (result.fieldErrors?.name?.[0]) {
        setFieldError(result.fieldErrors.name[0]);
      }
    }
  };

  const handleDelete = async (categoryId: string) => {
    setErrorMessage(null);
    setDeletingId(categoryId);

    const result = await deleteProductCategoryAction(categoryId);

    setDeletingId(null);
    setConfirmDeleteId(null);

    if (!result.ok) {
      setErrorMessage(result.message);
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
            Product Categories
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || Boolean(deletingId)}
            aria-label="Close categories dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleCreate} className="mt-4 space-y-2">
          <label htmlFor={nameInputId} className="block text-sm font-medium">
            New Category Name
          </label>
          <div className="flex gap-2">
            <input
              id={nameInputId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Filters, Spare Parts, Services"
              className="w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "Adding..." : "Add"}
            </button>
          </div>
          {fieldError ? (
            <p className="text-xs text-red-500">{fieldError}</p>
          ) : null}
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Existing Categories
          </h3>
          {categories.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              No categories yet. Add one above to organize your products.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/15 dark:border-white/15">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <span>{category.name}</span>
                  {confirmDeleteId === category.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(category.id)}
                        disabled={deletingId === category.id}
                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === category.id
                          ? "Deleting..."
                          : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deletingId === category.id}
                        className="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(category.id)}
                      aria-label={`Delete ${category.name}`}
                      className="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-white/20 dark:text-red-300 dark:hover:bg-red-950"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
