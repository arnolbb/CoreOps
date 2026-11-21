import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrderAssigneeOption,
  type WorkOrderFilters,
} from "../types/work-order";
import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUS_LABELS,
} from "./work-order-status-badge";

export function WorkOrderFiltersForm({
  filters,
  assignees,
  isTechnician,
}: {
  filters: WorkOrderFilters;
  assignees: WorkOrderAssigneeOption[];
  isTechnician: boolean;
}) {
  return (
    <form
      action="/dashboard/work-orders"
      className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-[1fr_150px_140px_190px_auto]"
    >
      <div>
        <label
          htmlFor="work-order-search"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Search work orders
        </label>
        <input
          id="work-order-search"
          name="search"
          type="search"
          defaultValue={filters.search}
          placeholder="WO number or description"
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        />
      </div>

      <div>
        <label
          htmlFor="work-order-status"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Status
        </label>
        <select
          id="work-order-status"
          name="status"
          defaultValue={filters.status}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="all">All statuses</option>
          {WORK_ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {WORK_ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="work-order-priority"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Priority
        </label>
        <select
          id="work-order-priority"
          name="priority"
          defaultValue={filters.priority}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="all">All priorities</option>
          {WORK_ORDER_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {WORK_ORDER_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="work-order-assignee"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Assignee
        </label>
        <select
          id="work-order-assignee"
          name="assignedTo"
          defaultValue={filters.assignedTo}
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/15 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        >
          <option value="all">All assignees</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
          {!isTechnician
            ? assignees.map((assignee) => (
                <option key={assignee.userId} value={assignee.userId}>
                  {assignee.email}
                </option>
              ))
            : null}
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
