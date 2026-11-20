"use client";

import { useState } from "react";
import { getCustomerForEditAction } from "../actions/customer-actions";
import type { CustomerDetail } from "../types/customer";
import { CustomerFormDialog } from "./customer-form-dialog";

type Props = {
  customerId: string;
  customerName: string;
};

export function CustomerEditButton({ customerId, customerName }: Props) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpen = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await getCustomerForEditAction(customerId);

      if (result.ok) {
        setCustomer(result.data);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage("Unable to load customer details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleOpen}
        disabled={isLoading}
        aria-label={`Edit ${customerName}`}
        className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        {isLoading ? "Loading..." : "Edit"}
      </button>

      {errorMessage ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {customer ? (
        <CustomerFormDialog
          key={`${customer.id}-${customer.updatedAt}`}
          isOpen
          customer={customer}
          onClose={() => setCustomer(null)}
        />
      ) : null}
    </div>
  );
}
