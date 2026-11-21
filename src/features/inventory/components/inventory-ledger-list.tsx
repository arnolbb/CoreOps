import type { InventoryLedgerItem } from "../types/inventory";

const transactionLabels: Record<string, string> = {
  opening_stock: "Opening Stock",
  adjustment_in: "Adjustment In",
  adjustment_out: "Adjustment Out",
  sale_out: "Sale Out",
  return_in: "Return In",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  work_order_out: "Work Order Out",
  work_order_return: "Work Order Return",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDelta(delta: number, unit: string) {
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta} ${unit}`;
}

export function InventoryLedgerList({
  items,
}: {
  items: InventoryLedgerItem[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Recent Inventory Movements
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Append-only stock ledger showing the latest 20 inventory transactions.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 p-6 dark:border-white/20">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No inventory transactions recorded yet.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-black/10 bg-white p-4 text-sm dark:border-white/15 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      {item.productName}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {item.warehouseName} ({item.warehouseCode})
                    </p>
                  </div>
                  <span
                    className={`font-semibold ${
                      item.quantityDelta >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {formatDelta(item.quantityDelta, item.productUnit)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {transactionLabels[item.transactionType] ??
                    item.transactionType}{" "}
                  · {item.quantityBefore} → {item.quantityAfter}{" "}
                  {item.productUnit}
                </p>
                {item.reason ? (
                  <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">
                    Reason: {item.reason}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDateTime(item.createdAt)}
                </p>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-950 md:block">
            <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/15">
              <caption className="sr-only">
                Inventory transaction ledger
              </caption>
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Date (UTC)
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Warehouse
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Change
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Balance
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/15">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 align-top text-xs text-zinc-600 dark:text-zinc-400">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-zinc-950 dark:text-zinc-50">
                        {item.productName}
                      </p>
                      {item.productSku ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {item.productSku}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-400">
                      {item.warehouseName} ({item.warehouseCode})
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-900 dark:text-zinc-100">
                      {transactionLabels[item.transactionType] ??
                        item.transactionType}
                    </td>
                    <td
                      className={`px-4 py-3 align-top font-semibold ${
                        item.quantityDelta >= 0
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-red-700 dark:text-red-300"
                      }`}
                    >
                      {formatDelta(item.quantityDelta, item.productUnit)}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-400">
                      {item.quantityBefore} → {item.quantityAfter}{" "}
                      {item.productUnit}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-400">
                      {item.reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
