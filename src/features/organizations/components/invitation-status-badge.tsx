import type { InvitationStatus } from "../types/invitation";

const statusStyles: Record<InvitationStatus, string> = {
  accepted:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  expired:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  pending:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  revoked:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
};

const statusLabels: Record<InvitationStatus, string> = {
  accepted: "Accepted",
  expired: "Expired",
  pending: "Pending",
  revoked: "Revoked",
};

export function InvitationStatusBadge({
  status,
}: {
  status: InvitationStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
