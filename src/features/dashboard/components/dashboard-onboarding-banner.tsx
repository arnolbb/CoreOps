import Link from "next/link";
import type { DashboardCapabilities } from "../types/dashboard";

type OnboardingStep = {
  href: string;
  label: string;
  description: string;
  visible: boolean;
};

export function DashboardOnboardingBanner({
  capabilities,
}: {
  capabilities: DashboardCapabilities;
}) {
  const steps: OnboardingStep[] = [
    {
      href: "/dashboard/customers",
      label: "Add Customers",
      description: "Create customer profiles and primary service addresses.",
      visible: capabilities.canReadCustomers,
    },
    {
      href: "/dashboard/products",
      label: "Add Products",
      description: "Define goods, services, pricing, and stock thresholds.",
      visible: capabilities.canReadInventory,
    },
    {
      href: "/dashboard/inventory",
      label: "Set Up Inventory",
      description: "Create a warehouse and record opening stock balances.",
      visible: capabilities.canReadInventory,
    },
    {
      href: "/dashboard/sales",
      label: "Record Sales",
      description: "Create sales orders, confirm stock, and track payments.",
      visible: capabilities.canReadSales,
    },
    {
      href: "/dashboard/work-orders",
      label: "Schedule Work Orders",
      description: "Create, assign, and track operational field tasks.",
      visible: capabilities.canReadWorkOrders,
    },
  ].filter((step) => step.visible);

  return (
    <section
      aria-label="Workspace onboarding"
      className="rounded-2xl border border-dashed border-black/15 bg-white p-6 dark:border-white/20 dark:bg-zinc-950"
    >
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Workspace Setup Checklist
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Organization setup is complete. Start adding your operational records
          to see live metrics across your workspace.
        </p>
      </div>

      {steps.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <Link
              key={step.href}
              href={step.href}
              className="group rounded-xl border border-black/10 p-4 transition-colors hover:border-black/25 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-white/15 dark:hover:border-white/30 dark:hover:bg-zinc-900 dark:focus-visible:outline-zinc-100"
            >
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {step.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                {step.description}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
