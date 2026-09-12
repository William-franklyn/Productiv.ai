import { requireAuth } from "@/lib/auth/guard";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgName, fullName } = await requireAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={orgName} />
      <div className="flex flex-1 flex-col">
        <TopBar fullName={fullName} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
