import type { InventoryOverviewData } from "../types/inventory";

function buildPageHref(data: InventoryOverviewData, page: number) {
  const params = new URLSearchParams();

  if (data.filters.search) {
    params.set("search", data.filters.search);
  }

  if (data.filters.warehouseId) {
    params.set("warehouseId", data.filters.warehouseId);
  }

  if (data.filters.stockFilter !== "all") {
    params.set("stockFilter", data.filters.stockFilter);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/dashboard/inventory?${query}` : "/dashboard/inventory";
}

export function InventoryPagination({ data }: { data: InventoryOverviewData }) {
  const currentPage = data.filters.page;
  const previousPage = Math.max(currentPage - 1, 1);
  const nextPage = Math.min(currentPage + 1, data.totalPages);
  const firstItem =
    data.totalCount === 0 ? 0 : (currentPage - 1) * data.pageSize + 1;
  const lastItem = Math.min(currentPage * data.pageSize, data.totalCount);

  return (
    <nav
      aria-label="Inventory pagination"
      className="flex flex-col gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        Showing {firstItem}-{lastItem} of {data.totalCount} stock items
      </p>
      <div className="flex items-center gap-2">
        <a
          aria-disabled={currentPage <= 1}
          href={buildPageHref(data, previousPage)}
          className="rounded-md border border-black/10 px-3 py-2 font-medium text-zinc-900 hover:bg-zinc-50 aria-disabled:pointer-events-none aria-disabled:opacity-40 dark:border-white/15 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Previous
        </a>
        <span className="px-2">
          Page {currentPage} of {data.totalPages}
        </span>
        <a
          aria-disabled={currentPage >= data.totalPages}
          href={buildPageHref(data, nextPage)}
          className="rounded-md border border-black/10 px-3 py-2 font-medium text-zinc-900 hover:bg-zinc-50 aria-disabled:pointer-events-none aria-disabled:opacity-40 dark:border-white/15 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Next
        </a>
      </div>
    </nav>
  );
}
