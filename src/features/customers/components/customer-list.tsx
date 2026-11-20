import { CustomerEditButton } from "./customer-edit-button";
import { CustomerListPagination } from "./customer-list-pagination";
import { CustomerStatusBadge } from "./customer-status-badge";
import type { CustomerListData, CustomerListItem } from "../types/customer";

function formatCustomerType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ContactSummary({ customer }: { customer: CustomerListItem }) {
  if (!customer.email && !customer.phone) {
    return <span className="text-zinc-500">No contact saved</span>;
  }

  return (
    <div className="space-y-1">
      {customer.email ? <p>{customer.email}</p> : null}
      {customer.phone ? <p>{customer.phone}</p> : null}
    </div>
  );
}

function CustomerCards({
  customers,
  canManage,
}: {
  customers: CustomerListItem[];
  canManage: boolean;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {customers.map((customer) => (
        <article
          key={customer.id}
          className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium text-zinc-950 dark:text-zinc-50">
                {customer.displayName}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {customer.companyName ??
                  formatCustomerType(customer.customerType)}
              </p>
            </div>
            <CustomerStatusBadge status={customer.status} />
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Contact
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                <ContactSummary customer={customer} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Updated
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                {formatDate(customer.updatedAt)}
              </dd>
            </div>
          </dl>
          {canManage && customer.status === "active" ? (
            <div className="mt-4 flex justify-end border-t border-black/10 pt-3 dark:border-white/15">
              <CustomerEditButton
                customerId={customer.id}
                customerName={customer.displayName}
              />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function CustomerTable({
  customers,
  canManage,
}: {
  customers: CustomerListItem[];
  canManage: boolean;
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-950 md:block">
      <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/15">
        <caption className="sr-only">Customer list</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3">
              Customer
            </th>
            <th scope="col" className="px-4 py-3">
              Contact
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            <th scope="col" className="px-4 py-3">
              Updated
            </th>
            {canManage ? (
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/15">
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td className="px-4 py-4 align-top">
                <p className="font-medium text-zinc-950 dark:text-zinc-50">
                  {customer.displayName}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {customer.companyName ??
                    formatCustomerType(customer.customerType)}
                </p>
              </td>
              <td className="px-4 py-4 align-top text-zinc-600 dark:text-zinc-400">
                <ContactSummary customer={customer} />
              </td>
              <td className="px-4 py-4 align-top">
                <CustomerStatusBadge status={customer.status} />
              </td>
              <td className="px-4 py-4 align-top text-zinc-600 dark:text-zinc-400">
                {formatDate(customer.updatedAt)}
              </td>
              {canManage ? (
                <td className="px-4 py-4 text-right align-top">
                  {customer.status === "active" ? (
                    <CustomerEditButton
                      customerId={customer.id}
                      customerName={customer.displayName}
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

export function CustomerList({
  data,
  canManage = false,
}: {
  data: CustomerListData;
  canManage?: boolean;
}) {
  if (data.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-8 dark:border-white/20">
        <h2 className="text-lg font-medium">No customers found.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Add your first customer to track orders and service work, or adjust
          search and status filters to check archived customers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CustomerCards customers={data.items} canManage={canManage} />
      <CustomerTable customers={data.items} canManage={canManage} />
      <CustomerListPagination data={data} />
    </div>
  );
}
