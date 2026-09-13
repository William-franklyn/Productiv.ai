import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  // A FILL uses --accent-solid (the vivid orange) with an INK label via
  // --accent-solid-fg — never white, which fails AA on this orange. See the
  // accent block in globals.css for the reasoning and the measured ratios.
  // Hover softens the fill rather than swapping to --accent-hover: that tone
  // is *darker* than the fill, and an ink label on it would drop to roughly
  // 2.5:1. Opacity keeps the validated ink-on-vivid-orange pairing intact.
  primary:
    "bg-[var(--accent-solid)] text-[var(--accent-solid-fg)] hover:opacity-90",
  secondary:
    "bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-sunken)] hover:border-[var(--border-strong)]",
  ghost: "text-[var(--muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]",
  // --danger-fg, not text-white: white clears 6.71:1 on the light theme's
  // dark red but drops to 2.62:1 on the dark theme's lighter salmon.
  danger: "bg-[var(--danger)] text-[var(--danger-fg)] hover:opacity-90",
};

// Dense by default — professional tools earn their whitespace.
const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[var(--text-sm)] gap-1.5",
  md: "h-9 px-3.5 text-[var(--text-sm)] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex shrink-0 items-center justify-center rounded-[var(--radius)] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
