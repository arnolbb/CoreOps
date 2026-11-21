import type { SalesFilters } from "../types/sales";

export function SalesFiltersForm({ filters }: { filters: SalesFilters }) {
  return (
    <form
      action="/dashboard/sales"
      className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-[1fr_160px_180px_auto]"
    >
      <div>
        <label
          htmlFor="sales-search"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Search orders
        </label>
        <input
          id="sales-search"
          name="search"
          type="search"
          defaultValue={filters.search}
          placeholder="Order number or customer"
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        />
      </div>
      <div>
        <label
          htmlFor="sales-status"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Order status
        </label>
        <select
          id="sales-status"
          name="status"
          defaultValue={filters.status}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="sales-payment-status"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Payment status
        </label>
        <select
          id="sales-payment-status"
          name="paymentStatus"
          defaultValue={filters.paymentStatus}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="all">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
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
