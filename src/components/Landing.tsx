import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Cross,
  Handshake,
  HandCoins,
  Landmark,
  MessagesSquare,
  School,
  ShieldCheck,
  Sparkles,
  Sprout,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const audiences = [
  { icon: School, label: "Public schools" },
  { icon: Sprout, label: "Farmer unions & co-ops" },
  { icon: Store, label: "Small businesses" },
  { icon: Handshake, label: "NGOs" },
  { icon: Users, label: "Nonprofits" },
  { icon: Cross, label: "Community clinics" },
  { icon: Landmark, label: "Credit unions & libraries" },
  { icon: Building2, label: "Local government offices" },
];

const features = [
  {
    icon: Sparkles,
    title: "Cited answers, not search results",
    body: "Ask a question in plain language and get a synthesized answer with links back to the exact source — not a list of documents to read yourself.",
  },
  {
    icon: MessagesSquare,
    title: "An assistant that can act",
    body: "The same chat that answers questions can create a task, or turn a table of numbers into a chart, right in the conversation.",
  },
  {
    icon: BarChart3,
    title: "Data becomes a chart on request",
    body: "Ask for a breakdown and the assistant renders it — bar, line, or pie — instead of describing numbers in a paragraph.",
  },
  {
    icon: ShieldCheck,
    title: "Built for a team, not a user",
    body: "Every workspace is its own tenant with row-level isolation from the schema up, so teammates share a knowledge base without seeing each other's private drafts.",
  },
];

const stack = [
  {
    name: "Anthropic Claude",
    body: "Answers and reasoning — the same model family used across the industry for grounded, citation-aware responses.",
  },
  {
    name: "Voyage AI",
    body: "Embeddings for knowledge retrieval, so a question matches the right passage instead of the right keyword.",
  },
  {
    name: "Supabase / Postgres",
    body: "Every workspace's data isolated by row-level security policies enforced at the database, not just in application code.",
  },
  {
    name: "Solana",
    body: "Sponsored usage settles on-chain as an anonymized, publicly verifiable ledger — see “Sponsored, not just subscribed” below.",
  },
  {
    name: "Persona",
    body: "Identity verification gating an organization's most sensitive knowledge — proving a real, specific human before a grant, not just a login.",
  },
  {
    name: "Resend",
    body: "Transactional email for invites, meeting invites, and drafted messages a human reviews before sending.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <MarketingHeader />

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
        <section className="max-w-2xl">
          <p className="text-[var(--text-sm)] font-medium uppercase tracking-wide text-[var(--accent)]">
            Built for organizations doing more with less
          </p>
          <h1 className="mt-4 text-[var(--text-2xl)] font-semibold leading-tight sm:text-[var(--text-display)]">
            The AI teammate for teams without an IT department.
          </h1>
          <p className="mt-5 text-[var(--text-lg)] text-[var(--muted)]">
            Upload your documents, ask in plain language, and iRABU answers
            with citations back to the source — then helps you act on it,
            with a task, a chart, or a drafted email. Built for the schools,
            NGOs, co-ops, and small teams that can&apos;t afford a platform
            that only works if you already have the staff to run it.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link href="/signup">
              <Button>
                Get started free <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
          </div>
        </section>

        <section className="mt-12 sm:mt-16">
          <p className="text-[var(--text-xs)] font-medium uppercase tracking-wide text-[var(--muted)]">
            Who it&apos;s for
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {audiences.map((a) => (
              <span
                key={a.label}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[var(--text-sm)]"
              >
                <a.icon size={14} className="text-[var(--accent)]" />
                {a.label}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-14 sm:mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <Card key={f.title} className="p-5">
              <f.icon size={20} className="text-[var(--accent)]" />
              <h3 className="mt-3 text-[var(--text-base)] font-medium">
                {f.title}
              </h3>
              <p className="mt-2 text-[var(--text-sm)] text-[var(--muted)]">
                {f.body}
              </p>
            </Card>
          ))}
        </section>

        <section className="mt-14 sm:mt-20">
          <Card className="p-5 sm:p-8">
            <HandCoins size={22} className="text-[var(--accent)]" />
            <h2 className="mt-3 text-[var(--text-xl)] font-semibold">
              Sponsored, not just subscribed
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--text-base)] text-[var(--muted)]">
              A grant, a donor, or a parent-teacher association can fund an
              organization&apos;s AI usage directly — every answer, task, and
              email the assistant produces is metered and settled on Solana as
              a public, verifiable ledger. A sponsor sees exactly what their
              funding bought, without ever seeing what anyone asked. It funds
              platform usage only — it can&apos;t be withdrawn or redirected.
            </p>
            <p className="mt-3 max-w-2xl text-[var(--text-sm)] text-[var(--muted)]">
              For a nonprofit or a public school, that&apos;s the difference
              between a tool a budget committee has to re-approve every
              quarter, and one a single sponsor can fund transparently and
              walk away from.
            </p>
          </Card>
        </section>

        <section className="mt-14 sm:mt-20">
          <p className="text-[var(--text-xs)] font-medium uppercase tracking-wide text-[var(--muted)]">
            Built on
          </p>
          <h2 className="mt-2 text-[var(--text-xl)] font-semibold">
            Serious infrastructure, not a weekend wrapper around an API.
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stack.map((s) => (
              <Card key={s.name} className="p-5">
                <h3 className="text-[var(--text-base)] font-medium">{s.name}</h3>
                <p className="mt-2 text-[var(--text-sm)] text-[var(--muted)]">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
