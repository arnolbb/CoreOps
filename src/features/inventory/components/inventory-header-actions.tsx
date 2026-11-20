"use client";

import { useState } from "react";
import type { InventoryProductOption, WarehouseItem } from "../types/inventory";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";
import { WarehouseManagerDialog } from "./warehouse-manager-dialog";

type Props = {
  canManage: boolean;
  warehouses: WarehouseItem[];
  activeWarehouses: WarehouseItem[];
  adjustableProducts: InventoryProductOption[];
};

export function InventoryHeaderActions({
  canManage,
  warehouses,
  activeWarehouses,
  adjustableProducts,
}: Props) {
  const [isWarehousesOpen, setIsWarehousesOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

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
          onClick={() => setIsWarehousesOpen(true)}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-900"
        >
          Warehouses
        </button>
        <button
          type="button"
          onClick={() => setIsAdjustOpen(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Adjust Stock
        </button>
      </div>

      {isWarehousesOpen ? (
        <WarehouseManagerDialog
          isOpen
          onClose={() => setIsWarehousesOpen(false)}
          warehouses={warehouses}
        />
      ) : null}

      {isAdjustOpen ? (
        <StockAdjustmentDialog
          isOpen
          onClose={() => setIsAdjustOpen(false)}
          warehouses={activeWarehouses}
          products={adjustableProducts}
        />
      ) : null}
    </>
  );
}
