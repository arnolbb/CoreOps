import { redirect } from "next/navigation";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status === "none") {
    redirect("/onboarding/organization");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-black/10 px-6 py-4 dark:border-white/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">CoreOps</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Signed in{user.email ? ` as ${user.email}` : ""}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-black/10 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/15 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-10">
        {organizationState.status === "error" ? (
          <OrganizationStateMessage
            title="Unable to load organization access."
            message={organizationState.message}
          />
        ) : null}
        {organizationState.status === "multiple" ? (
          <OrganizationStateMessage
            title="Organization selection is coming soon."
            message="Your account has access to more than one organization. CoreOps will add organization switching in a later task, so no tenant-specific business data is loaded here yet."
          />
        ) : null}
        {organizationState.status === "single" ? children : null}
      </div>
    </main>
  );
}
