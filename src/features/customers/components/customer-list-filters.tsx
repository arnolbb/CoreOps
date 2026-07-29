import type { CustomerListFilters } from "../types/customer";

export function CustomerListFiltersForm({
  filters,
}: {
  filters: CustomerListFilters;
}) {
  return (
    <form
      action="/dashboard/customers"
      className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950 sm:grid-cols-[1fr_180px_auto]"
    >
      <div>
        <label
          htmlFor="customer-search"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Search customers
        </label>
        <input
          id="customer-search"
          name="search"
          type="search"
          defaultValue={filters.search}
          placeholder="Name, company, email, or phone"
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        />
      </div>
      <div>
        <label
          htmlFor="customer-status"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Status
        </label>
        <select
          id="customer-status"
          name="status"
          defaultValue={filters.status}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
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
