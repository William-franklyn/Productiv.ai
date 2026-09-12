import { requireAuth } from "@/lib/auth/guard";
import { ChatSidebar } from "@/components/assistant/ChatSidebar";

// A deliberately different, minimal shell from the rest of the app: just
// chat history and a way back to the Suite — no workspace nav, no top bar.
export default async function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex h-screen">
      <ChatSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
