import { CapabilitiesGrid } from "@/components/CapabilitiesGrid";

export const metadata = { title: "Capabilities" };

export default function CapabilitiesPage() {
  return (
    <main className="p-8">
      <h1 className="text-[var(--text-lg)] font-semibold">What iRABU can do</h1>
      <p className="mt-1 max-w-lg text-[var(--text-sm)] text-[var(--muted)]">
        Every capability below is one it genuinely has today — the "not yet"
        list is just as real, so an unsupported request reads as an honest
        no rather than a silent failure.
      </p>
      <div className="mt-6">
        <CapabilitiesGrid />
      </div>
    </main>
  );
}
