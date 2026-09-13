import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

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

export function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <MarketingHeader />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-16">
        <section className="max-w-2xl">
          <p className="text-[var(--text-sm)] font-medium uppercase tracking-wide text-[var(--accent)]">
            An AI teammate for your team&apos;s knowledge
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Ask your team&apos;s knowledge a question. Get an answer, not a
            search result.
          </h1>
          <p className="mt-5 text-[var(--text-lg)] text-[var(--muted)]">
            Upload your docs, ask in plain language, and iRABU answers
            with citations back to the source — then chats with you to turn
            that answer into a task or a chart.
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

        <section className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </main>

      <MarketingFooter />
    </div>
  );
}
