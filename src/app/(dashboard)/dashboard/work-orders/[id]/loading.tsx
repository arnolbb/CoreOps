export default function WorkOrderDetailLoading() {
  return (
    <section className="space-y-6">
      <div className="h-5 w-40 rounded bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-28 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900 lg:col-span-2" />
        <div className="h-64 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900" />
      </div>
      <div className="h-48 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900" />
    </section>
  );
}
