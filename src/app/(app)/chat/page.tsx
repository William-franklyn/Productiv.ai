import { requireAuth } from "@/lib/auth/guard";
import { ChatShell } from "@/components/chat/ChatShell";

export const metadata = { title: "Chat" };

export default async function ChatPage() {
  const { orgName } = await requireAuth();

  return (
    <div className="chat-scope flex h-[calc(100vh-3.5rem)]">
      <ChatShell orgName={orgName} />
    </div>
  );
}
