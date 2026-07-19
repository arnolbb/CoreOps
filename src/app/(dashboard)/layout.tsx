import { signOutAction } from "@/features/auth/actions/sign-out";
import { requireAuthenticatedUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthenticatedUser();

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
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </main>
  );
}
