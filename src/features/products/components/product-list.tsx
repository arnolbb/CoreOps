import { ProductListPagination } from "./product-list-pagination";
import { ProductRowActions } from "./product-row-actions";
import { ProductStatusBadge } from "./product-status-badge";
import type { ProductListData, ProductListItem } from "../types/product";

function formatCurrency(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

function formatProductType(value: string) {
  return value === "service" ? "Service" : "Goods";
}

function InventorySummary({ product }: { product: ProductListItem }) {
  if (product.productType === "service") {
    return (
      <span className="text-zinc-500 dark:text-zinc-400">Not tracked</span>
    );
  }

  if (!product.trackInventory) {
    return <span className="text-zinc-500 dark:text-zinc-400">Untracked</span>;
  }

  return (
    <div className="space-y-0.5">
      <p>Tracked ({product.unit})</p>
      {product.minimumStock !== null ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Min: {product.minimumStock} {product.unit}
        </p>
      ) : null}
    </div>
  );
}

function ProductCards({
  items,
  currencyCode,
  canManage,
  canArchive,
  canViewCost,
  categories,
}: {
  items: ProductListItem[];
  currencyCode: string;
  canManage: boolean;
  canArchive: boolean;
  canViewCost: boolean;
  categories: ProductListData["categories"];
}) {
  const showActions = canManage || canArchive;

  return (
    <div className="grid gap-3 md:hidden">
      {items.map((product) => (
        <article
          key={product.id}
          className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium text-zinc-950 dark:text-zinc-50">
                {product.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {formatProductType(product.productType)}
                {product.sku ? ` · ${product.sku}` : ""}
              </p>
            </div>
            <ProductStatusBadge status={product.status} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Category
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                {product.categoryName ?? "Uncategorized"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Selling Price
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                {formatCurrency(product.sellingPrice, currencyCode)} /{" "}
                {product.unit}
              </dd>
            </div>
            {canViewCost ? (
              <div>
                <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                  Cost Price
                </dt>
                <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {product.costPrice !== null
                    ? formatCurrency(product.costPrice, currencyCode)
                    : "—"}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Inventory
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                <InventorySummary product={product} />
              </dd>
            </div>
          </dl>
          {showActions && product.status === "active" ? (
            <div className="mt-4 flex justify-end border-t border-black/10 pt-3 dark:border-white/15">
              <ProductRowActions
                productId={product.id}
                productName={product.name}
                canManage={canManage}
                canArchive={canArchive}
                canViewCost={canViewCost}
                categories={categories}
              />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ProductTable({
  items,
  currencyCode,
  canManage,
  canArchive,
  canViewCost,
  categories,
}: {
  items: ProductListItem[];
  currencyCode: string;
  canManage: boolean;
  canArchive: boolean;
  canViewCost: boolean;
  categories: ProductListData["categories"];
}) {
  const showActions = canManage || canArchive;

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-950 md:block">
      <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/15">
        <caption className="sr-only">Product catalog</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3">
              Product
            </th>
            <th scope="col" className="px-4 py-3">
              Category
            </th>
            <th scope="col" className="px-4 py-3">
              Selling Price
            </th>
            {canViewCost ? (
              <th scope="col" className="px-4 py-3">
                Cost Price
              </th>
            ) : null}
            <th scope="col" className="px-4 py-3">
              Inventory
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            {showActions ? (
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/15">
          {items.map((product) => (
            <tr key={product.id}>
              <td className="px-4 py-4 align-top">
                <p className="font-medium text-zinc-950 dark:text-zinc-50">
                  {product.name}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatProductType(product.productType)}
                  {product.sku ? ` · ${product.sku}` : ""}
                </p>
              </td>
              <td className="px-4 py-4 align-top text-zinc-600 dark:text-zinc-400">
                {product.categoryName ?? "Uncategorized"}
              </td>
              <td className="px-4 py-4 align-top text-zinc-900 dark:text-zinc-100">
                {formatCurrency(product.sellingPrice, currencyCode)}
                <span className="text-zinc-500 dark:text-zinc-400">
                  {" "}
                  / {product.unit}
                </span>
              </td>
              {canViewCost ? (
                <td className="px-4 py-4 align-top text-zinc-600 dark:text-zinc-400">
                  {product.costPrice !== null
                    ? formatCurrency(product.costPrice, currencyCode)
                    : "—"}
                </td>
              ) : null}
              <td className="px-4 py-4 align-top text-zinc-600 dark:text-zinc-400">
                <InventorySummary product={product} />
              </td>
              <td className="px-4 py-4 align-top">
                <ProductStatusBadge status={product.status} />
              </td>
              {showActions ? (
                <td className="px-4 py-4 text-right align-top">
                  {product.status === "active" ? (
                    <ProductRowActions
                      productId={product.id}
                      productName={product.name}
                      canManage={canManage}
                      canArchive={canArchive}
                      canViewCost={canViewCost}
                      categories={categories}
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">Archived</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductList({
  data,
  canManage,
  canArchive,
  canViewCost,
}: {
  data: ProductListData;
  canManage: boolean;
  canArchive: boolean;
  canViewCost: boolean;
}) {
  if (data.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-8 dark:border-white/20">
        <h2 className="text-lg font-medium">No products found.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Add your first product or service to track pricing, inventory levels,
          and sales items, or adjust search and status filters to view archived
          records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProductCards
        items={data.items}
        currencyCode={data.currencyCode}
        canManage={canManage}
        canArchive={canArchive}
        canViewCost={canViewCost}
        categories={data.categories}
      />
      <ProductTable
        items={data.items}
        currencyCode={data.currencyCode}
        canManage={canManage}
        canArchive={canArchive}
        canViewCost={canViewCost}
        categories={data.categories}
      />
      <ProductListPagination data={data} />
    </div>
  );
}
