"use client";

import { useEffect, useId, useState } from "react";
import {
  checkCustomerDuplicateAction,
  createCustomerAction,
  updateCustomerAction,
} from "../actions/customer-actions";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "../schemas/customer-form-schema";
import type { CustomerDetail } from "../types/customer";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  customer?: CustomerDetail | null;
};

function buildInitialFormData(
  customer?: CustomerDetail | null,
): CustomerFormValues {
  return {
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
  };
}

export function CustomerFormDialog({ isOpen, onClose, customer }: Props) {
  const isEditing = Boolean(customer);
  const titleId = useId();
  const fieldPrefix = useId();

  const [formData, setFormData] = useState<CustomerFormValues>(() =>
    buildInitialFormData(customer),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const trimmedEmail = formData.email?.trim() || "";
  const trimmedPhone = formData.phone?.trim() || "";
  const hasContactToCheck = Boolean(trimmedEmail || trimmedPhone);

  useEffect(() => {
    if (!isOpen || !hasContactToCheck) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const result = await checkCustomerDuplicateAction(
          trimmedEmail || null,
          trimmedPhone || null,
          customer?.id,
        );

        if (cancelled) return;

        if (result.hasDuplicate) {
          const parts: string[] = [];
          if (result.duplicateEmail) parts.push("email");
          if (result.duplicatePhone) parts.push("phone number");
          setWarningMessage(
            `Warning: A customer with the same ${parts.join(" and ")} already exists.`,
          );
        } else {
          setWarningMessage(null);
        }
      } catch {
        if (!cancelled) {
          setWarningMessage(null);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasContactToCheck, trimmedEmail, trimmedPhone, customer?.id, isOpen]);

  const visibleWarningMessage = hasContactToCheck ? warningMessage : null;

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
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
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    const result =
      isEditing && customer
        ? await updateCustomerAction(customer.id, formData)
        : await createCustomerAction(formData);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-xl font-semibold">
            {isEditing ? "Edit Customer" : "Add Customer"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {errorMessage}
          </div>
        )}

        {visibleWarningMessage && (
          <div
            role="status"
            className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          >
            {visibleWarningMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${fieldPrefix}-customerType`}
                className="block text-sm font-medium"
              >
                Customer Type
              </label>
              <select
                id={`${fieldPrefix}-customerType`}
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
              <label
                htmlFor={`${fieldPrefix}-displayName`}
                className="block text-sm font-medium"
              >
                Display Name *
              </label>
              <input
                id={`${fieldPrefix}-displayName`}
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {fieldErrors.displayName && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.displayName[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-companyName`}
                className="block text-sm font-medium"
              >
                Company Name
              </label>
              <input
                id={`${fieldPrefix}-companyName`}
                type="text"
                name="companyName"
                value={formData.companyName ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-phone`}
                className="block text-sm font-medium"
              >
                Phone
              </label>
              <input
                id={`${fieldPrefix}-phone`}
                type="text"
                name="phone"
                value={formData.phone ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor={`${fieldPrefix}-email`}
                className="block text-sm font-medium"
              >
                Email
              </label>
              <input
                id={`${fieldPrefix}-email`}
                type="email"
                name="email"
                value={formData.email ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.email[0]}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor={`${fieldPrefix}-notes`}
                className="block text-sm font-medium"
              >
                Notes
              </label>
              <textarea
                id={`${fieldPrefix}-notes`}
                name="notes"
                rows={2}
                value={formData.notes ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          <hr className="my-4 dark:border-zinc-800" />
          <h3 className="text-base font-medium">Primary Address</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor={`${fieldPrefix}-addressLine1`}
                className="block text-sm font-medium"
              >
                Address Line 1
              </label>
              <input
                id={`${fieldPrefix}-addressLine1`}
                type="text"
                name="addressLine1"
                value={formData.addressLine1 ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor={`${fieldPrefix}-addressLine2`}
                className="block text-sm font-medium"
              >
                Address Line 2
              </label>
              <input
                id={`${fieldPrefix}-addressLine2`}
                type="text"
                name="addressLine2"
                value={formData.addressLine2 ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-city`}
                className="block text-sm font-medium"
              >
                City
              </label>
              <input
                id={`${fieldPrefix}-city`}
                type="text"
                name="city"
                value={formData.city ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-province`}
                className="block text-sm font-medium"
              >
                Province
              </label>
              <input
                id={`${fieldPrefix}-province`}
                type="text"
                name="province"
                value={formData.province ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-postalCode`}
                className="block text-sm font-medium"
              >
                Postal Code
              </label>
              <input
                id={`${fieldPrefix}-postalCode`}
                type="text"
                name="postalCode"
                value={formData.postalCode ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-countryCode`}
                className="block text-sm font-medium"
              >
                Country Code
              </label>
              <input
                id={`${fieldPrefix}-countryCode`}
                type="text"
                name="countryCode"
                maxLength={2}
                value={formData.countryCode ?? "ID"}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm uppercase dark:border-zinc-700 dark:bg-zinc-800"
              />
              {fieldErrors.countryCode && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.countryCode[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
