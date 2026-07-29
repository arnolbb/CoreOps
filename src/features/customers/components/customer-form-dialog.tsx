"use client";

import { useEffect, useState } from "react";
import {
  createCustomerAction,
  updateCustomerAction,
} from "../actions/customer-actions";
import { checkCustomerDuplicate } from "../queries/check-customer-duplicate";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "../schemas/customer-form-schema";
import type { CustomerDetail } from "../types/customer";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  customer?: CustomerDetail | null;
  organizationId: string;
};

export function CustomerFormDialog({
  isOpen,
  onClose,
  customer,
  organizationId,
}: Props) {
  const isEditing = Boolean(customer);

  const [formData, setFormData] = useState<CustomerFormValues>({
    customerType: customer?.customerType ?? "individual",
    displayName: customer?.displayName ?? "",
    companyName: customer?.companyName ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    notes: customer?.notes ?? "",
    addressLine1: customer?.primaryAddress?.addressLine1 ?? "",
    addressLine2: customer?.primaryAddress?.addressLine2 ?? "",
    city: customer?.primaryAddress?.city ?? "",
    province: customer?.primaryAddress?.province ?? "",
    postalCode: customer?.primaryAddress?.postalCode ?? "",
    countryCode: customer?.primaryAddress?.countryCode ?? "ID",
    addressLabel: customer?.primaryAddress?.label ?? "Primary",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const checkDuplicates = async () => {
      if (!formData.email && !formData.phone) {
        setWarningMessage(null);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const result = await checkCustomerDuplicate(
        supabase,
        organizationId,
        formData.email,
        formData.phone,
        customer?.id,
      );

      if (result.hasDuplicate) {
        const parts: string[] = [];
        if (result.duplicateEmail) parts.push("email");
        if (result.duplicatePhone) parts.push("phone number");
        setWarningMessage(`Warning: A customer with the same ${parts.join(" and ")} already exists.`);
      } else {
        setWarningMessage(null);
      }
    };

    const timer = setTimeout(checkDuplicates, 400);
    return () => clearTimeout(timer);
  }, [formData.email, formData.phone, organizationId, customer?.id, isOpen]);


  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    const parsed = customerFormSchema.safeParse(formData);
    if (!parsed.success) {
      setIsSubmitting(false);
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const action = isEditing && customer
      ? updateCustomerAction(customer.id, formData)
      : createCustomerAction(formData);

    const result = await action;

    setIsSubmitting(false);
    if (result.ok) {
      onClose();
    } else {
      setErrorMessage(result.message);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Customer" : "Add Customer"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {warningMessage && (
          <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {warningMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Customer Type</label>
              <select
                name="customerType"
                value={formData.customerType}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Display Name *</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {fieldErrors.displayName && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.displayName[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">Company Name</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>
              )}
            </div>
          </div>

          <hr className="my-4 dark:border-zinc-800" />
          <h3 className="text-md font-medium">Primary Address</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Address Line 1</label>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1 ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">City</label>
              <input
                type="text"
                name="city"
                value={formData.city ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Province</label>
              <input
                type="text"
                name="province"
                value={formData.province ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
