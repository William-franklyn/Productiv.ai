import { requireAuth } from "@/lib/auth/guard";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { ViewAsBanner } from "@/components/shell/ViewAsBanner";
import { CommandPaletteProvider } from "@/components/shell/CommandPaletteProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgName, fullName, role, viewingAs } = await requireAuth();

  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen flex-col">
        {viewingAs && <ViewAsBanner role={role} />}
        <div className="flex flex-1">
          <Sidebar orgName={orgName} />
          <div className="flex flex-1 flex-col">
            <TopBar fullName={fullName} />
            <div className="flex-1">{children}</div>
          </div>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
