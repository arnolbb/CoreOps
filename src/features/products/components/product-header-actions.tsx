"use client";

import { useState } from "react";
import type { ProductCategory } from "../types/product";
import { ProductCategoriesDialog } from "./product-categories-dialog";
import { ProductFormDialog } from "./product-form-dialog";

type Props = {
  canManage: boolean;
  canViewCost: boolean;
  categories: ProductCategory[];
};

export function ProductHeaderActions({
  canManage,
  canViewCost,
  categories,
}: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  if (!canManage) {
    return (
      <p className="rounded-full border border-black/10 px-3 py-1 text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
        Read-only
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsCategoriesOpen(true)}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-900"
        >
          Categories
        </button>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add Product
        </button>
      </div>

      {isCategoriesOpen ? (
        <ProductCategoriesDialog
          isOpen
          onClose={() => setIsCategoriesOpen(false)}
          categories={categories}
        />
      ) : null}

      {isCreateOpen ? (
        <ProductFormDialog
          isOpen
          onClose={() => setIsCreateOpen(false)}
          categories={categories}
          canViewCost={canViewCost}
        />
      ) : null}
    </>
  );
}
