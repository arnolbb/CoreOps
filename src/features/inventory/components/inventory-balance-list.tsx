import { InventoryPagination } from "./inventory-pagination";
import { InventoryQuickAdjustButton } from "./inventory-quick-adjust-button";
import { InventoryStockBadge } from "./inventory-stock-badge";
import type {
  InventoryBalanceItem,
  InventoryOverviewData,
} from "../types/inventory";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function BalanceCards({
  items,
  canManage,
  activeWarehouses,
  adjustableProducts,
}: {
  items: InventoryBalanceItem[];
  canManage: boolean;
  activeWarehouses: InventoryOverviewData["activeWarehouses"];
  adjustableProducts: InventoryOverviewData["adjustableProducts"];
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {items.map((item) => {
        const canAdjustItem =
          canManage && item.warehouseIsActive && item.productIsActive;

        return (
          <article
            key={`${item.warehouseId}-${item.productId}`}
            className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-zinc-950 dark:text-zinc-50">
                  {item.productName}
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {item.warehouseName} ({item.warehouseCode})
                  {item.productSku ? ` · ${item.productSku}` : ""}
                </p>
              </div>
              <InventoryStockBadge
                quantity={item.quantity}
                isLowStock={item.isLowStock}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                  On Hand
                </dt>
                <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {item.quantity} {item.productUnit}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                  Min Stock
                </dt>
                <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {item.minimumStock !== null
                    ? `${item.minimumStock} ${item.productUnit}`
                    : "—"}
                </dd>
              </div>
            </dl>

            {canAdjustItem ? (
              <div className="mt-4 flex justify-end border-t border-black/10 pt-3 dark:border-white/15">
                <InventoryQuickAdjustButton
                  warehouseId={item.warehouseId}
                  productId={item.productId}
                  productName={item.productName}
                  activeWarehouses={activeWarehouses}
                  adjustableProducts={adjustableProducts}
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function BalanceTable({
  items,
  canManage,
  activeWarehouses,
  adjustableProducts,
}: {
  items: InventoryBalanceItem[];
  canManage: boolean;
  activeWarehouses: InventoryOverviewData["activeWarehouses"];
  adjustableProducts: InventoryOverviewData["adjustableProducts"];
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-950 md:block">
      <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/15">
        <caption className="sr-only">Stock balances by warehouse</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3">
              Product
            </th>
            <th scope="col" className="px-4 py-3">
              Warehouse
            </th>
            <th scope="col" className="px-4 py-3">
              On Hand
            </th>
            <th scope="col" className="px-4 py-3">
              Min Stock
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            <th scope="col" className="px-4 py-3">
              Updated
            </th>
            {canManage ? (
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/15">
          {items.map((item) => {
            const canAdjustItem =
              canManage && item.warehouseIsActive && item.productIsActive;

            return (
              <tr key={`${item.warehouseId}-${item.productId}`}>
                <td className="px-4 py-4 align-top">
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {item.productName}
                  </p>
                  {item.productSku ? (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {item.productSku}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4 align-top text-zinc-600 dark:text-zinc-400">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {item.warehouseName}
                  </p>
                  <p className="mt-0.5 text-xs">{item.warehouseCode}</p>
                </td>
                <td className="px-4 py-4 align-top font-medium text-zinc-950 dark:text-zinc-50">
                  {item.quantity} {item.productUnit}
                </td>
                <td className="px-4 py-4 align-top text-zinc-600 dark:text-zinc-400">
                  {item.minimumStock !== null
                    ? `${item.minimumStock} ${item.productUnit}`
                    : "—"}
                </td>
                <td className="px-4 py-4 align-top">
                  <InventoryStockBadge
                    quantity={item.quantity}
                    isLowStock={item.isLowStock}
                  />
                </td>
                <td className="px-4 py-4 align-top text-zinc-600 dark:text-zinc-400">
                  {formatDate(item.updatedAt)}
                </td>
                {canManage ? (
                  <td className="px-4 py-4 text-right align-top">
                    {canAdjustItem ? (
                      <InventoryQuickAdjustButton
                        warehouseId={item.warehouseId}
                        productId={item.productId}
                        productName={item.productName}
                        activeWarehouses={activeWarehouses}
                        adjustableProducts={adjustableProducts}
                      />
                    ) : (
                      <span className="text-xs text-zinc-400">Inactive</span>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function InventoryBalanceList({
  data,
  canManage,
}: {
  data: InventoryOverviewData;
  canManage: boolean;
}) {
  if (data.balances.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-8 dark:border-white/20">
        <h2 className="text-lg font-medium">No stock balances found.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Add a warehouse and record an opening stock adjustment to start
          tracking inventory levels, or adjust your search and filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BalanceCards
        items={data.balances}
        canManage={canManage}
        activeWarehouses={data.activeWarehouses}
        adjustableProducts={data.adjustableProducts}
      />
      <BalanceTable
        items={data.balances}
        canManage={canManage}
        activeWarehouses={data.activeWarehouses}
        adjustableProducts={data.adjustableProducts}
      />
      <InventoryPagination data={data} />
    </div>
  );
}
