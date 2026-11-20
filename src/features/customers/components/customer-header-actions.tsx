"use client";

import { useState } from "react";
import { CustomerFormDialog } from "./customer-form-dialog";

type Props = {
  canManage: boolean;
};

export function CustomerHeaderActions({ canManage }: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!canManage) {
    return (
      <p className="rounded-full border border-black/10 px-3 py-1 text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
        Read-only
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsCreateOpen(true)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Add Customer
      </button>

      {isCreateOpen ? (
        <CustomerFormDialog isOpen onClose={() => setIsCreateOpen(false)} />
      ) : null}
    </>
  );
}
