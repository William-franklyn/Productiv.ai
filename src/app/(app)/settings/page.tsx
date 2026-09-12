import { requireAuth } from "@/lib/auth/guard";
import { Card } from "@/components/ui/Card";
import { WorkspaceNameForm } from "@/components/settings/WorkspaceNameForm";
import { CapabilitiesCard } from "@/components/settings/CapabilitiesCard";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { orgName, role, fullName } = await requireAuth();

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card className="p-5">
        <h3 className="text-[var(--text-base)] font-medium">Workspace</h3>
        <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
          Signed in as {fullName ?? "you"} · {role}
        </p>
        <div className="mt-4">
          <WorkspaceNameForm initialName={orgName} canEdit={role !== "member"} />
        </div>
      </Card>

      <CapabilitiesCard />
    </main>
  );
}
