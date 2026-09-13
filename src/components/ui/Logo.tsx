import clsx from "clsx";

/**
 * The iRABU mark: a cairn — a dot above two stacked stones — which also reads
 * as a lowercase "i". Rebuilt as geometry rather than shipped as a bitmap so
 * it stays sharp at every size, needs no asset pipeline, and can follow the
 * theme.
 *
 * It paints with `currentColor` on purpose. The source artwork is a golden
 * yellow (#ffc400), which measures 11.89:1 on the dark canvas but only
 * **1.37:1 on the light paper canvas** — effectively invisible, and light is
 * the default theme. Inheriting colour lets the mark be the brand orange
 * (4.54:1 light, 6.70:1 dark) wherever it sits on a surface, while still
 * allowing the original yellow to be set explicitly on a dark ground where it
 * genuinely sings.
 */
export function Logo({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={clsx("shrink-0", className)}
    >
      <circle cx="12" cy="4.5" r="2.5" />
      <rect x="6.55" y="8.5" width="10.9" height="6.3" rx="3" />
      <rect x="6.55" y="15.7" width="10.9" height="6.3" rx="3" />
    </svg>
  );
}

/**
 * Mark plus wordmark. The mark carries the accent; the word stays ink, so the
 * lockup spends the accent budget once (rule 1) instead of twice.
 */
export function Wordmark({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={clsx("flex items-center gap-2", className)}>
      <Logo size={size} className="text-[var(--accent)]" />
      <span className="text-[var(--text-md)] font-semibold tracking-tight">iRABU</span>
    </span>
  );
}
