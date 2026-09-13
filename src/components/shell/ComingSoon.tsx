export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <main className="p-8">
      <h1 className="text-[var(--text-lg)] font-semibold">{title}</h1>
      <p className="mt-2 max-w-md text-[var(--text-sm)] text-[var(--muted)]">
        {body}
      </p>
    </main>
  );
}
