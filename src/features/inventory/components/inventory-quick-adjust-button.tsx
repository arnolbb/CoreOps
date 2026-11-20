"use client";

import { useState } from "react";
import type { InventoryProductOption, WarehouseItem } from "../types/inventory";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

type Props = {
  warehouseId: string;
  productId: string;
  productName: string;
  activeWarehouses: WarehouseItem[];
  adjustableProducts: InventoryProductOption[];
};

export function InventoryQuickAdjustButton({
  warehouseId,
  productId,
  productName,
  activeWarehouses,
  adjustableProducts,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Adjust stock for ${productName}`}
        className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        Adjust
      </button>

      {isOpen ? (
        <StockAdjustmentDialog
          isOpen
          onClose={() => setIsOpen(false)}
          warehouses={activeWarehouses}
          products={adjustableProducts}
          defaultWarehouseId={warehouseId}
          defaultProductId={productId}
        />
      ) : null}
    </>
  );
}
