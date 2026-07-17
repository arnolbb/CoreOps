"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Placeholder: route to a logging service in a later task.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-base text-zinc-600 dark:text-zinc-400">
        An unexpected error occurred.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/15"
      >
        Try again
      </button>
    </main>
  );
}
