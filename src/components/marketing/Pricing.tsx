import Link from "next/link";
import { Check } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";

const tiers = [
  {
    name: "Free",
    price: "$0",
    tagline: "Try it with a small team.",
    features: ["3 seats", "25 assistant messages / month", "10 knowledge documents", "Community support"],
    cta: { label: "Get started free", href: "/signup" },
  },
  {
    name: "Pro",
    price: "$9",
    period: "/workspace/mo",
    tagline: "For teams that ask iRABU something every day.",
    features: [
      "15 seats",
      "500 assistant messages / month",
      "100 knowledge documents",
      "Charts and task creation",
    ],
    cta: { label: "Start free trial", href: "/signup" },
  },
  {
    name: "Business",
    price: "$19",
    period: "/workspace/mo",
    tagline: "Room to grow, with priority support.",
    features: [
      "100 seats",
      "5,000 assistant messages / month",
      "Unlimited knowledge documents",
      "Priority support",
    ],
    highlight: true,
    cta: { label: "Start free trial", href: "/signup" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    tagline: "Custom deployment and contract terms.",
    features: [
      "Unlimited seats",
      "Unlimited assistant messages",
      "Unlimited knowledge documents",
      "Dedicated onboarding",
    ],
    cta: { label: "Contact sales", href: "/security" },
  },
];

export function Pricing() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <MarketingHeader />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-12">
        <div className="max-w-2xl">
          <p className="text-[var(--text-sm)] font-medium uppercase tracking-wide text-[var(--accent)]">
            Pricing
          </p>
          <h1 className="mt-3 text-[var(--text-2xl)] font-semibold leading-tight">
            One price per workspace, not per seat headache.
          </h1>
          <p className="mt-4 text-[var(--text-lg)] text-[var(--muted)]">
            Start free. Every plan gets the same cited answers and the same
            row-level tenant isolation — plans differ on limits, not on
            whether the product tells the truth.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={clsx(
                "flex flex-col p-5",
                tier.highlight && "border-[var(--accent)]",
              )}
            >
              {tier.highlight && (
                <span className="mb-2 inline-block w-fit rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--text-xs)] font-medium text-[var(--accent)]">
                  Most popular
                </span>
              )}
              <h3 className="text-[var(--text-lg)] font-semibold">{tier.name}</h3>
              <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">{tier.tagline}</p>
              <p className="mt-4">
                <span className="text-[var(--text-xl)] font-semibold">{tier.price}</span>
                {tier.period && (
                  <span className="text-[var(--text-sm)] text-[var(--muted)]">{tier.period}</span>
                )}
              </p>
              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[var(--text-sm)]">
                    <Check size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={tier.cta.href} className="mt-6">
                <Button
                  variant={tier.highlight ? "primary" : "secondary"}
                  className="w-full justify-center"
                >
                  {tier.cta.label}
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-[var(--text-sm)] text-[var(--muted)]">
          Seat counts describe workspace capacity, not how billing is
          calculated per person. Questions about data handling or a security
          review? See <Link href="/security" className="text-[var(--accent)]">Security</Link>.
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}
