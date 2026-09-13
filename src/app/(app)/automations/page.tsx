import { TaskList } from "@/components/automations/TaskList";
import { MeetingsList } from "@/components/automations/MeetingsList";

export const metadata = { title: "Automations" };

export default function AutomationsPage() {
  return (
    <main className="flex flex-col gap-10 p-4 sm:p-6 lg:p-8">
      <TaskList />
      <MeetingsList />
    </main>
  );
}
