import { AssistantContainer } from "@/components/assistant/AssistantContainer";

export const metadata = { title: "Chat" };

export default async function AssistantConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssistantContainer conversationId={id} />;
}
