import type { TeamMember } from "../types/invitation";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function MemberList({ members }: { members: TeamMember[] }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-zinc-950">
      <div>
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          People with organization access.
        </p>
      </div>
      {members.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          No members found.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/15 dark:text-zinc-400">
              <tr>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/15">
              {members.map((member) => (
                <tr key={member.membershipId}>
                  <td className="py-3 pr-4">{member.email}</td>
                  <td className="py-3 pr-4 capitalize">{member.role}</td>
                  <td className="py-3 pr-4 capitalize">{member.status}</td>
                  <td className="py-3">{formatDate(member.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
