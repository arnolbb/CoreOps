import type { InventoryFilters, WarehouseItem } from "../types/inventory";

export function InventoryFiltersForm({
  filters,
  warehouses,
}: {
  filters: InventoryFilters;
  warehouses: WarehouseItem[];
}) {
  return (
    <form
      action="/dashboard/inventory"
      className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-[1fr_200px_170px_auto]"
    >
      <div>
        <label
          htmlFor="inventory-search"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Search inventory
        </label>
        <input
          id="inventory-search"
          name="search"
          type="search"
          defaultValue={filters.search}
          placeholder="Product, SKU, or warehouse"
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        />
      </div>
      <div>
        <label
          htmlFor="inventory-warehouse"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Warehouse
        </label>
        <select
          id="inventory-warehouse"
          name="warehouseId"
          defaultValue={filters.warehouseId}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="">All warehouses</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name} ({warehouse.code})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="inventory-stock-filter"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Stock status
        </label>
        <select
          id="inventory-stock-filter"
          name="stockFilter"
          defaultValue={filters.stockFilter}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="all">All stock</option>
          <option value="low_stock">Low stock only</option>
        </select>
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
        >
          Apply
        </button>
      </div>
    </form>
  );
}
