import { requireAuth } from "@/lib/auth/guard";
import { AssistantShell } from "@/components/assistant/AssistantShell";

// A deliberately different, minimal shell from the rest of the app: just
// chat history and a way back to the Suite — no workspace nav, no top bar.
export default async function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return <AssistantShell>{children}</AssistantShell>;
}
