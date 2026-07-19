type OrganizationStateMessageProps = {
  title: string;
  message: string;
};

export function OrganizationStateMessage({
  title,
  message,
}: OrganizationStateMessageProps) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {message}
      </p>
    </div>
  );
}
