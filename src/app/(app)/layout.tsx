import { requireAuth } from "@/lib/auth/guard";
import { AppShell } from "@/components/shell/AppShell";
import { CommandPaletteProvider } from "@/components/shell/CommandPaletteProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId, orgName, fullName, role, viewingAs, memberships } = await requireAuth();

  return (
    <CommandPaletteProvider>
      <AppShell
        orgId={orgId}
        orgName={orgName}
        fullName={fullName}
        role={role}
        viewingAs={viewingAs}
        memberships={memberships}
      >
        {children}
      </AppShell>
    </CommandPaletteProvider>
  );
}
