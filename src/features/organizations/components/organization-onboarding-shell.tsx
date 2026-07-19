import { signOutAction } from "@/features/auth/actions/sign-out";

type OrganizationOnboardingShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function OrganizationOnboardingShell({
  title,
  description,
  children,
}: OrganizationOnboardingShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-black/10 px-6 py-4 dark:border-white/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">CoreOps</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Organization onboarding
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
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 lg:flex-row">
        <div className="max-w-xl space-y-3">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            First organization
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </div>
        <div className="w-full max-w-xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-zinc-950">
          {children}
        </div>
      </section>
    </main>
  );
}
