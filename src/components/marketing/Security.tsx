import { Ban, Database, FileText, KeyRound, Lock, ShieldCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";

const controls = [
  {
    icon: Users,
    title: "Role-based access",
    body: "Every member has a role — owner, admin, or member — checked on the server before any write, not just hidden in the UI.",
  },
  {
    icon: Database,
    title: "Row-level tenant isolation",
    body: "Every table carries an organization_id and a Postgres row-level security policy scoped to it. Isolation is enforced by the database itself, not just application code.",
  },
  {
    icon: ShieldCheck,
    title: "Cited, not asserted",
    body: "When the assistant answers from your documents, it names the source. There's no answer that claims to be grounded without something to point back to.",
  },
  {
    icon: FileText,
    title: "Rate-limited usage",
    body: "A daily request cap is enforced in the database itself, so a runaway loop or a bug can't quietly run up an unbounded model bill.",
  },
  {
    icon: KeyRound,
    title: "Authentication via Supabase Auth",
    body: "Passwords are never handled or stored by our own code — sessions and credential hashing are delegated to Supabase's auth system.",
  },
  {
    icon: Lock,
    title: "Encrypted in transit",
    body: "All traffic — app, API, and database connections — runs over TLS.",
  },
];

const notYet = [
  "Knowledge is shared workspace-wide — there's no per-document permission model yet, so nothing is filtered by who's asking within an org.",
  "No SOC 2 audit has been completed. It isn't claimed anywhere in this product.",
  "No dedicated per-organization database — tenants share infrastructure, isolated by row-level security rather than physical separation.",
  "No IP allowlisting or audit-log export yet.",
];

export function Security() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <MarketingHeader />

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12">
        <div className="max-w-2xl">
          <p className="text-[var(--text-sm)] font-medium uppercase tracking-wide text-[var(--accent)]">
            Security
          </p>
          <h1 className="mt-3 text-[var(--text-2xl)] font-semibold leading-tight">
            What's true today, stated plainly.
          </h1>
          <p className="mt-4 text-[var(--text-lg)] text-[var(--muted)]">
            This page lists what's actually built and enforced right now. For
            anything we haven't gotten to yet, we say so below instead of
            leaving it ambiguous.
          </p>
        </div>

        <div className="mt-8 grid sm:mt-12 grid-cols-1 gap-4 sm:grid-cols-2">
          {controls.map((c) => (
            <Card key={c.title} className="p-5">
              <c.icon size={20} className="text-[var(--accent)]" />
              <h3 className="mt-3 text-[var(--text-base)] font-medium">{c.title}</h3>
              <p className="mt-2 text-[var(--text-sm)] text-[var(--muted)]">{c.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-2">
            <Ban size={18} className="text-[var(--muted)]" />
            <h2 className="text-[var(--text-lg)] font-medium">Not built yet</h2>
          </div>
          <ul className="mt-4 flex flex-col gap-2.5">
            {notYet.map((item) => (
              <li key={item} className="text-[var(--text-sm)] text-[var(--muted)]">
                — {item}
              </li>
            ))}
          </ul>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
