import Link from "next/link";
import {
  formatDashboardDateTime,
  formatPriorityLabel,
  formatStatusLabel,
  formatWorkTypeLabel,
} from "../services/dashboard-formatting";
import type {
  DashboardActiveWorkOrderItem,
  DashboardActivityItem,
  DashboardLowStockItem,
  DashboardOverviewData,
} from "../types/dashboard";

function LowStockBadge({ quantity }: { quantity: number }) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        Out of Stock
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
      Low Stock
    </span>
  );
}

function WorkOrderStatusBadge({ status }: { status: string }) {
  if (status === "in_progress") {
    return (
      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
        {formatStatusLabel(status)}
      </span>
    );
  }

  if (status === "scheduled") {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        {formatStatusLabel(status)}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      {formatStatusLabel(status)}
    </span>
  );
}

function LowStockPanel({ items }: { items: DashboardLowStockItem[] }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Low-Stock Alerts
          </h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Tracked products at or below minimum stock levels.
          </p>
        </div>
        <Link
          href="/dashboard/inventory?stockFilter=low_stock"
          className="shrink-0 text-xs font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          View inventory
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-black/15 p-5 dark:border-white/20">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            No low-stock alerts.
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            All tracked warehouse balances are above their minimum thresholds.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-black/10 dark:divide-white/15">
          {items.map((item) => (
            <li
              key={`${item.warehouseId}-${item.productId}`}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {item.productName}
                  {item.productSku ? ` (${item.productSku})` : ""}
                </p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {item.warehouseName} ({item.warehouseCode}) · On hand{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {item.quantity} {item.productUnit}
                  </span>{" "}
                  / Min {item.minimumStock} {item.productUnit}
                </p>
              </div>
              <div className="shrink-0">
                <LowStockBadge quantity={item.quantity} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActiveWorkOrdersPanel({
  items,
  timezone,
}: {
  items: DashboardActiveWorkOrderItem[];
  timezone: string;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Active Work Orders
          </h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Draft, scheduled, and in-progress operational jobs.
          </p>
        </div>
        <Link
          href="/dashboard/work-orders"
          className="shrink-0 text-xs font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          View work orders
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-black/15 p-5 dark:border-white/20">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            No active work orders.
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Create or schedule a work order to track operational assignments.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-black/10 dark:divide-white/15">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {item.workOrderNumber} · {item.customerName}
                </p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {formatWorkTypeLabel(item.workType)} ·{" "}
                  {formatPriorityLabel(item.priority)} priority ·{" "}
                  {item.scheduledStart
                    ? `Scheduled ${formatDashboardDateTime(item.scheduledStart, timezone)}`
                    : "Unscheduled"}
                </p>
              </div>
              <div className="shrink-0">
                <WorkOrderStatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentActivityPanel({
  items,
  timezone,
  canViewAuditActivity,
}: {
  items: DashboardActivityItem[];
  timezone: string;
  canViewAuditActivity: boolean;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-950">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Recent Activity
        </h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {canViewAuditActivity
            ? "Latest organization audit events"
            : "Latest accessible operational updates"}{" "}
          · {timezone}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-black/15 p-5 dark:border-white/20">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            No recent activity yet.
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Stock adjustments, sales confirmations, payments, and work order
            updates will appear here.
          </p>
        </div>
      ) : (
        <ol className="mt-4 divide-y divide-black/10 dark:divide-white/15">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {item.summary}
                </p>
                {item.actorLabel ? (
                  <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">
                    By {item.actorLabel}
                  </p>
                ) : null}
              </div>
              <time
                dateTime={item.createdAt}
                className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
              >
                {formatDashboardDateTime(item.createdAt, timezone)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function DashboardOperationalPanels({
  data,
}: {
  data: DashboardOverviewData;
}) {
  const { capabilities, organization } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {capabilities.canReadInventory ? (
          <LowStockPanel items={data.lowStockItems} />
        ) : null}
        {capabilities.canReadWorkOrders ? (
          <ActiveWorkOrdersPanel
            items={data.activeWorkOrders}
            timezone={organization.resolvedTimezone}
          />
        ) : null}
      </div>

      <RecentActivityPanel
        items={data.recentActivity}
        timezone={organization.resolvedTimezone}
        canViewAuditActivity={capabilities.canViewAuditActivity}
      />
    </div>
  );
}
