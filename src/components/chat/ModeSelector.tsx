import clsx from "clsx";

const modes = [
  { value: "chat" as const, label: "Chat", hint: "Synthesized answers, cited" },
  { value: "search" as const, label: "Search", hint: "Extractive only, every sentence cited" },
];

export function ModeSelector({
  mode,
  onChange,
  locked,
}: {
  mode: "chat" | "search";
  onChange: (mode: "chat" | "search") => void;
  locked: boolean;
}) {
  if (locked) {
    const active = modes.find((m) => m.value === mode)!;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[var(--text-xs)] text-[var(--muted)]">
        {active.label} mode
      </span>
    );
  }

  return (
    <div className="inline-flex rounded-[var(--radius)] border border-[var(--border)] p-0.5">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          title={m.hint}
          className={clsx(
            "rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-[var(--text-sm)] transition-colors",
            mode === m.value
              ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
              : "text-[var(--muted)]",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
