import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">CoreOps</h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Multi-tenant business operations platform
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/register"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Register
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-white/15 dark:hover:bg-zinc-900"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
