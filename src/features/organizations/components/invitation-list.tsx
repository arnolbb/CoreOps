import type { OrganizationInvitation } from "../types/invitation";
import { InvitationStatusBadge } from "./invitation-status-badge";
import { RevokeInvitationButton } from "./revoke-invitation-button";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function InvitationList({
  invitations,
}: {
  invitations: OrganizationInvitation[];
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-zinc-950">
      <div>
        <h2 className="text-lg font-semibold">Invitations</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pending and recently closed invitations.
        </p>
      </div>
      {invitations.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          No invitations yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/15 dark:text-zinc-400">
              <tr>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Expires</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/15">
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="py-3 pr-4">{invitation.email}</td>
                  <td className="py-3 pr-4 capitalize">{invitation.role}</td>
                  <td className="py-3 pr-4">
                    <InvitationStatusBadge status={invitation.status} />
                  </td>
                  <td className="py-3 pr-4">
                    {formatDate(invitation.expiresAt)}
                  </td>
                  <td className="py-3">
                    {invitation.status === "pending" ? (
                      <RevokeInvitationButton invitationId={invitation.id} />
                    ) : (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        No action
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
