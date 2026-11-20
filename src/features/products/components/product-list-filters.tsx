import type { ProductCategory, ProductListFilters } from "../types/product";

export function ProductListFiltersForm({
  filters,
  categories,
}: {
  filters: ProductListFilters;
  categories: ProductCategory[];
}) {
  return (
    <form
      action="/dashboard/products"
      className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-[1fr_140px_140px_180px_auto]"
    >
      <div>
        <label
          htmlFor="product-search"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Search products
        </label>
        <input
          id="product-search"
          name="search"
          type="search"
          defaultValue={filters.search}
          placeholder="Name or SKU"
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        />
      </div>
      <div>
        <label
          htmlFor="product-status"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Status
        </label>
        <select
          id="product-status"
          name="status"
          defaultValue={filters.status}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="product-type"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Type
        </label>
        <select
          id="product-type"
          name="productType"
          defaultValue={filters.productType}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="all">All types</option>
          <option value="goods">Goods</option>
          <option value="service">Service</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="product-category"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Category
        </label>
        <select
          id="product-category"
          name="categoryId"
          defaultValue={filters.categoryId}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
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
