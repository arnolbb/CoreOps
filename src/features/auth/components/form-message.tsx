import type { AuthActionState } from "../types/auth-action-result";

type FormMessageProps = {
  state: AuthActionState;
};

export function FormMessage({ state }: FormMessageProps) {
  if (!state.message) {
    return null;
  }

  const colorClass =
    state.status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
      : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200";

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${colorClass}`}
      role="status"
    >
      {state.message}
    </p>
  );
}
