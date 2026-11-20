export function InventoryStockBadge({
  quantity,
  isLowStock,
}: {
  quantity: number;
  isLowStock: boolean;
}) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        Out of Stock
      </span>
    );
  }

  if (isLowStock) {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        Low Stock
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
      In Stock
    </span>
  );
}
