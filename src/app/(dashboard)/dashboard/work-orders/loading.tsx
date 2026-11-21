export default function WorkOrdersLoading() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Work Orders</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Loading work orders…
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-20 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900"
          />
        ))}
      </div>
      <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <div className="h-10 rounded-md bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900"
          />
        ))}
      </div>
    </section>
  );
}
