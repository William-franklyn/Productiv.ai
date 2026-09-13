import { requireAuth } from "@/lib/auth/guard";
import { Card } from "@/components/ui/Card";
import { WorkspaceNameForm } from "@/components/settings/WorkspaceNameForm";
import { CapabilitiesCard } from "@/components/settings/CapabilitiesCard";
import { ViewAsControl } from "@/components/settings/ViewAsControl";
import { SponsorshipCard } from "@/components/settings/SponsorshipCard";
import { IdentityVerificationCard } from "@/components/settings/IdentityVerificationCard";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { orgName, role, realRole, fullName, viewingAs, userId } = await requireAuth();

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-[var(--text-lg)] font-semibold">Settings</h1>

      <Card className="p-5">
        <h3 className="text-[var(--text-base)] font-medium">Workspace</h3>
        <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
          Signed in as {fullName ?? "you"} · {role}
          {viewingAs && ` (previewing — actually ${realRole})`}
        </p>
        <div className="mt-4">
          <WorkspaceNameForm initialName={orgName} canEdit={role !== "member"} />
        </div>
      </Card>

      <ViewAsControl realRole={realRole} />

      <SponsorshipCard canManage={role !== "member"} />

      <IdentityVerificationCard userId={userId} />

      <CapabilitiesCard />
    </main>
  );
}
