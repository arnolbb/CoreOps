"use client";

import { useEffect, useId, useState } from "react";
import {
  createWarehouseAction,
  setWarehouseActiveAction,
  updateWarehouseAction,
} from "../actions/warehouse-actions";
import { warehouseFormSchema } from "../schemas/warehouse-schema";
import type { WarehouseItem } from "../types/inventory";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  warehouses: WarehouseItem[];
};

export function WarehouseManagerDialog({ isOpen, onClose, warehouses }: Props) {
  const titleId = useId();
  const fieldPrefix = useId();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(
    null,
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting && !togglingId) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, togglingId, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setAddress("");
    setFieldErrors({});
  };

  const startEdit = (warehouse: WarehouseItem) => {
    setEditingId(warehouse.id);
    setName(warehouse.name);
    setCode(warehouse.code);
    setAddress(warehouse.address ?? "");
    setErrorMessage(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const payload = { name, code, address };
    const parsed = warehouseFormSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }

    setIsSubmitting(true);
    const result = editingId
      ? await updateWarehouseAction(editingId, payload)
      : await createWarehouseAction(payload);
    setIsSubmitting(false);

    if (result.ok) {
      resetForm();
    } else {
      setErrorMessage(result.message);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    }
  };

  const handleToggleActive = async (
    warehouseId: string,
    nextActive: boolean,
  ) => {
    setErrorMessage(null);
    setTogglingId(warehouseId);

    const result = await setWarehouseActiveAction(warehouseId, nextActive);

    setTogglingId(null);
    setConfirmDeactivateId(null);

    if (!result.ok) {
      setErrorMessage(result.message);
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
            Manage Warehouses
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || Boolean(togglingId)}
            aria-label="Close warehouses dialog"
            className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${fieldPrefix}-name`}
                className="block text-sm font-medium"
              >
                Warehouse Name *
              </label>
              <input
                id={`${fieldPrefix}-name`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Warehouse"
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {fieldErrors.name ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.name[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${fieldPrefix}-code`}
                className="block text-sm font-medium"
              >
                Warehouse Code *
              </label>
              <input
                id={`${fieldPrefix}-code`}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. WH-01"
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm uppercase dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {fieldErrors.code ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.code[0]}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor={`${fieldPrefix}-address`}
                className="block text-sm font-medium"
              >
                Address
              </label>
              <input
                id={`${fieldPrefix}-address`}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Optional warehouse location"
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {fieldErrors.address ? (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.address[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancel edit
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting
                ? "Saving..."
                : editingId
                  ? "Save Warehouse"
                  : "Add Warehouse"}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t pt-4 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Existing Warehouses
          </h3>
          {warehouses.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              No warehouses yet. Add a warehouse above to start tracking stock.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/15 dark:border-white/15">
              {warehouses.map((warehouse) => (
                <li
                  key={warehouse.id}
                  className="flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-950 dark:text-zinc-50">
                        {warehouse.name}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {warehouse.code}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          warehouse.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {warehouse.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {warehouse.address ? (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {warehouse.address}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(warehouse)}
                      className="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
                    >
                      Edit
                    </button>

                    {warehouse.isActive ? (
                      confirmDeactivateId === warehouse.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleActive(warehouse.id, false)
                            }
                            disabled={togglingId === warehouse.id}
                            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {togglingId === warehouse.id
                              ? "Saving..."
                              : "Confirm deactivate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeactivateId(null)}
                            disabled={togglingId === warehouse.id}
                            className="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeactivateId(warehouse.id)}
                          className="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-white/20 dark:text-red-300 dark:hover:bg-red-950"
                        >
                          Deactivate
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(warehouse.id, true)}
                        disabled={togglingId === warehouse.id}
                        className="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/20 dark:hover:bg-zinc-800"
                      >
                        {togglingId === warehouse.id
                          ? "Saving..."
                          : "Reactivate"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
