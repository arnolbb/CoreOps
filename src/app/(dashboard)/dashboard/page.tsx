export default function DashboardPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Organization setup is complete.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-black/15 p-8 dark:border-white/20">
        <h2 className="text-lg font-medium">Ready for the next module.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          This dashboard is protected by authenticated session and active
          organization membership checks. Business data modules come later.
        </p>
      </div>
    </section>
  );
}
