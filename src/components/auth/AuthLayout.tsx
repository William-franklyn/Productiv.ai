import Link from "next/link";
import { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function AuthLayout({
  title,
  footer,
  children,
}: {
  title: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-[var(--text-lg)] font-semibold">
          ProductivAI
        </Link>
        <Card className="mt-6 p-6">
          <h1 className="text-[var(--text-lg)] font-medium">{title}</h1>
          <div className="mt-5">{children}</div>
        </Card>
        <p className="mt-4 text-center text-[var(--text-sm)] text-[var(--muted)]">
          {footer}
        </p>
      </div>
    </div>
  );
}
