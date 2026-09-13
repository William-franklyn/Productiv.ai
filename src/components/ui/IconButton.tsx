"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

const RADIUS = {
  sm: "rounded-[var(--radius-sm)]",
  md: "rounded-[var(--radius)]",
  full: "rounded-full",
} as const;

const PADDING = {
  xs: "p-0.5",
  sm: "p-1.5",
} as const;

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style" | "color" | "title"> {
  label: string;
  /** Tooltip, when it needs to differ from the accessible name. Defaults to `label`. */
  title?: string;
  radius?: keyof typeof RADIUS;
  padding?: keyof typeof PADDING;
  /** Tints the icon accent and sets aria-pressed — for a toggle (dictation, mute). */
  active?: boolean;
  /**
   * The one filled-disc treatment: the chat composer's send control. Neutral
   * ink, NOT accent — keeping send neutral is what stops the composer
   * competing with the view's actual primary action (rule 1 in globals.css).
   * Icon-only, so a light glyph on the ink disc is correct at the 3:1 bar.
   */
  solid?: boolean;
  children: ReactNode;
}

/**
 * The shared icon-only control. Ported from irabu.ai so the two products'
 * chat surfaces don't drift — six near-identical hand-rolled variants is
 * how that happens.
 */
export function IconButton({
  label,
  title,
  radius = "md",
  padding = "sm",
  active,
  solid,
  children,
  ...props
}: IconButtonProps) {
  if (solid) {
    return (
      <button
        type="button"
        title={title ?? label}
        aria-label={label}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ink-solid)] text-[var(--surface)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      title={title ?? label}
      aria-label={label}
      aria-pressed={active}
      className={clsx(
        "flex shrink-0 items-center justify-center transition-colors hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-50",
        RADIUS[radius],
        PADDING[padding],
        active ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--ink)]",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
