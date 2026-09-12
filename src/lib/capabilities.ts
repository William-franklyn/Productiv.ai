export interface Capability {
  id: string;
  title: string;
  detail: string;
  example: string;
}

export const CAPABILITIES: Capability[] = [
  {
    id: "search",
    title: "Answer from your documents",
    detail: "Searches everything uploaded to Knowledge and cites exactly where an answer came from.",
    example: "What does our refund policy say about late returns?",
  },
  {
    id: "task",
    title: "Create a task",
    detail: "Adds an item to your workspace's task list under Automations.",
    example: "Create a task: follow up with the design team by Friday",
  },
  {
    id: "chart",
    title: "Turn numbers into a chart",
    detail: "Renders a bar chart, line chart, or stat tile from data you give it in the conversation.",
    example: "Chart Q1 vs Q2 revenue: 42000 and 51000",
  },
  {
    id: "search-mode",
    title: "Quote sources exactly",
    detail: "Switch a chat to Search mode and every sentence is a direct quote, cited, with no added analysis.",
    example: "Switch to Search mode under /chat, then ask a question",
  },
];

export const NOT_YET: string[] = [
  "Can't browse the web or reach anything outside documents uploaded to this workspace.",
  "Can't send email, messages, or anything else on your behalf.",
  "Can't edit or delete a task once created — mark it done from Automations instead.",
  "No per-document permissions yet — everything in Knowledge is visible workspace-wide.",
  "No undo — a created task or sent message is immediate, not staged for review.",
];
