"use client";

import Link from "next/link";
import { useState } from "react";
import { getSalesOrderForEditAction } from "../actions/sales-actions";
import { formatCurrency, formatDateTime } from "../services/sales-formatters";
import type {
  SalesFormOptions,
  SalesOrderDetail,
  SalesOrderListItem,
  SalesOverviewData,
} from "../types/sales";
import { SalesOrderFormDialog } from "./sales-order-form-dialog";
import { SalesPagination } from "./sales-pagination";
import {
  SalesOrderStatusBadge,
  SalesPaymentStatusBadge,
} from "./sales-status-badge";

function SalesOrderRowActions({
  order,
  canManage,
  fallbackFormOptions,
  currencyCode,
}: {
  order: SalesOrderListItem;
  canManage: boolean;
  fallbackFormOptions: SalesFormOptions;
  currencyCode: string;
}) {
  const [editingOrder, setEditingOrder] = useState<SalesOrderDetail | null>(
    null,
  );
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenEdit = async () => {
    setIsLoadingEdit(true);
    setErrorMessage(null);
    try {
      const result = await getSalesOrderForEditAction(order.id);
      if (result.ok) {
        setEditingOrder(result.data);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage("Unable to load sales order draft.");
    } finally {
      setIsLoadingEdit(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/sales/${order.id}`}
          className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          View
        </Link>
        {canManage && order.status === "draft" ? (
          <button
            type="button"
            onClick={handleOpenEdit}
            disabled={isLoadingEdit}
            aria-label={`Edit Draft ${order.orderNumber}`}
            className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            {isLoadingEdit ? "Loading..." : "Edit Draft"}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {editingOrder ? (
        <SalesOrderFormDialog
          key={`${editingOrder.id}-${editingOrder.updatedAt}`}
          isOpen
          order={editingOrder}
          formOptions={editingOrder.formOptions ?? fallbackFormOptions}
          currencyCode={editingOrder.currencyCode || currencyCode}
          onClose={() => setEditingOrder(null)}
        />
      ) : null}
    </div>
  );
}

function SalesOrderCards({
  items,
  timezone,
  canManage,
  formOptions,
  currencyCode,
}: {
  items: SalesOrderListItem[];
  timezone: string;
  canManage: boolean;
  formOptions: SalesFormOptions;
  currencyCode: string;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {items.map((order) => (
        <article
          key={order.id}
          className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                href={`/dashboard/sales/${order.id}`}
                className="font-semibold text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
              >
                {order.orderNumber}
              </Link>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {order.customerName}
                {order.customerCompanyName
                  ? ` · ${order.customerCompanyName}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <SalesOrderStatusBadge status={order.status} />
              <SalesPaymentStatusBadge status={order.paymentStatus} />
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Total
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                {formatCurrency(order.grandTotal, order.currencyCode)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Outstanding
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                {formatCurrency(order.outstandingBalance, order.currencyCode)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Warehouse
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                {order.warehouseName
                  ? `${order.warehouseName} (${order.warehouseCode})`
                  : "Unassigned"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                Created
              </dt>
              <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                {formatDateTime(order.createdAt, timezone)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex justify-end border-t border-black/10 pt-3 dark:border-white/15">
            <SalesOrderRowActions
              order={order}
              canManage={canManage}
              fallbackFormOptions={formOptions}
              currencyCode={currencyCode}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function SalesOrderTable({
  items,
  timezone,
  canManage,
  formOptions,
  currencyCode,
}: {
  items: SalesOrderListItem[];
  timezone: string;
  canManage: boolean;
  formOptions: SalesFormOptions;
  currencyCode: string;
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-950 md:block">
      <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/15">
        <caption className="sr-only">Sales orders</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3">
              Order
            </th>
            <th scope="col" className="px-4 py-3">
              Customer
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            <th scope="col" className="px-4 py-3">
              Payment
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Total
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Outstanding
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/15">
          {items.map((order) => (
            <tr key={order.id}>
              <td className="px-4 py-4 align-top">
                <Link
                  href={`/dashboard/sales/${order.id}`}
                  className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                >
                  {order.orderNumber}
                </Link>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(order.createdAt, timezone)}
                </p>
              </td>
              <td className="px-4 py-4 align-top">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {order.customerName}
                </p>
                {order.customerCompanyName ? (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {order.customerCompanyName}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-4 align-top">
                <SalesOrderStatusBadge status={order.status} />
              </td>
              <td className="px-4 py-4 align-top">
                <SalesPaymentStatusBadge status={order.paymentStatus} />
              </td>
              <td className="px-4 py-4 text-right align-top font-medium text-zinc-900 dark:text-zinc-100">
                {formatCurrency(order.grandTotal, order.currencyCode)}
              </td>
              <td className="px-4 py-4 text-right align-top text-zinc-600 dark:text-zinc-400">
                {formatCurrency(order.outstandingBalance, order.currencyCode)}
              </td>
              <td className="px-4 py-4 text-right align-top">
                <SalesOrderRowActions
                  order={order}
                  canManage={canManage}
                  fallbackFormOptions={formOptions}
                  currencyCode={currencyCode}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SalesOrderList({
  data,
  canManage,
}: {
  data: SalesOverviewData;
  canManage: boolean;
}) {
  if (data.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-8 dark:border-white/20">
        <h2 className="text-lg font-medium">No sales orders found.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Create your first sales order draft to quote items, confirm stock
          deductions, and record customer payments, or adjust search and status
          filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SalesOrderCards
        items={data.items}
        timezone={data.timezone}
        canManage={canManage}
        formOptions={data.formOptions}
        currencyCode={data.currencyCode}
      />
      <SalesOrderTable
        items={data.items}
        timezone={data.timezone}
        canManage={canManage}
        formOptions={data.formOptions}
        currencyCode={data.currencyCode}
      />
      <SalesPagination data={data} />
    </div>
  );
}
