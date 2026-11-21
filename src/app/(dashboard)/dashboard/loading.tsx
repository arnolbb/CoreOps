export default function DashboardLoading() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Loading workspace overview…
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900"
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900" />
        <div className="h-56 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900" />
      </div>

      <div className="h-64 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900" />
    </section>
  );
}
