import { HTMLAttributes } from "react";
import clsx from "clsx";

// Cards are a hairline border on a raised surface — never a shadow. Shadows
// belong to true overlays (menus, modals) only; see rule 2 in globals.css.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]",
        className,
      )}
      {...props}
    />
  );
}
