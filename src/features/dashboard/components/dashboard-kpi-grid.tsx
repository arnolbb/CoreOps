import Link from "next/link";
import { formatCurrencyAmount } from "../services/dashboard-formatting";
import type { DashboardOverviewData } from "../types/dashboard";

type KpiCardItem = {
  key: string;
  label: string;
  value: string;
  subtitle: string;
  href: string;
  restricted?: boolean;
};

export function DashboardKpiGrid({ data }: { data: DashboardOverviewData }) {
  const { capabilities, kpis, organization, monthPeriod, role } = data;
  const cards: KpiCardItem[] = [];

  if (capabilities.canReadCustomers) {
    cards.push({
      key: "customers",
      label: "Total Customers",
      value: String(kpis.activeCustomerCount ?? 0),
      subtitle: "Active customer records",
      href: "/dashboard/customers",
    });
  }

  if (capabilities.canReadSales) {
    const monthlyCount = kpis.monthlySalesCount ?? 0;
    const canSeeMoney =
      capabilities.canViewFinancialTotals && kpis.monthlySalesTotal !== null;

    cards.push({
      key: "sales-month",
      label: "Sales This Month",
      value: canSeeMoney
        ? formatCurrencyAmount(
            kpis.monthlySalesTotal ?? 0,
            organization.currencyCode,
          )
        : "Restricted",
      subtitle: canSeeMoney
        ? `${monthlyCount} ${monthlyCount === 1 ? "order" : "orders"} · ${monthPeriod.label}`
        : `${monthlyCount} ${monthlyCount === 1 ? "order" : "orders"} · ${monthPeriod.label} (totals hidden)`,
      href: "/dashboard/sales",
      restricted: !canSeeMoney,
    });

    const outstandingCount = kpis.outstandingOrdersCount ?? 0;
    const canSeeOutstanding =
      capabilities.canViewFinancialTotals && kpis.outstandingTotal !== null;

    cards.push({
      key: "outstanding",
      label: "Outstanding Payments",
      value: canSeeOutstanding
        ? formatCurrencyAmount(
            kpis.outstandingTotal ?? 0,
            organization.currencyCode,
          )
        : "Restricted",
      subtitle: canSeeOutstanding
        ? `${outstandingCount} unpaid or partial ${outstandingCount === 1 ? "order" : "orders"}`
        : `${outstandingCount} open ${outstandingCount === 1 ? "order" : "orders"} (balances hidden)`,
      href: "/dashboard/sales",
      restricted: !canSeeOutstanding,
    });
  }

  if (capabilities.canReadInventory) {
    const lowStockCount = kpis.lowStockCount ?? 0;
    cards.push({
      key: "low-stock",
      label: "Low-Stock Products",
      value: String(lowStockCount),
      subtitle:
        lowStockCount > 0
          ? "At or below minimum threshold"
          : "All tracked stock healthy",
      href: "/dashboard/inventory?stockFilter=low_stock",
    });
  }

  if (capabilities.canReadWorkOrders) {
    cards.push({
      key: "work-orders",
      label: "Active Work Orders",
      value: String(kpis.activeWorkOrdersCount ?? 0),
      subtitle:
        role === "technician"
          ? "Assigned active jobs"
          : "Draft, scheduled, or in progress",
      href: "/dashboard/work-orders",
    });
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <section aria-label="Key metrics">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-2xl border border-black/10 bg-white p-5 transition-colors hover:border-black/25 hover:bg-zinc-50/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-white/15 dark:bg-zinc-950 dark:hover:border-white/30 dark:hover:bg-zinc-900/70 dark:focus-visible:outline-zinc-100"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {card.label}
              </p>
              {card.restricted ? (
                <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  Count only
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {card.subtitle}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
