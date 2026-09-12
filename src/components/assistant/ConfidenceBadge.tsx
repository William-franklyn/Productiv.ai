export function ConfidenceBadge({ sourceCount }: { sourceCount: number }) {
  if (sourceCount === 0) return null;

  const label = sourceCount === 1 ? "Single source" : `${sourceCount} sources agree`;
  const color = sourceCount === 1 ? "var(--warning)" : "var(--success)";

  return (
    <span className="inline-flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--muted)]">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
