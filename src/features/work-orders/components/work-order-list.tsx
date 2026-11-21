import Link from "next/link";
import type {
  WorkOrderListItem,
  WorkOrderOverviewData,
} from "../types/work-order";
import { WorkOrderPagination } from "./work-order-pagination";
import {
  WORK_ORDER_TYPE_LABELS,
  WorkOrderPriorityBadge,
  WorkOrderStatusBadge,
} from "./work-order-status-badge";

function formatDateTime(value: string | null) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function WorkOrderCards({ items }: { items: WorkOrderListItem[] }) {
  return (
    <div className="grid gap-3 md:hidden">
      {items.map((wo) => (
        <article
          key={wo.id}
          className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                href={`/dashboard/work-orders/${wo.id}`}
                className="font-semibold text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
              >
                {wo.workOrderNumber}
              </Link>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {wo.customerName}
              </p>
              {wo.addressSummary ? (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {wo.addressSummary}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <WorkOrderStatusBadge status={wo.status} />
              <WorkOrderPriorityBadge priority={wo.priority} />
            </div>
          </div>

          <p className="mt-3 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">
            {wo.description}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Type
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                {WORK_ORDER_TYPE_LABELS[wo.workType]}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Assignee
              </dt>
              <dd className="mt-1 truncate text-zinc-600 dark:text-zinc-400">
                {wo.assignedToEmail ?? "Unassigned"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Scheduled (UTC)
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                {formatDateTime(wo.scheduledStart)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-black/10 pt-3 dark:border-white/15">
            <Link
              href={`/dashboard/work-orders/${wo.id}`}
              className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Open Work Order
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function WorkOrderTable({ items }: { items: WorkOrderListItem[] }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-950 md:block">
      <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/15">
        <caption className="sr-only">Work orders list</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3">
              Work Order
            </th>
            <th scope="col" className="px-4 py-3">
              Customer
            </th>
            <th scope="col" className="px-4 py-3">
              Type &amp; Priority
            </th>
            <th scope="col" className="px-4 py-3">
              Assignee
            </th>
            <th scope="col" className="px-4 py-3">
              Scheduled (UTC)
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/15">
          {items.map((wo) => (
            <tr key={wo.id}>
              <td className="px-4 py-4 align-top">
                <Link
                  href={`/dashboard/work-orders/${wo.id}`}
                  className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                >
                  {wo.workOrderNumber}
                </Link>
                <p className="mt-1 line-clamp-2 max-w-xs text-xs text-zinc-600 dark:text-zinc-400">
                  {wo.description}
                </p>
              </td>
              <td className="px-4 py-4 align-top">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {wo.customerName}
                </p>
                {wo.addressSummary ? (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {wo.addressSummary}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-4 align-top">
                <p className="text-zinc-900 dark:text-zinc-100">
                  {WORK_ORDER_TYPE_LABELS[wo.workType]}
                </p>
                <div className="mt-1">
                  <WorkOrderPriorityBadge priority={wo.priority} />
                </div>
              </td>
              <td className="px-4 py-4 align-top text-zinc-600 dark:text-zinc-400">
                {wo.assignedToEmail ?? "Unassigned"}
              </td>
              <td className="px-4 py-4 align-top text-xs text-zinc-600 dark:text-zinc-400">
                {formatDateTime(wo.scheduledStart)}
              </td>
              <td className="px-4 py-4 align-top">
                <WorkOrderStatusBadge status={wo.status} />
              </td>
              <td className="px-4 py-4 text-right align-top">
                <Link
                  href={`/dashboard/work-orders/${wo.id}`}
                  className="inline-flex rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkOrderList({ data }: { data: WorkOrderOverviewData }) {
  if (data.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-8 dark:border-white/20">
        <h2 className="text-lg font-medium">No work orders found.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Create a work order to schedule service, installation, or field
          operations, or adjust your search and filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WorkOrderCards items={data.items} />
      <WorkOrderTable items={data.items} />
      <WorkOrderPagination data={data} />
    </div>
  );
}
