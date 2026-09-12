import { TaskList } from "@/components/automations/TaskList";

export const metadata = { title: "Automations" };

export default function AutomationsPage() {
  return (
    <main className="p-8">
      <TaskList />
    </main>
  );
}
